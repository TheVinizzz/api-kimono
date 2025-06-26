import axios, { AxiosRequestConfig } from 'axios';
import config from '../config';
import { 
  BlingCustomer,
  BlingOrder,
  BlingProduct,
  BlingCategory,
  BlingStock,
  BlingApiResponse,
  BlingPaginatedResponse,
  BlingToken,
  BlingTokenRefresh,
  BlingStatusMapping,
  BlingWebhookData,
  BlingSyncConfig
} from '../types/bling.types';

// Classe principal do serviço Bling
class BlingService {
  private apiUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string;
  private refreshToken: string;
  private statusMapping: BlingStatusMapping;
  private syncConfig: BlingSyncConfig;

  constructor() {
    this.apiUrl = config.bling.apiUrl;
    this.clientId = config.bling.clientId;
    this.clientSecret = config.bling.clientSecret;
    this.accessToken = config.bling.accessToken;
    this.refreshToken = config.bling.refreshToken;
    
    // Mapeamento de status do Bling para status de pedido do sistema
    this.statusMapping = {
      'em_aberto': 'PENDING',
      'em_andamento': 'PROCESSING',
      'atendido': 'SHIPPED',
      'cancelado': 'CANCELED',
      'em_digitacao': 'PENDING',
      'pendente': 'PENDING',
      'vencido': 'CANCELED'
    };

    // Configurações padrão de sincronização
    this.syncConfig = {
      syncProducts: true,
      syncOrders: true,
      syncStock: true,
      syncCustomers: true,
      autoUpdateStock: true,
      defaultCategory: 1,
      defaultStore: 1
    };
  }

  // Headers para requisições autenticadas
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // Fazer requisição HTTP com tratamento de erro e renovação de token
  private async makeRequest<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      // Se token expirou, tentar renovar
      if (error.response?.status === 401) {
        console.log('Token expirado, tentando renovar...');
        await this.refreshAccessToken();
        
        // Atualizar headers com novo token e tentar novamente
        config.headers = { ...config.headers, ...this.getHeaders() };
        const response = await axios(config);
        return response.data;
      }
      
      console.error('Erro na requisição Bling:', error.response?.data || error.message);
      throw error;
    }
  }

  // Renovar token de acesso
  async refreshAccessToken(): Promise<void> {
    try {
      const tokenData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      });

      const response = await axios.post<BlingToken>(
        `${this.apiUrl}/oauth/token`,
        tokenData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      
      console.log('Token renovado com sucesso!');
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      throw error;
    }
  }

  // ===================
  // MÉTODOS DE PRODUTOS
  // ===================

  // Listar produtos
  async getProducts(page: number = 1, limit: number = 50, filters: { [key: string]: any } = {}): Promise<BlingPaginatedResponse<BlingProduct>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.apiUrl}/Api/v3/produtos`,
      headers: this.getHeaders(),
      params: {
        pagina: page,
        limite: limit,
        ...filters
      }
    };

    return this.makeRequest<BlingPaginatedResponse<BlingProduct>>(config);
  }

  // Obter produto por ID
  async getProductById(id: number): Promise<BlingApiResponse<BlingProduct>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.apiUrl}/Api/v3/produtos/${id}`,
      headers: this.getHeaders()
    };

    return this.makeRequest<BlingApiResponse<BlingProduct>>(config);
  }

  // Criar produto
  async createProduct(product: BlingProduct): Promise<BlingApiResponse<BlingProduct>> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.apiUrl}/Api/v3/produtos`,
      headers: this.getHeaders(),
      data: product
    };

    return this.makeRequest<BlingApiResponse<BlingProduct>>(config);
  }

  // Atualizar produto
  async updateProduct(id: number, product: Partial<BlingProduct>): Promise<BlingApiResponse<BlingProduct>> {
    const config: AxiosRequestConfig = {
      method: 'PUT',
      url: `${this.apiUrl}/Api/v3/produtos/${id}`,
      headers: this.getHeaders(),
      data: product
    };

    return this.makeRequest<BlingApiResponse<BlingProduct>>(config);
  }

  // Deletar produto
  async deleteProduct(id: number): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'DELETE',
      url: `${this.apiUrl}/Api/v3/produtos/${id}`,
      headers: this.getHeaders()
    };

    await this.makeRequest(config);
  }

  // ===================
  // MÉTODOS DE PEDIDOS
  // ===================

  // Listar pedidos
  async getOrders(page: number = 1, limit: number = 50): Promise<BlingPaginatedResponse<BlingOrder>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.apiUrl}/Api/v3/pedidos/vendas`,
      headers: this.getHeaders(),
      params: {
        pagina: page,
        limite: limit
      }
    };

    return this.makeRequest<BlingPaginatedResponse<BlingOrder>>(config);
  }

  // Obter pedido por ID
  async getOrderById(id: number): Promise<BlingApiResponse<BlingOrder>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.apiUrl}/Api/v3/pedidos/vendas/${id}`,
      headers: this.getHeaders()
    };

    return this.makeRequest<BlingApiResponse<BlingOrder>>(config);
  }

  // Criar pedido
  async createOrder(order: BlingOrder): Promise<BlingApiResponse<BlingOrder>> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.apiUrl}/Api/v3/pedidos/vendas`,
      headers: this.getHeaders(),
      data: order
    };

    return this.makeRequest<BlingApiResponse<BlingOrder>>(config);
  }

  // Atualizar pedido
  async updateOrder(id: number, order: Partial<BlingOrder>): Promise<BlingApiResponse<BlingOrder>> {
    const config: AxiosRequestConfig = {
      method: 'PUT',
      url: `${this.apiUrl}/Api/v3/pedidos/vendas/${id}`,
      headers: this.getHeaders(),
      data: order
    };

    return this.makeRequest<BlingApiResponse<BlingOrder>>(config);
  }

  // ===================
  // MÉTODOS DE CLIENTES
  // ===================

  // Listar clientes
  async getCustomers(page: number = 1, limit: number = 50): Promise<BlingPaginatedResponse<BlingCustomer>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.apiUrl}/Api/v3/contatos`,
      headers: this.getHeaders(),
      params: {
        pagina: page,
        limite: limit
      }
    };

    return this.makeRequest<BlingPaginatedResponse<BlingCustomer>>(config);
  }

  // Obter cliente por ID
  async getCustomerById(id: number): Promise<BlingApiResponse<BlingCustomer>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.apiUrl}/Api/v3/contatos/${id}`,
      headers: this.getHeaders()
    };

    return this.makeRequest<BlingApiResponse<BlingCustomer>>(config);
  }

  // Criar cliente
  async createCustomer(customer: BlingCustomer): Promise<BlingApiResponse<BlingCustomer>> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.apiUrl}/Api/v3/contatos`,
      headers: this.getHeaders(),
      data: customer
    };

    return this.makeRequest<BlingApiResponse<BlingCustomer>>(config);
  }

  // Atualizar cliente
  async updateCustomer(id: number, customer: Partial<BlingCustomer>): Promise<BlingApiResponse<BlingCustomer>> {
    const config: AxiosRequestConfig = {
      method: 'PUT',
      url: `${this.apiUrl}/Api/v3/contatos/${id}`,
      headers: this.getHeaders(),
      data: customer
    };

    return this.makeRequest<BlingApiResponse<BlingCustomer>>(config);
  }

  // ===================
  // MÉTODOS DE CATEGORIAS
  // ===================

  // Listar categorias
  async getCategories(): Promise<BlingPaginatedResponse<BlingCategory>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.apiUrl}/Api/v3/categorias/produtos`,
      headers: this.getHeaders()
    };

    return this.makeRequest<BlingPaginatedResponse<BlingCategory>>(config);
  }

  // Obter categoria por ID
  async getCategoryById(id: number): Promise<BlingApiResponse<BlingCategory>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.apiUrl}/Api/v3/categorias/produtos/${id}`,
      headers: this.getHeaders()
    };

    return this.makeRequest<BlingApiResponse<BlingCategory>>(config);
  }

  // Criar categoria
  async createCategory(category: BlingCategory): Promise<BlingApiResponse<BlingCategory>> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.apiUrl}/Api/v3/categorias/produtos`,
      headers: this.getHeaders(),
      data: category
    };

    return this.makeRequest<BlingApiResponse<BlingCategory>>(config);
  }

  // Atualizar categoria
  async updateCategory(id: number, category: Partial<BlingCategory>): Promise<BlingApiResponse<BlingCategory>> {
    const config: AxiosRequestConfig = {
      method: 'PUT',
      url: `${this.apiUrl}/Api/v3/categorias/produtos/${id}`,
      headers: this.getHeaders(),
      data: category
    };

    return this.makeRequest<BlingApiResponse<BlingCategory>>(config);
  }

  // Deletar categoria
  async deleteCategory(id: number): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'DELETE',
      url: `${this.apiUrl}/Api/v3/categorias/produtos/${id}`,
      headers: this.getHeaders()
    };

    await this.makeRequest(config);
  }

  // ===================
  // MÉTODOS DE ESTOQUE
  // ===================

  // Obter estoque de um produto
  async getProductStock(productId: number): Promise<BlingApiResponse<any>> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.apiUrl}/Api/v3/estoques/${productId}`,
      headers: this.getHeaders()
    };

    return this.makeRequest<BlingApiResponse<any>>(config);
  }

  // Atualizar estoque
  async updateStock(stockData: BlingStock): Promise<BlingApiResponse<any>> {
    const config: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.apiUrl}/Api/v3/estoques`,
      headers: this.getHeaders(),
      data: stockData
    };

    return this.makeRequest<BlingApiResponse<any>>(config);
  }

  // ===================
  // MÉTODOS DE SINCRONIZAÇÃO
  // ===================

  // Sincronizar produto do sistema local para o Bling
  async syncProductToBling(productData: any): Promise<BlingProduct | null> {
    try {
      if (!this.syncConfig.syncProducts) {
        console.log('Sincronização de produtos está desabilitada');
        return null;
      }

      // Mapear dados do produto local para formato Bling
      const blingProduct: BlingProduct = {
        nome: productData.name,
        codigo: productData.id?.toString() || productData.code,
        preco: productData.price,
        tipo: 'P', // Produto
        situacao: productData.active ? 'A' : 'I',
        descricaoCurta: productData.description,
        categoria: {
          id: this.syncConfig.defaultCategory
        },
        estoque: {
          minimo: productData.minStock || 0
        },
        informacoesAdicionais: {
          imagemURL: productData.imageUrl
        }
      };

      const response = await this.createProduct(blingProduct);
      console.log(`Produto ${productData.name} sincronizado com Bling:`, response.data.id);
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao sincronizar produto ${productData.name} com Bling:`, error);
      return null;
    }
  }

  // Sincronizar pedido do sistema local para o Bling
  async syncOrderToBling(orderData: any): Promise<BlingOrder | null> {
    try {
      if (!this.syncConfig.syncOrders) {
        console.log('Sincronização de pedidos está desabilitada');
        return null;
      }

      // Mapear dados do pedido local para formato Bling
      const blingOrder: BlingOrder = {
        numeroLoja: orderData.id.toString(),
        data: new Date().toISOString().split('T')[0],
        totalVenda: orderData.total,
        situacao: 'em_aberto',
        loja: this.syncConfig.defaultStore,
        cliente: {
          nome: orderData.customerName || 'Cliente',
          email: orderData.customerEmail,
          documento: orderData.customerDocument,
          telefone: orderData.customerPhone,
          endereco: orderData.shippingAddress ? {
            endereco: orderData.shippingAddress.street,
            numero: orderData.shippingAddress.number,
            bairro: orderData.shippingAddress.neighborhood,
            cep: orderData.shippingAddress.zipCode,
            municipio: orderData.shippingAddress.city,
            uf: orderData.shippingAddress.state
          } : undefined
        },
        itens: orderData.items?.map((item: any) => ({
          produto: {
            id: item.productId,
            nome: item.productName
          },
          quantidade: item.quantity,
          valor: item.price
        })) || [],
        observacoes: orderData.notes
      };

      const response = await this.createOrder(blingOrder);
      console.log(`Pedido ${orderData.id} sincronizado com Bling:`, response.data.id);
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao sincronizar pedido ${orderData.id} com Bling:`, error);
      return null;
    }
  }

  // Processar webhook do Bling
  processWebhook(data: BlingWebhookData): { event: string, data: any, status?: string } {
    try {
      console.log('Processando webhook do Bling:', data);
      
      const result = {
        event: data.evento,
        data: data.dados,
        status: this.mapBlingStatusToSystemStatus(data.dados.situacao)
      };

      // Processar diferentes tipos de eventos
      switch (data.evento) {
        case 'pedido_venda_alterado':
          console.log(`Pedido ${data.dados.numero} foi alterado no Bling`);
          break;
        case 'produto_alterado':
          console.log(`Produto ${data.dados.id} foi alterado no Bling`);
          break;
        case 'estoque_alterado':
          console.log(`Estoque do produto ${data.dados.id} foi alterado no Bling`);
          break;
        default:
          console.log(`Evento ${data.evento} recebido do Bling`);
      }

      return result;
    } catch (error) {
      console.error('Erro ao processar webhook do Bling:', error);
      throw error;
    }
  }

  // Mapear status do Bling para status do sistema
  mapBlingStatusToSystemStatus(blingStatus?: string): string {
    if (!blingStatus) return 'PENDING';
    return this.statusMapping[blingStatus] || 'PENDING';
  }

  // Mapear status do sistema para status do Bling
  mapSystemStatusToBlingStatus(systemStatus: string): string {
    const reverseMapping: Record<string, string> = {
      'PENDING': 'em_aberto',
      'PROCESSING': 'em_andamento', 
      'SHIPPED': 'atendido',
      'CANCELED': 'cancelado'
    };
    
    return reverseMapping[systemStatus] || 'em_aberto';
  }

  // Configurar sincronização
  setSyncConfig(config: Partial<BlingSyncConfig>): void {
    this.syncConfig = { ...this.syncConfig, ...config };
    console.log('Configuração de sincronização atualizada:', this.syncConfig);
  }

  // Obter configuração atual
  getSyncConfig(): BlingSyncConfig {
    return this.syncConfig;
  }

  async getAllProducts(): Promise<BlingProduct[]> {
    let allProducts: BlingProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getProducts(page);
      
      if (response && response.data && response.data.length > 0) {
        allProducts = allProducts.concat(response.data);
        page++;
      } else {
        hasMore = false;
      }
    }
    
    return allProducts;
  }
}

// Exportar instância única
export default new BlingService(); 