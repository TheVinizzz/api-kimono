"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
// Classe principal do serviço Bling
class BlingService {
    constructor() {
        this.apiUrl = config_1.default.bling.apiUrl;
        this.clientId = config_1.default.bling.clientId;
        this.clientSecret = config_1.default.bling.clientSecret;
        this.accessToken = config_1.default.bling.accessToken;
        this.refreshToken = config_1.default.bling.refreshToken;
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
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }
    // Fazer requisição HTTP com tratamento de erro e renovação de token
    makeRequest(config) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const response = yield (0, axios_1.default)(config);
                return response.data;
            }
            catch (error) {
                // Se token expirou, tentar renovar
                if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401) {
                    console.log('Token expirado, tentando renovar...');
                    yield this.refreshAccessToken();
                    // Atualizar headers com novo token e tentar novamente
                    config.headers = Object.assign(Object.assign({}, config.headers), this.getHeaders());
                    const response = yield (0, axios_1.default)(config);
                    return response.data;
                }
                console.error('Erro na requisição Bling:', ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
                throw error;
            }
        });
    }
    // Renovar token de acesso
    refreshAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tokenData = new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                });
                const response = yield axios_1.default.post(`${this.apiUrl}/oauth/token`, tokenData, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
                    }
                });
                this.accessToken = response.data.access_token;
                this.refreshToken = response.data.refresh_token;
                console.log('Token renovado com sucesso!');
            }
            catch (error) {
                console.error('Erro ao renovar token:', error);
                throw error;
            }
        });
    }
    // ===================
    // MÉTODOS DE PRODUTOS
    // ===================
    // Listar produtos
    getProducts() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 50) {
            const config = {
                method: 'GET',
                url: `${this.apiUrl}/Api/v3/produtos`,
                headers: this.getHeaders(),
                params: {
                    pagina: page,
                    limite: limit
                }
            };
            return this.makeRequest(config);
        });
    }
    // Obter produto por ID
    getProductById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'GET',
                url: `${this.apiUrl}/Api/v3/produtos/${id}`,
                headers: this.getHeaders()
            };
            return this.makeRequest(config);
        });
    }
    // Criar produto
    createProduct(product) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'POST',
                url: `${this.apiUrl}/Api/v3/produtos`,
                headers: this.getHeaders(),
                data: product
            };
            return this.makeRequest(config);
        });
    }
    // Atualizar produto
    updateProduct(id, product) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'PUT',
                url: `${this.apiUrl}/Api/v3/produtos/${id}`,
                headers: this.getHeaders(),
                data: product
            };
            return this.makeRequest(config);
        });
    }
    // Deletar produto
    deleteProduct(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'DELETE',
                url: `${this.apiUrl}/Api/v3/produtos/${id}`,
                headers: this.getHeaders()
            };
            yield this.makeRequest(config);
        });
    }
    // ===================
    // MÉTODOS DE PEDIDOS
    // ===================
    // Listar pedidos
    getOrders() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 50) {
            const config = {
                method: 'GET',
                url: `${this.apiUrl}/Api/v3/pedidos/vendas`,
                headers: this.getHeaders(),
                params: {
                    pagina: page,
                    limite: limit
                }
            };
            return this.makeRequest(config);
        });
    }
    // Obter pedido por ID
    getOrderById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'GET',
                url: `${this.apiUrl}/Api/v3/pedidos/vendas/${id}`,
                headers: this.getHeaders()
            };
            return this.makeRequest(config);
        });
    }
    // Criar pedido
    createOrder(order) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'POST',
                url: `${this.apiUrl}/Api/v3/pedidos/vendas`,
                headers: this.getHeaders(),
                data: order
            };
            return this.makeRequest(config);
        });
    }
    // Atualizar pedido
    updateOrder(id, order) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'PUT',
                url: `${this.apiUrl}/Api/v3/pedidos/vendas/${id}`,
                headers: this.getHeaders(),
                data: order
            };
            return this.makeRequest(config);
        });
    }
    // ===================
    // MÉTODOS DE CLIENTES
    // ===================
    // Listar clientes
    getCustomers() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 50) {
            const config = {
                method: 'GET',
                url: `${this.apiUrl}/Api/v3/contatos`,
                headers: this.getHeaders(),
                params: {
                    pagina: page,
                    limite: limit
                }
            };
            return this.makeRequest(config);
        });
    }
    // Obter cliente por ID
    getCustomerById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'GET',
                url: `${this.apiUrl}/Api/v3/contatos/${id}`,
                headers: this.getHeaders()
            };
            return this.makeRequest(config);
        });
    }
    // Criar cliente
    createCustomer(customer) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'POST',
                url: `${this.apiUrl}/Api/v3/contatos`,
                headers: this.getHeaders(),
                data: customer
            };
            return this.makeRequest(config);
        });
    }
    // Atualizar cliente
    updateCustomer(id, customer) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'PUT',
                url: `${this.apiUrl}/Api/v3/contatos/${id}`,
                headers: this.getHeaders(),
                data: customer
            };
            return this.makeRequest(config);
        });
    }
    // ===================
    // MÉTODOS DE CATEGORIAS
    // ===================
    // Listar categorias
    getCategories() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'GET',
                url: `${this.apiUrl}/Api/v3/categorias/produtos`,
                headers: this.getHeaders()
            };
            return this.makeRequest(config);
        });
    }
    // Obter categoria por ID
    getCategoryById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'GET',
                url: `${this.apiUrl}/Api/v3/categorias/produtos/${id}`,
                headers: this.getHeaders()
            };
            return this.makeRequest(config);
        });
    }
    // Criar categoria
    createCategory(category) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'POST',
                url: `${this.apiUrl}/Api/v3/categorias/produtos`,
                headers: this.getHeaders(),
                data: category
            };
            return this.makeRequest(config);
        });
    }
    // Atualizar categoria
    updateCategory(id, category) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'PUT',
                url: `${this.apiUrl}/Api/v3/categorias/produtos/${id}`,
                headers: this.getHeaders(),
                data: category
            };
            return this.makeRequest(config);
        });
    }
    // Deletar categoria
    deleteCategory(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'DELETE',
                url: `${this.apiUrl}/Api/v3/categorias/produtos/${id}`,
                headers: this.getHeaders()
            };
            yield this.makeRequest(config);
        });
    }
    // ===================
    // MÉTODOS DE ESTOQUE
    // ===================
    // Obter estoque de um produto
    getProductStock(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'GET',
                url: `${this.apiUrl}/Api/v3/estoques/${productId}`,
                headers: this.getHeaders()
            };
            return this.makeRequest(config);
        });
    }
    // Atualizar estoque
    updateStock(stockData) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = {
                method: 'POST',
                url: `${this.apiUrl}/Api/v3/estoques`,
                headers: this.getHeaders(),
                data: stockData
            };
            return this.makeRequest(config);
        });
    }
    // ===================
    // MÉTODOS DE SINCRONIZAÇÃO
    // ===================
    // Sincronizar produto do sistema local para o Bling
    syncProductToBling(productData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!this.syncConfig.syncProducts) {
                    console.log('Sincronização de produtos está desabilitada');
                    return null;
                }
                // Mapear dados do produto local para formato Bling
                const blingProduct = {
                    nome: productData.name,
                    codigo: ((_a = productData.id) === null || _a === void 0 ? void 0 : _a.toString()) || productData.code,
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
                const response = yield this.createProduct(blingProduct);
                console.log(`Produto ${productData.name} sincronizado com Bling:`, response.data.id);
                return response.data;
            }
            catch (error) {
                console.error(`Erro ao sincronizar produto ${productData.name} com Bling:`, error);
                return null;
            }
        });
    }
    // Sincronizar pedido do sistema local para o Bling
    syncOrderToBling(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!this.syncConfig.syncOrders) {
                    console.log('Sincronização de pedidos está desabilitada');
                    return null;
                }
                // Mapear dados do pedido local para formato Bling
                const blingOrder = {
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
                    itens: ((_a = orderData.items) === null || _a === void 0 ? void 0 : _a.map((item) => ({
                        produto: {
                            id: item.productId,
                            nome: item.productName
                        },
                        quantidade: item.quantity,
                        valor: item.price
                    }))) || [],
                    observacoes: orderData.notes
                };
                const response = yield this.createOrder(blingOrder);
                console.log(`Pedido ${orderData.id} sincronizado com Bling:`, response.data.id);
                return response.data;
            }
            catch (error) {
                console.error(`Erro ao sincronizar pedido ${orderData.id} com Bling:`, error);
                return null;
            }
        });
    }
    // Processar webhook do Bling
    processWebhook(data) {
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
        }
        catch (error) {
            console.error('Erro ao processar webhook do Bling:', error);
            throw error;
        }
    }
    // Mapear status do Bling para status do sistema
    mapBlingStatusToSystemStatus(blingStatus) {
        if (!blingStatus)
            return 'PENDING';
        return this.statusMapping[blingStatus] || 'PENDING';
    }
    // Mapear status do sistema para status do Bling
    mapSystemStatusToBlingStatus(systemStatus) {
        const reverseMapping = {
            'PENDING': 'em_aberto',
            'PROCESSING': 'em_andamento',
            'SHIPPED': 'atendido',
            'CANCELED': 'cancelado'
        };
        return reverseMapping[systemStatus] || 'em_aberto';
    }
    // Configurar sincronização
    setSyncConfig(config) {
        this.syncConfig = Object.assign(Object.assign({}, this.syncConfig), config);
        console.log('Configuração de sincronização atualizada:', this.syncConfig);
    }
    // Obter configuração atual
    getSyncConfig() {
        return this.syncConfig;
    }
}
// Exportar instância única
exports.default = new BlingService();
