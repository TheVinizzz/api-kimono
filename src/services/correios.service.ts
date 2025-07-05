import axios, { AxiosInstance } from 'axios';
import { CORREIOS_CONFIG } from '../config/correios';
import { 
  CorreiosApiConfig, 
  CorreiosTokenResponse, 
  CorreiosPrepostagemRequest, 
  CorreiosPrepostagemResponse,
  CorreiosRastreamentoResponse 
} from '../types/correios.types';

class CorreiosService {
  private apiClient: AxiosInstance;
  private token: string | null = null;
  private tokenExpiration: Date | null = null;
  private config: CorreiosApiConfig;

  constructor() {
    this.config = {
      ambiente: CORREIOS_CONFIG.ambiente as 'PRODUCAO' | 'HOMOLOGACAO',
      idCorreios: CORREIOS_CONFIG.idCorreios,
      codigoAcesso: CORREIOS_CONFIG.codigoAcesso,
      contrato: CORREIOS_CONFIG.contrato,
      cartaoPostagem: CORREIOS_CONFIG.cartaoPostagem
    };

    const baseURL = this.config.ambiente === 'PRODUCAO' 
      ? CORREIOS_CONFIG.urls.producao 
      : CORREIOS_CONFIG.urls.homologacao;

    this.apiClient = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Interceptor para adicionar token automaticamente
    this.apiClient.interceptors.request.use(async (config) => {
      const token = await this.getValidToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Obtém um token válido, renovando se necessário
   */
  private async getValidToken(): Promise<string | null> {
    try {
      // Verifica se token ainda é válido (com margem de 5 minutos)
      if (this.token && this.tokenExpiration) {
        const now = new Date();
        const expirationWithMargin = new Date(this.tokenExpiration.getTime() - 5 * 60 * 1000);
        
        if (now < expirationWithMargin) {
          return this.token;
        }
      }

      // Renova o token
      await this.authenticate();
      return this.token;
    } catch (error) {
      console.error('Erro ao obter token dos Correios:', error);
      return null;
    }
  }

  /**
   * Autentica na API dos Correios
   */
  private async authenticate(): Promise<void> {
    try {
      const response = await axios.post(`${this.apiClient.defaults.baseURL}/token/v1/autentica/cartaopostagem`, {
        numero: this.config.cartaoPostagem
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      const tokenData: CorreiosTokenResponse = response.data;
      
      this.token = tokenData.token;
      this.tokenExpiration = new Date(Date.now() + (tokenData.expiresIn * 1000));
      
      console.log('✅ Token dos Correios obtido com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao autenticar nos Correios:', error.response?.data || error.message);
      throw new Error('Falha na autenticação com os Correios');
    }
  }

  /**
   * Cria uma prepostagem e gera código de rastreio
   */
  async criarPrepostagem(dadosPrepostagem: CorreiosPrepostagemRequest): Promise<CorreiosPrepostagemResponse> {
    try {
      console.log('📦 Criando prepostagem nos Correios...');

      const response = await this.apiClient.post('/prepostagem/v1/objetos', dadosPrepostagem);
      
      const resultado: CorreiosPrepostagemResponse = response.data;
      
      console.log('✅ Prepostagem criada com sucesso:', resultado.codigoObjeto);
      
      return resultado;
    } catch (error: any) {
      console.error('❌ Erro ao criar prepostagem:', error.response?.data || error.message);
      
      // Retorna resposta de erro padronizada
      return {
        id: '',
        codigoObjeto: '',
        valorPostagem: 0,
        prazoEntrega: 0,
        dataPrevisaoPostagem: '',
        erro: error.response?.data?.erro || 'ERRO_INTERNO',
        mensagem: error.response?.data?.mensagem || 'Erro ao criar prepostagem nos Correios'
      };
    }
  }

  /**
   * Rastreia um objeto pelos Correios
   */
  async rastrearObjeto(codigoRastreio: string): Promise<CorreiosRastreamentoResponse | null> {
    try {
      console.log(`🔍 Rastreando objeto: ${codigoRastreio}`);

      const response = await this.apiClient.get(`/srorastro/v1/objetos/${codigoRastreio}`);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao rastrear objeto:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Cria prepostagem para um pedido do sistema
   */
  async criarPrepostagemPedido(dadosPedido: {
    orderId: number;
    destinatario: {
      nome: string;
      documento: string;
      telefone?: string;
      email?: string;
      endereco: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        uf: string;
        cep: string;
      };
    };
    servico: string; // '03220' = SEDEX, '03298' = PAC, etc
    peso: number; // em gramas
    valor?: number;
    observacao?: string;
  }): Promise<CorreiosPrepostagemResponse> {
    
    const prepostagemData: CorreiosPrepostagemRequest = {
      remetente: {
        nome: CORREIOS_CONFIG.remetente.nome,
        cnpj: CORREIOS_CONFIG.remetente.cnpj,
        inscricaoEstadual: CORREIOS_CONFIG.remetente.inscricaoEstadual,
        endereco: {
          logradouro: CORREIOS_CONFIG.remetente.endereco.logradouro,
          numero: CORREIOS_CONFIG.remetente.endereco.numero,
          complemento: CORREIOS_CONFIG.remetente.endereco.complemento,
          bairro: CORREIOS_CONFIG.remetente.endereco.bairro,
          cidade: CORREIOS_CONFIG.remetente.endereco.cidade,
          uf: CORREIOS_CONFIG.remetente.endereco.uf,
          cep: CORREIOS_CONFIG.remetente.endereco.cep
        },
        telefone: CORREIOS_CONFIG.remetente.telefone,
        email: CORREIOS_CONFIG.remetente.email
      },
      destinatario: dadosPedido.destinatario,
      servico: dadosPedido.servico,
      volumes: [{
        altura: 5, // altura padrão em cm para kimono
        largura: 25, // largura padrão em cm
        comprimento: 30, // comprimento padrão em cm
        peso: Math.max(dadosPedido.peso, 300), // peso mínimo 300g
        tipoObjeto: 2, // 2 = Pacote
        valorDeclarado: dadosPedido.valor && dadosPedido.valor > 50 ? dadosPedido.valor : undefined
      }],
      servicosAdicionais: dadosPedido.valor && dadosPedido.valor > 50 ? ['001'] : undefined, // 001 = Valor declarado
      observacao: dadosPedido.observacao || `Pedido #${dadosPedido.orderId}`
    };

    return await this.criarPrepostagem(prepostagemData);
  }

  /**
   * Valida se as configurações dos Correios estão corretas
   */
  validateConfig(): boolean {
    const required = [
      this.config.idCorreios,
      this.config.codigoAcesso,
      this.config.contrato,
      this.config.cartaoPostagem,
      CORREIOS_CONFIG.remetente.nome,
      CORREIOS_CONFIG.remetente.cnpj,
      CORREIOS_CONFIG.remetente.endereco.cep
    ];

    return required.every(field => field && field.trim() !== '');
  }

  /**
   * Testa a conexão com a API dos Correios
   */
  async testarConexao(): Promise<boolean> {
    try {
      await this.getValidToken();
      return !!this.token;
    } catch (error) {
      return false;
    }
  }
}

// Instância singleton
export const correiosService = new CorreiosService();
export default CorreiosService; 