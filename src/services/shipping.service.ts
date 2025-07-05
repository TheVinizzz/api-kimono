// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeCorreios = require('node-correios');
import axios from 'axios';

interface ShippingCalculationRequest {
  cepOrigem: string;
  cepDestino: string;
  peso: number; // em kg
  formato: number; // 1 = caixa/pacote, 2 = rolo/prisma, 3 = envelope
  comprimento: number; // em cm
  altura: number; // em cm
  largura: number; // em cm
  diametro?: number; // em cm
  valorDeclarado?: number;
  maoPropria?: boolean;
  avisoRecebimento?: boolean;
}

interface ShippingOption {
  codigo: string;
  nome: string;
  valor: number;
  prazoEntrega: number;
  valorMaoPropria: number;
  valorAvisoRecebimento: number;
  valorValorDeclarado: number;
  erro: string;
  msgErro: string;
  valorSemAdicionais: number;
}

interface ShippingResponse {
  success: boolean;
  options: ShippingOption[];
  error?: string;
}

class ShippingService {
  private correios: any;
  private readonly CEP_ORIGEM_DEFAULT = '01310-100'; // CEP de São Paulo como padrão
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos

  constructor() {
    this.correios = new NodeCorreios();
  }

  /**
   * Busca CEP de origem das configurações do banco
   */
  private async getOriginZipCode(): Promise<string> {
    try {
      const { getOriginZipCode } = await import('../controllers/settings.controller');
      return await getOriginZipCode();
    } catch (error) {
      console.error('Erro ao buscar CEP de origem:', error);
      return this.CEP_ORIGEM_DEFAULT;
    }
  }

  /**
   * Calcula o frete usando sistema híbrido com fallback
   */
  async calculateShipping(params: ShippingCalculationRequest): Promise<ShippingResponse> {
    try {
      // Validar CEPs
      if (!this.isValidCEP(params.cepOrigem) || !this.isValidCEP(params.cepDestino)) {
        return {
          success: false,
          options: [],
          error: 'CEP inválido fornecido'
        };
      }

      // Verificar cache primeiro
      const cacheKey = `${params.cepOrigem}-${params.cepDestino}-${params.peso}-${params.valorDeclarado}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('✅ Retornando dados do cache');
        return cached;
      }

      // Tentar API dos Correios primeiro (com timeout)
      console.log('🚚 Tentando API dos Correios...');
      const correiosResult = await this.tryCorreiosAPI(params);
      
      if (correiosResult.success && correiosResult.options.length > 0) {
        console.log('✅ Sucesso com API dos Correios');
        this.setCache(cacheKey, correiosResult);
        return correiosResult;
      }

      // Se falhar, usar cálculo baseado em distância (fallback)
      console.log('⚠️ API dos Correios falhou, usando cálculo estimado...');
      const fallbackResult = await this.calculateFallbackShipping(params);
      
      this.setCache(cacheKey, fallbackResult);
      return fallbackResult;

    } catch (error) {
      console.error('Erro geral ao calcular frete:', error);
      
      // Último fallback: cálculo básico
      return this.calculateBasicShipping(params);
    }
  }

  /**
   * Tenta usar a API dos Correios com timeout
   */
  private async tryCorreiosAPI(params: ShippingCalculationRequest): Promise<ShippingResponse> {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000) // 10 segundos
      );

      const correiosPromise = this.calculateWithCorreios(params);
      
      const result = await Promise.race([correiosPromise, timeout]);
      return result as ShippingResponse;
      
    } catch (error) {
      console.error('Erro na API dos Correios:', error);
      return {
        success: false,
        options: [],
        error: 'API dos Correios indisponível'
      };
    }
  }

  /**
   * Cálculo original com API dos Correios
   */
  private async calculateWithCorreios(params: ShippingCalculationRequest): Promise<ShippingResponse> {
    const servicos = ['04014', '04510']; // Apenas SEDEX e PAC para ser mais rápido

    const requests = servicos.map(async (servico) => {
      try {
        const resultado = await this.correios.calcPrecoPrazo({
          nCdServico: servico,
          sCepOrigem: this.cleanCEP(params.cepOrigem),
          sCepDestino: this.cleanCEP(params.cepDestino),
          nVlPeso: params.peso.toString(),
          nCdFormato: params.formato.toString(),
          nVlComprimento: params.comprimento.toString(),
          nVlAltura: params.altura.toString(),
          nVlLargura: params.largura.toString(),
          nVlDiametro: params.diametro?.toString() || '0',
          sCdMaoPropria: params.maoPropria ? 'S' : 'N',
          nVlValorDeclarado: params.valorDeclarado?.toString() || '0',
          sCdAvisoRecebimento: params.avisoRecebimento ? 'S' : 'N'
        });

        return resultado;
      } catch (error) {
        console.error(`Erro ao calcular frete para serviço ${servico}:`, error);
        return null;
      }
    });

    const resultados = await Promise.all(requests);
    const opcoes: ShippingOption[] = [];

    resultados.forEach((resultado: any) => {
      if (resultado && Array.isArray(resultado)) {
        resultado.forEach((item: any) => {
          if (item && item.Codigo && (item.Erro === '0' || item.Erro === '')) {
            opcoes.push({
              codigo: item.Codigo.toString(),
              nome: this.getServiceName(item.Codigo.toString()),
              valor: this.parsePrice(item.Valor),
              prazoEntrega: parseInt(item.PrazoEntrega) || 0,
              valorMaoPropria: this.parsePrice(item.ValorMaoPropria),
              valorAvisoRecebimento: this.parsePrice(item.ValorAvisoRecebimento),
              valorValorDeclarado: this.parsePrice(item.ValorValorDeclarado),
              erro: item.Erro || '0',
              msgErro: item.MsgErro || '',
              valorSemAdicionais: this.parsePrice(item.ValorSemAdicionais || item.Valor)
            });
          }
        });
      }
    });

    return {
      success: opcoes.length > 0,
      options: opcoes
    };
  }

  /**
   * Cálculo fallback baseado em estimativas
   */
  private async calculateFallbackShipping(params: ShippingCalculationRequest): Promise<ShippingResponse> {
    try {
      // Buscar informações dos CEPs para calcular distância aproximada
      const [originInfo, destInfo] = await Promise.all([
        this.getCEPInfo(params.cepOrigem),
        this.getCEPInfo(params.cepDestino)
      ]);

      // Calcular frete baseado em peso, distância estimada e valor
      const basePrice = Math.max(params.peso * 12, 8.50); // Mínimo R$ 8,50
      const distanceMultiplier = this.calculateDistanceMultiplier(originInfo, destInfo);
      const valueMultiplier = params.valorDeclarado ? params.valorDeclarado * 0.02 : 0;

      const options: ShippingOption[] = [
        {
          codigo: '04510',
          nome: 'PAC',
          valor: Math.round((basePrice * distanceMultiplier + valueMultiplier) * 100) / 100,
          prazoEntrega: Math.min(Math.max(Math.ceil(distanceMultiplier * 5), 5), 15),
          valorMaoPropria: 0,
          valorAvisoRecebimento: 0,
          valorValorDeclarado: valueMultiplier,
          erro: '0',
          msgErro: 'Valor estimado - API dos Correios temporariamente indisponível',
          valorSemAdicionais: Math.round((basePrice * distanceMultiplier) * 100) / 100
        },
        {
          codigo: '04014',
          nome: 'SEDEX',
          valor: Math.round((basePrice * distanceMultiplier * 1.6 + valueMultiplier) * 100) / 100,
          prazoEntrega: Math.min(Math.max(Math.ceil(distanceMultiplier * 2), 2), 8),
          valorMaoPropria: 0,
          valorAvisoRecebimento: 0,
          valorValorDeclarado: valueMultiplier,
          erro: '0',
          msgErro: 'Valor estimado - API dos Correios temporariamente indisponível',
          valorSemAdicionais: Math.round((basePrice * distanceMultiplier * 1.6) * 100) / 100
        }
      ];

      return {
        success: true,
        options: options
      };

    } catch (error) {
      console.error('Erro no cálculo fallback:', error);
      return this.calculateBasicShipping(params);
    }
  }

  /**
   * Cálculo básico como último recurso
   */
  private calculateBasicShipping(params: ShippingCalculationRequest): ShippingResponse {
    const basePrice = Math.max(params.peso * 15, 12.90);
    
    const options: ShippingOption[] = [
      {
        codigo: '04510',
        nome: 'PAC',
        valor: Math.round(basePrice * 100) / 100,
        prazoEntrega: 8,
        valorMaoPropria: 0,
        valorAvisoRecebimento: 0,
        valorValorDeclarado: 0,
        erro: '0',
        msgErro: 'Valor estimado',
        valorSemAdicionais: Math.round(basePrice * 100) / 100
      },
      {
        codigo: '04014',
        nome: 'SEDEX',
        valor: Math.round(basePrice * 1.8 * 100) / 100,
        prazoEntrega: 3,
        valorMaoPropria: 0,
        valorAvisoRecebimento: 0,
        valorValorDeclarado: 0,
        erro: '0',
        msgErro: 'Valor estimado',
        valorSemAdicionais: Math.round(basePrice * 1.8 * 100) / 100
      }
    ];

    return {
      success: true,
      options: options
    };
  }

  /**
   * Valida formato do CEP
   */
  private isValidCEP(cep: string): boolean {
    const cleanCEP = this.cleanCEP(cep);
    return /^\d{8}$/.test(cleanCEP);
  }

  /**
   * Remove formatação do CEP
   */
  private cleanCEP(cep: string): string {
    return cep.replace(/\D/g, '');
  }

  /**
   * Converte string de preço para número
   */
  private parsePrice(priceString: string): number {
    if (!priceString || priceString === '0') return 0;
    
    // Remove vírgulas e converte para número
    const cleaned = priceString.toString().replace(',', '.');
    return parseFloat(cleaned) || 0;
  }

  /**
   * Retorna nome amigável do serviço
   */
  private getServiceName(codigo: string): string {
    const nomes: { [key: string]: string } = {
      '04014': 'SEDEX',
      '04510': 'PAC',
      '04782': 'SEDEX 12',
      '04790': 'SEDEX 10',
      '04804': 'SEDEX Hoje'
    };

    return nomes[codigo] || `Serviço ${codigo}`;
  }

  /**
   * Métodos de cache
   */
  private getFromCache(key: string): ShippingResponse | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove cache expirado
    }
    return null;
  }

  private setCache(key: string, data: ShippingResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Busca informações de CEP usando BrasilAPI como fallback
   */
  private async getCEPInfo(cep: string): Promise<any> {
    try {
      const cleanCEP = this.cleanCEP(cep);
      const response = await axios.get(`https://brasilapi.com.br/api/cep/v1/${cleanCEP}`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar CEP ${cep}:`, error);
      // Retorna dados padrão se falhar
      return {
        city: 'Cidade',
        state: 'SP',
        district: 'Centro'
      };
    }
  }

  /**
   * Calcula multiplicador de distância baseado nos CEPs
   */
  private calculateDistanceMultiplier(originInfo: any, destInfo: any): number {
    try {
      // Estados com multiplicadores baseados na distância aproximada
      const stateMultipliers: { [key: string]: number } = {
        'SP': 1.0, 'RJ': 1.1, 'MG': 1.2, 'ES': 1.3,
        'PR': 1.3, 'SC': 1.4, 'RS': 1.6,
        'GO': 1.4, 'MT': 1.7, 'MS': 1.5, 'DF': 1.3,
        'BA': 1.5, 'SE': 1.6, 'AL': 1.7, 'PE': 1.8, 'PB': 1.9, 'RN': 2.0, 'CE': 2.1, 'PI': 2.2, 'MA': 2.3,
        'TO': 1.8, 'PA': 2.4, 'AP': 2.8, 'RR': 3.0, 'AM': 2.6, 'AC': 2.9, 'RO': 2.5
      };

      const originState = originInfo?.state || 'SP';
      const destState = destInfo?.state || 'SP';

      // Se for o mesmo estado, menor multiplicador
      if (originState === destState) {
        return Math.max(stateMultipliers[destState] * 0.7, 1.0);
      }

      // Se for estados próximos (região sudeste), multiplicador médio
      const sudeste = ['SP', 'RJ', 'MG', 'ES'];
      if (sudeste.includes(originState) && sudeste.includes(destState)) {
        return Math.max(stateMultipliers[destState] * 0.8, 1.1);
      }

      // Multiplicador padrão baseado no estado de destino
      return stateMultipliers[destState] || 2.0;

    } catch (error) {
      console.error('Erro ao calcular multiplicador de distância:', error);
      return 1.5; // Multiplicador padrão
    }
  }

  /**
   * Calcula frete para um produto específico (método de conveniência)
   */
  async calculateProductShipping(
    cepDestino: string, 
    peso: number, 
    valor: number,
    cepOrigem?: string
  ): Promise<ShippingResponse> {
    // Buscar CEP de origem das configurações se não fornecido
    const originZipCode = cepOrigem || await this.getOriginZipCode();
    
    // Dimensões padrão para kimono (baseado em embalagem típica)
    const dimensoes = {
      comprimento: 30, // cm
      altura: 5,       // cm
      largura: 25,     // cm
      formato: 1       // caixa/pacote
    };

    return this.calculateShipping({
      cepOrigem: originZipCode,
      cepDestino,
      peso: Math.max(peso, 0.3), // peso mínimo de 300g
      formato: dimensoes.formato,
      comprimento: dimensoes.comprimento,
      altura: dimensoes.altura,
      largura: dimensoes.largura,
      valorDeclarado: valor > 50 ? valor : 0, // valor declarado apenas para produtos > R$ 50
      maoPropria: false,
      avisoRecebimento: false
    });
  }
}

export default new ShippingService(); 