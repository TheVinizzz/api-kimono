import axios, { AxiosRequestConfig } from 'axios';
import config from '../config';
import fs from 'fs';
import path from 'path';

// Interfaces para os dados do Bling
interface BlingTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
  timestamp?: number;
}

interface BlingProduct {
  id: number;
  nome: string;
  codigo: string;
  preco: number;
  situacao: string;
  categoria?: {
    id: number;
    descricao: string;
  };
  estoques?: Array<{
    saldoFisico: number;
    saldoVirtual: number;
  }>;
  imagemURL?: string;
  descricao?: string;
  dataCriacao?: string;
  dataAlteracao?: string;
  anexos?: any[];
  midia?: any[];
}

interface BlingCompany {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  cnpj?: string;
}

interface BlingApiResponse<T> {
  data: T[] | T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class BlingOAuthService {
  private apiUrl: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tokensFile: string;
  private tokens: BlingTokens | null = null;

  constructor() {
    this.apiUrl = 'https://api.bling.com.br/Api/v3';
    this.clientId = config.bling.clientId;
    this.clientSecret = config.bling.clientSecret;
    this.redirectUri = config.bling.redirectUri;
    this.tokensFile = path.join(__dirname, '../../tokens.json');
    
    // Carregar tokens existentes
    this.loadTokens();
  }

  // ==========================================
  // GERENCIAMENTO DE TOKENS
  // ==========================================

  // Carregar tokens do arquivo
  private loadTokens(): void {
    try {
      if (fs.existsSync(this.tokensFile)) {
        const data = fs.readFileSync(this.tokensFile, 'utf8');
        this.tokens = JSON.parse(data);
        console.log('✅ Tokens carregados do arquivo');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tokens:', error);
    }
  }

  // Salvar tokens no arquivo
  private saveTokens(tokens: BlingTokens): void {
    try {
      const tokenData = {
        ...tokens,
        timestamp: Date.now(),
        expires_at: Date.now() + (tokens.expires_in * 1000)
      };
      
      fs.writeFileSync(this.tokensFile, JSON.stringify(tokenData, null, 2));
      this.tokens = tokenData;
      console.log('✅ Tokens salvos com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar tokens:', error);
    }
  }

  // Verificar se o token está expirado
  private isTokenExpired(): boolean {
    if (!this.tokens || !this.tokens.expires_at) return true;
    return Date.now() > this.tokens.expires_at - 300000; // 5 minutos antes da expiração
  }

  // ==========================================
  // AUTENTICAÇÃO OAUTH
  // ==========================================

  // Autenticação automática usando Client Credentials
  async authenticateAutomatically(): Promise<BlingTokens> {
    console.log('🔄 Iniciando autenticação automática...');
    
    // Primeiro, tentar carregar tokens existentes
    this.loadTokens();
    if (this.tokens && !this.isTokenExpired()) {
      console.log('✅ Tokens válidos encontrados!');
      return this.tokens;
    }

    // Se tokens expiraram, tentar renovar
    if (this.tokens && this.tokens.refresh_token && this.isTokenExpired()) {
      try {
        console.log('🔄 Renovando tokens expirados...');
        await this.refreshAccessToken();
        return this.tokens!;
      } catch (error) {
        console.log('❌ Falha ao renovar tokens, continuando...');
      }
    }

    // Se não tem tokens ou falhou renovação, tentar diferentes métodos
    console.log('🔄 Tentando métodos alternativos de autenticação...');
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error(`
❌ CREDENCIAIS NECESSÁRIAS:
- CLIENT_ID e CLIENT_SECRET são obrigatórios
- Verifique se estão configurados no .env

🔑 PARA OBTER TOKENS VÁLIDOS:
1. Acesse: GET /api/bling-oauth/auth/url
2. Abra a URL retornada no navegador
3. Autorize o aplicativo
4. Os tokens serão salvos automaticamente

💡 ALTERNATIVA RÁPIDA:
- Use a rota: GET /api/bling-oauth/data/auto
- Ela tentará usar tokens existentes automaticamente
      `);
    }

    // Tentar diferentes endpoints do Bling
    const attempts = [
      () => this.tryClientCredentials(),
      () => this.tryDirectAuth(),
      () => this.tryLegacyAuth()
    ];

    for (const attempt of attempts) {
      try {
        const tokens = await attempt();
        if (tokens) {
          this.saveTokens(tokens);
          console.log('✅ Autenticação automática realizada com sucesso!');
          return tokens;
        }
      } catch (error: any) {
        console.log(`⚠️ Tentativa falhou: ${error.message}`);
      }
    }

    // Se todas as tentativas falharam
    throw new Error(`
❌ AUTENTICAÇÃO AUTOMÁTICA NÃO DISPONÍVEL

O Bling API v3 requer OAuth 2.0 com autorização via navegador.

🔧 SOLUÇÕES:

1. 📱 USAR FLUXO OAUTH MANUAL:
   • GET /api/bling-oauth/auth/url (obter URL)
   • Abrir URL no navegador e autorizar
   • Tokens serão salvos automaticamente

2. 🔄 USAR TOKENS EXISTENTES:
   • GET /api/bling-oauth/data/auto
   • Usa tokens salvos se disponíveis

3. ⚡ CONFIGURAR UMA VEZ:
   • Faça o OAuth uma vez
   • Tokens serão renovados automaticamente
   • Sistema funcionará sem intervenção

📝 CREDENCIAIS ATUAIS:
   • CLIENT_ID: ${this.clientId?.substring(0, 10)}...
   • CLIENT_SECRET: ${this.clientSecret ? 'Configurado' : 'NÃO CONFIGURADO'}
    `);
  }

  // Tentar Client Credentials (pode não funcionar)
  private async tryClientCredentials(): Promise<BlingTokens | null> {
    const tokenData = {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'read write'
    };

    const response = await axios.post(
      'https://www.bling.com.br/Api/v3/oauth/token',
      new URLSearchParams(tokenData),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  }

  // Tentar autenticação direta
  private async tryDirectAuth(): Promise<BlingTokens | null> {
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await axios.post(
      'https://api.bling.com.br/Api/v3/auth/token',
      {},
      {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  }

  // Tentar método legado (se existir)
  private async tryLegacyAuth(): Promise<BlingTokens | null> {
    // Tentar endpoint alternativo
    const response = await axios.post(
      'https://bling.com.br/Api/v3/oauth/authorize',
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    return response.data;
  }

  // Verificar e renovar token automaticamente se necessário
  async ensureValidToken(): Promise<boolean> {
    try {
      // Se não tem token, tentar autenticação automática
      if (!this.tokens) {
        console.log('🔄 Nenhum token encontrado, tentando autenticação automática...');
        await this.authenticateAutomatically();
        return true;
      }

      // Se token expirado, tentar renovar
      if (this.isTokenExpired()) {
        if (this.tokens.refresh_token) {
          console.log('🔄 Token expirado, renovando...');
          await this.refreshAccessToken();
          return true;
        } else {
          console.log('🔄 Token expirado sem refresh token, tentando nova autenticação...');
          await this.authenticateAutomatically();
          return true;
        }
      }

      console.log('✅ Token válido encontrado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao garantir token válido:', error);
      return false;
    }
  }

  // Gerar URL de autorização
  generateAuthUrl(): string {
    const state = this.generateState();
    const authUrl = new URL('https://www.bling.com.br/Api/v3/oauth/authorize');
    
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', this.clientId);
    authUrl.searchParams.append('redirect_uri', this.redirectUri);
    authUrl.searchParams.append('scope', 'read write');
    authUrl.searchParams.append('state', state);

    return authUrl.toString();
  }

  // Gerar state para segurança
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Trocar código de autorização por tokens
  async exchangeCodeForTokens(code: string): Promise<BlingTokens> {
    const tokenData = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri
    };

    // FIX: Bling expects client credentials in the Authorization header (Basic Auth).
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const response = await axios.post(
        'https://api.bling.com.br/Api/v3/oauth/token',
        new URLSearchParams(tokenData),
        {
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 200 && response.data.access_token) {
        this.saveTokens(response.data);
        return response.data;
      } else {
        throw new Error('Resposta inválida do Bling ao trocar código por token');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.error('❌ Erro detalhado ao trocar código por token:', errorMessage);
      // Re-throw the detailed error from Bling to the frontend
      throw new Error(`Falha na troca de token com o Bling. Detalhes: ${errorMessage}`);
    }
  }

  // Renovar access token
  async refreshAccessToken(): Promise<BlingTokens> {
    if (!this.tokens?.refresh_token) {
      throw new Error('Refresh token não disponível');
    }

    const tokenData = {
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.tokens.refresh_token
    };

    try {
      const response = await axios.post(
        'https://www.bling.com.br/Api/v3/oauth/token',
        new URLSearchParams(tokenData),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        this.saveTokens(response.data);
        return response.data;
      } else {
        throw new Error(`Erro ao renovar token: ${response.status}`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao renovar token:', error.response?.data || error.message);
      throw error;
    }
  }

  // ==========================================
  // REQUISIÇÕES AUTENTICADAS
  // ==========================================

  // Fazer requisição autenticada
  private async makeAuthenticatedRequest<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<T> {
    // Garantir que temos um token válido (com autenticação automática)
    const tokenValid = await this.ensureValidToken();
    
    if (!tokenValid || !this.tokens?.access_token) {
      throw new Error('Não foi possível obter um token válido. Verifique as credenciais.');
    }

    const config: AxiosRequestConfig = {
      method,
      url: `${this.apiUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.tokens.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token pode ter expirado, tentar renovar uma vez
        if (this.tokens?.refresh_token) {
          await this.refreshAccessToken();
          config.headers!['Authorization'] = `Bearer ${this.tokens.access_token}`;
          const retryResponse = await axios(config);
          return retryResponse.data;
        }
      }
      
      console.error('❌ Erro na requisição:', error.response?.data || error.message);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS PÚBLICOS PARA OBTER DADOS
  // ==========================================

  // Verificar status da autenticação
  getAuthStatus(): { authenticated: boolean; expired: boolean; message: string } {
    if (!this.tokens) {
      return {
        authenticated: false,
        expired: false,
        message: 'Nenhum token encontrado. Faça login primeiro.'
      };
    }

    if (this.isTokenExpired()) {
      return {
        authenticated: false,
        expired: true,
        message: 'Token expirado. Renovação automática será tentada na próxima requisição.'
      };
    }

    return {
      authenticated: true,
      expired: false,
      message: 'Autenticado com sucesso'
    };
  }

  // Obter informações da empresa
  async getCompanyInfo(): Promise<BlingCompany> {
    const response = await this.makeAuthenticatedRequest<BlingApiResponse<BlingCompany>>('/empresas');
    const companies = Array.isArray(response.data) ? response.data : [response.data];
    
    if (companies.length === 0) {
      throw new Error('Nenhuma empresa encontrada');
    }

    return companies[0];
  }

  // Obter produtos com filtros
  async getProducts(options: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
  } = {}): Promise<{
    products: BlingProduct[];
    pagination?: any;
    total: number;
  }> {
    const { page = 1, limit = 20, search, active } = options;
    
    let endpoint = `/produtos?pagina=${page}&limite=${limit}`;
    
    if (search) {
      endpoint += `&pesquisa=${encodeURIComponent(search)}`;
    }
    
    if (active !== undefined) {
      endpoint += `&situacao=${active ? 'Ativo' : 'Inativo'}`;
    }

    const response = await this.makeAuthenticatedRequest<BlingApiResponse<BlingProduct>>(endpoint);
    const products = Array.isArray(response.data) ? response.data : [response.data];

    return {
      products,
      pagination: response.pagination,
      total: products.length
    };
  }

  // Obter produto por ID
  async getProductById(id: number): Promise<BlingProduct> {
    const response = await this.makeAuthenticatedRequest<BlingApiResponse<BlingProduct>>(`/produtos/${id}`);
    return Array.isArray(response.data) ? response.data[0] : response.data;
  }

  // Obter produto com detalhes completos incluindo anexos e imagens
  async getProductWithFullDetails(id: number): Promise<BlingProduct> {
    try {
      // Buscar produto básico
      const product = await this.getProductById(id);
      
      // Tentar buscar anexos/mídia separadamente se disponível
      try {
        const attachmentsResponse = await this.makeAuthenticatedRequest<BlingApiResponse<any>>(`/produtos/${id}/anexos`);
        if (attachmentsResponse.data) {
          product.anexos = Array.isArray(attachmentsResponse.data) ? attachmentsResponse.data : [attachmentsResponse.data];
        }
      } catch (attachmentError) {
        console.log(`ℹ️ Anexos não disponíveis para produto ${id} (normal se não houver)`);
      }

      // Tentar buscar mídia separadamente se disponível
      try {
        const mediaResponse = await this.makeAuthenticatedRequest<BlingApiResponse<any>>(`/produtos/${id}/midia`);
        if (mediaResponse.data) {
          product.midia = Array.isArray(mediaResponse.data) ? mediaResponse.data : [mediaResponse.data];
        }
      } catch (mediaError) {
        console.log(`ℹ️ Mídia não disponível para produto ${id} (normal se não houver)`);
      }

      return product;
    } catch (error) {
      console.error(`❌ Erro ao buscar detalhes completos do produto ${id}:`, error);
      throw error;
    }
  }

  // Obter categorias
  async getCategories(): Promise<any[]> {
    const response = await this.makeAuthenticatedRequest<BlingApiResponse<any>>('/categorias');
    return Array.isArray(response.data) ? response.data : [response.data];
  }

  // Obter pedidos
  async getOrders(page: number = 1, limit: number = 10): Promise<{
    orders: any[];
    pagination?: any;
    total: number;
  }> {
    const endpoint = `/pedidos/vendas?pagina=${page}&limite=${limit}`;
    const response = await this.makeAuthenticatedRequest<BlingApiResponse<any>>(endpoint);
    const orders = Array.isArray(response.data) ? response.data : [response.data];

    return {
      orders,
      pagination: response.pagination,
      total: orders.length
    };
  }

  // Obter dados completos
  async getAllData(options: {
    includeCompany?: boolean;
    includeProducts?: boolean;
    includeCategories?: boolean;
    includeOrders?: boolean;
    productLimit?: number;
    orderLimit?: number;
  } = {}): Promise<{
    company?: BlingCompany;
    products?: BlingProduct[];
    categories?: any[];
    orders?: any[];
    summary: {
      authenticated: boolean;
      totalProducts: number;
      totalCategories: number;
      totalOrders: number;
    };
  }> {
    const {
      includeCompany = true,
      includeProducts = true,
      includeCategories = true,
      includeOrders = true,
      productLimit = 20,
      orderLimit = 10
    } = options;

    const result: any = {
      summary: {
        authenticated: true,
        totalProducts: 0,
        totalCategories: 0,
        totalOrders: 0
      }
    };

    try {
      // Obter dados da empresa
      if (includeCompany) {
        result.company = await this.getCompanyInfo();
      }

      // Obter produtos
      if (includeProducts) {
        const productsData = await this.getProducts({ limit: productLimit });
        result.products = productsData.products;
        result.summary.totalProducts = productsData.total;
      }

      // Obter categorias
      if (includeCategories) {
        result.categories = await this.getCategories();
        result.summary.totalCategories = result.categories.length;
      }

      // Obter pedidos
      if (includeOrders) {
        const ordersData = await this.getOrders(1, orderLimit);
        result.orders = ordersData.orders;
        result.summary.totalOrders = ordersData.total;
      }

      return result;
    } catch (error) {
      console.error('❌ Erro ao obter dados completos:', error);
      throw error;
    }
  }
}

// Exportar instância única
export default new BlingOAuthService(); 