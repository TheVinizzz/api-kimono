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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class BlingOAuthService {
    constructor() {
        this.tokens = null;
        this.apiUrl = 'https://api.bling.com.br/Api/v3';
        this.clientId = config_1.default.bling.clientId;
        this.clientSecret = config_1.default.bling.clientSecret;
        this.redirectUri = config_1.default.bling.redirectUri;
        this.tokensFile = path_1.default.join(__dirname, '../../tokens.json');
        // Carregar tokens existentes
        this.loadTokens();
    }
    // ==========================================
    // GERENCIAMENTO DE TOKENS
    // ==========================================
    // Carregar tokens do arquivo
    loadTokens() {
        try {
            if (fs_1.default.existsSync(this.tokensFile)) {
                const data = fs_1.default.readFileSync(this.tokensFile, 'utf8');
                this.tokens = JSON.parse(data);
                console.log('✅ Tokens carregados do arquivo');
            }
        }
        catch (error) {
            console.error('❌ Erro ao carregar tokens:', error);
        }
    }
    // Salvar tokens no arquivo
    saveTokens(tokens) {
        try {
            const tokenData = Object.assign(Object.assign({}, tokens), { timestamp: Date.now(), expires_at: Date.now() + (tokens.expires_in * 1000) });
            fs_1.default.writeFileSync(this.tokensFile, JSON.stringify(tokenData, null, 2));
            this.tokens = tokenData;
            console.log('✅ Tokens salvos com sucesso');
        }
        catch (error) {
            console.error('❌ Erro ao salvar tokens:', error);
        }
    }
    // Verificar se o token está expirado
    isTokenExpired() {
        if (!this.tokens || !this.tokens.expires_at)
            return true;
        return Date.now() > this.tokens.expires_at - 300000; // 5 minutos antes da expiração
    }
    // ==========================================
    // AUTENTICAÇÃO OAUTH
    // ==========================================
    // Autenticação automática usando Client Credentials
    authenticateAutomatically() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
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
                    yield this.refreshAccessToken();
                    return this.tokens;
                }
                catch (error) {
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
                    const tokens = yield attempt();
                    if (tokens) {
                        this.saveTokens(tokens);
                        console.log('✅ Autenticação automática realizada com sucesso!');
                        return tokens;
                    }
                }
                catch (error) {
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
   • CLIENT_ID: ${(_a = this.clientId) === null || _a === void 0 ? void 0 : _a.substring(0, 10)}...
   • CLIENT_SECRET: ${this.clientSecret ? 'Configurado' : 'NÃO CONFIGURADO'}
    `);
        });
    }
    // Tentar Client Credentials (pode não funcionar)
    tryClientCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenData = {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                scope: 'read write'
            };
            const response = yield axios_1.default.post('https://www.bling.com.br/Api/v3/oauth/token', new URLSearchParams(tokenData), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            });
            return response.data;
        });
    }
    // Tentar autenticação direta
    tryDirectAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            const response = yield axios_1.default.post('https://api.bling.com.br/Api/v3/auth/token', {}, {
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            return response.data;
        });
    }
    // Tentar método legado (se existir)
    tryLegacyAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            // Tentar endpoint alternativo
            const response = yield axios_1.default.post('https://bling.com.br/Api/v3/oauth/authorize', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'client_credentials'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            return response.data;
        });
    }
    // Verificar e renovar token automaticamente se necessário
    ensureValidToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Se não tem token, tentar autenticação automática
                if (!this.tokens) {
                    console.log('🔄 Nenhum token encontrado, tentando autenticação automática...');
                    yield this.authenticateAutomatically();
                    return true;
                }
                // Se token expirado, tentar renovar
                if (this.isTokenExpired()) {
                    if (this.tokens.refresh_token) {
                        console.log('🔄 Token expirado, renovando...');
                        yield this.refreshAccessToken();
                        return true;
                    }
                    else {
                        console.log('🔄 Token expirado sem refresh token, tentando nova autenticação...');
                        yield this.authenticateAutomatically();
                        return true;
                    }
                }
                console.log('✅ Token válido encontrado');
                return true;
            }
            catch (error) {
                console.error('❌ Erro ao garantir token válido:', error);
                return false;
            }
        });
    }
    // Gerar URL de autorização
    generateAuthUrl() {
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
    generateState() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
    // Trocar código de autorização por tokens
    exchangeCodeForTokens(code) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const tokenData = {
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.redirectUri
            };
            // FIX: Bling expects client credentials in the Authorization header (Basic Auth).
            const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            try {
                const response = yield axios_1.default.post('https://api.bling.com.br/Api/v3/oauth/token', new URLSearchParams(tokenData), {
                    headers: {
                        'Authorization': `Basic ${basicAuth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                });
                if (response.status === 200 && response.data.access_token) {
                    this.saveTokens(response.data);
                    return response.data;
                }
                else {
                    throw new Error('Resposta inválida do Bling ao trocar código por token');
                }
            }
            catch (error) {
                const errorMessage = ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) ? JSON.stringify(error.response.data) : error.message;
                console.error('❌ Erro detalhado ao trocar código por token:', errorMessage);
                // Re-throw the detailed error from Bling to the frontend
                throw new Error(`Falha na troca de token com o Bling. Detalhes: ${errorMessage}`);
            }
        });
    }
    // Renovar access token
    refreshAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!((_a = this.tokens) === null || _a === void 0 ? void 0 : _a.refresh_token)) {
                throw new Error('Refresh token não disponível');
            }
            const tokenData = {
                grant_type: 'refresh_token',
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: this.tokens.refresh_token
            };
            try {
                const response = yield axios_1.default.post('https://www.bling.com.br/Api/v3/oauth/token', new URLSearchParams(tokenData), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                });
                if (response.status === 200) {
                    this.saveTokens(response.data);
                    return response.data;
                }
                else {
                    throw new Error(`Erro ao renovar token: ${response.status}`);
                }
            }
            catch (error) {
                console.error('❌ Erro ao renovar token:', ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
                throw error;
            }
        });
    }
    // ==========================================
    // REQUISIÇÕES AUTENTICADAS
    // ==========================================
    // Fazer requisição autenticada
    makeAuthenticatedRequest(endpoint_1) {
        return __awaiter(this, arguments, void 0, function* (endpoint, method = 'GET', data) {
            var _a, _b, _c, _d;
            // Garantir que temos um token válido (com autenticação automática)
            const tokenValid = yield this.ensureValidToken();
            if (!tokenValid || !((_a = this.tokens) === null || _a === void 0 ? void 0 : _a.access_token)) {
                throw new Error('Não foi possível obter um token válido. Verifique as credenciais.');
            }
            const config = {
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
                const response = yield (0, axios_1.default)(config);
                return response.data;
            }
            catch (error) {
                if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 401) {
                    // Token pode ter expirado, tentar renovar uma vez
                    if ((_c = this.tokens) === null || _c === void 0 ? void 0 : _c.refresh_token) {
                        yield this.refreshAccessToken();
                        config.headers['Authorization'] = `Bearer ${this.tokens.access_token}`;
                        const retryResponse = yield (0, axios_1.default)(config);
                        return retryResponse.data;
                    }
                }
                console.error('❌ Erro na requisição:', ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message);
                throw error;
            }
        });
    }
    // ==========================================
    // MÉTODOS PÚBLICOS PARA OBTER DADOS
    // ==========================================
    // Verificar status da autenticação
    getAuthStatus() {
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
    getCompanyInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.makeAuthenticatedRequest('/empresas');
            const companies = Array.isArray(response.data) ? response.data : [response.data];
            if (companies.length === 0) {
                throw new Error('Nenhuma empresa encontrada');
            }
            return companies[0];
        });
    }
    // Obter produtos com filtros
    getProducts() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const { page = 1, limit = 20, search, active } = options;
            let endpoint = `/produtos?pagina=${page}&limite=${limit}`;
            if (search) {
                endpoint += `&pesquisa=${encodeURIComponent(search)}`;
            }
            if (active !== undefined) {
                endpoint += `&situacao=${active ? 'Ativo' : 'Inativo'}`;
            }
            const response = yield this.makeAuthenticatedRequest(endpoint);
            const products = Array.isArray(response.data) ? response.data : [response.data];
            return {
                products,
                pagination: response.pagination,
                total: products.length
            };
        });
    }
    // Obter produto por ID
    getProductById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.makeAuthenticatedRequest(`/produtos/${id}`);
            return Array.isArray(response.data) ? response.data[0] : response.data;
        });
    }
    // Obter produto com detalhes completos incluindo anexos e imagens
    getProductWithFullDetails(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Buscar produto básico
                const product = yield this.getProductById(id);
                // Tentar buscar anexos/mídia separadamente se disponível
                try {
                    const attachmentsResponse = yield this.makeAuthenticatedRequest(`/produtos/${id}/anexos`);
                    if (attachmentsResponse.data) {
                        product.anexos = Array.isArray(attachmentsResponse.data) ? attachmentsResponse.data : [attachmentsResponse.data];
                    }
                }
                catch (attachmentError) {
                    console.log(`ℹ️ Anexos não disponíveis para produto ${id} (normal se não houver)`);
                }
                // Tentar buscar mídia separadamente se disponível
                try {
                    const mediaResponse = yield this.makeAuthenticatedRequest(`/produtos/${id}/midia`);
                    if (mediaResponse.data) {
                        product.midia = Array.isArray(mediaResponse.data) ? mediaResponse.data : [mediaResponse.data];
                    }
                }
                catch (mediaError) {
                    console.log(`ℹ️ Mídia não disponível para produto ${id} (normal se não houver)`);
                }
                return product;
            }
            catch (error) {
                console.error(`❌ Erro ao buscar detalhes completos do produto ${id}:`, error);
                throw error;
            }
        });
    }
    // Obter categorias
    getCategories() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.makeAuthenticatedRequest('/categorias');
            return Array.isArray(response.data) ? response.data : [response.data];
        });
    }
    // Obter pedidos
    getOrders() {
        return __awaiter(this, arguments, void 0, function* (page = 1, limit = 10) {
            const endpoint = `/pedidos/vendas?pagina=${page}&limite=${limit}`;
            const response = yield this.makeAuthenticatedRequest(endpoint);
            const orders = Array.isArray(response.data) ? response.data : [response.data];
            return {
                orders,
                pagination: response.pagination,
                total: orders.length
            };
        });
    }
    // Obter dados completos
    getAllData() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            const { includeCompany = true, includeProducts = true, includeCategories = true, includeOrders = true, productLimit = 20, orderLimit = 10 } = options;
            const result = {
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
                    result.company = yield this.getCompanyInfo();
                }
                // Obter produtos
                if (includeProducts) {
                    const productsData = yield this.getProducts({ limit: productLimit });
                    result.products = productsData.products;
                    result.summary.totalProducts = productsData.total;
                }
                // Obter categorias
                if (includeCategories) {
                    result.categories = yield this.getCategories();
                    result.summary.totalCategories = result.categories.length;
                }
                // Obter pedidos
                if (includeOrders) {
                    const ordersData = yield this.getOrders(1, orderLimit);
                    result.orders = ordersData.orders;
                    result.summary.totalOrders = ordersData.total;
                }
                return result;
            }
            catch (error) {
                console.error('❌ Erro ao obter dados completos:', error);
                throw error;
            }
        });
    }
}
// Exportar instância única
exports.default = new BlingOAuthService();
