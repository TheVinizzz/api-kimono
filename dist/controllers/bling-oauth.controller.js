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
exports.getBlingProductById = exports.getBlingCompany = exports.getBlingProducts = exports.getBlingData = exports.getBlingDataAuto = exports.checkAuthStatus = exports.handleOAuthCallback = exports.generateAuthUrl = exports.authenticateAutomatically = void 0;
const bling_oauth_service_1 = __importDefault(require("../services/bling-oauth.service"));
// ==========================================
// AUTENTICAÇÃO OAUTH
// ==========================================
// Autenticação automática (sem navegador)
const authenticateAutomatically = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokens = yield bling_oauth_service_1.default.authenticateAutomatically();
        return res.json({
            success: true,
            message: 'Autenticação automática realizada com sucesso',
            data: {
                tokenType: tokens.token_type,
                expiresIn: tokens.expires_in,
                authenticated: true,
                automatic: true
            }
        });
    }
    catch (error) {
        console.error('Erro na autenticação automática:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro na autenticação automática',
            error: error.message,
            fallback: 'Use o fluxo OAuth manual se a autenticação automática não funcionar'
        });
    }
});
exports.authenticateAutomatically = authenticateAutomatically;
// Gerar URL de autorização
const generateAuthUrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authUrl = bling_oauth_service_1.default.generateAuthUrl();
        return res.json({
            success: true,
            message: 'URL de autorização gerada com sucesso',
            data: {
                authUrl,
                instructions: [
                    '1. Abra a URL no navegador',
                    '2. Faça login no Bling',
                    '3. Autorize a aplicação',
                    '4. Copie o código da URL de retorno',
                    '5. Use o endpoint /auth/callback com o código'
                ]
            }
        });
    }
    catch (error) {
        console.error('Erro ao gerar URL de autorização:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao gerar URL de autorização',
            error: error.message
        });
    }
});
exports.generateAuthUrl = generateAuthUrl;
// Processar callback OAuth (trocar código por tokens)
const handleOAuthCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Código de autorização é obrigatório'
            });
        }
        const tokens = yield bling_oauth_service_1.default.exchangeCodeForTokens(code);
        return res.json({
            success: true,
            message: 'Autenticação realizada com sucesso',
            data: {
                tokenType: tokens.token_type,
                expiresIn: tokens.expires_in,
                authenticated: true
            }
        });
    }
    catch (error) {
        console.error('Erro no callback OAuth:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao processar callback OAuth',
            error: error.message
        });
    }
});
exports.handleOAuthCallback = handleOAuthCallback;
// Verificar status da autenticação
const checkAuthStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = bling_oauth_service_1.default.getAuthStatus();
        return res.json(Object.assign({ success: true }, status));
    }
    catch (error) {
        console.error('Erro ao verificar status de autenticação:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao verificar status de autenticação',
            error: error.message
        });
    }
});
exports.checkAuthStatus = checkAuthStatus;
// ==========================================
// OBTER DADOS DO BLING
// ==========================================
// Obter dados do Bling com autenticação automática
const getBlingDataAuto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🚀 Tentando obter dados do Bling com autenticação automática...');
        const { includeCompany = 'true', includeProducts = 'true', includeCategories = 'true', includeOrders = 'true', productLimit = '20', orderLimit = '10' } = req.query;
        const options = {
            includeCompany: includeCompany === 'true',
            includeProducts: includeProducts === 'true',
            includeCategories: includeCategories === 'true',
            includeOrders: includeOrders === 'true',
            productLimit: parseInt(productLimit) || 20,
            orderLimit: parseInt(orderLimit) || 10
        };
        // Isso vai tentar autenticação automática se necessário
        const data = yield bling_oauth_service_1.default.getAllData(options);
        return res.json({
            success: true,
            message: 'Dados do Bling obtidos com sucesso (autenticação automática)',
            timestamp: new Date().toISOString(),
            automatic: true,
            data
        });
    }
    catch (error) {
        console.error('Erro ao obter dados automaticamente:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao obter dados do Bling automaticamente',
            error: error.message,
            suggestion: 'Verifique se CLIENT_ID e CLIENT_SECRET estão corretos, ou use o fluxo OAuth manual'
        });
    }
});
exports.getBlingDataAuto = getBlingDataAuto;
// Obter dados completos do Bling
const getBlingData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { includeCompany = 'true', includeProducts = 'true', includeCategories = 'true', includeOrders = 'true', productLimit = '20', orderLimit = '10' } = req.query;
        const options = {
            includeCompany: includeCompany === 'true',
            includeProducts: includeProducts === 'true',
            includeCategories: includeCategories === 'true',
            includeOrders: includeOrders === 'true',
            productLimit: parseInt(productLimit) || 20,
            orderLimit: parseInt(orderLimit) || 10
        };
        const data = yield bling_oauth_service_1.default.getAllData(options);
        return res.json({
            success: true,
            message: 'Dados do Bling obtidos com sucesso',
            timestamp: new Date().toISOString(),
            data
        });
    }
    catch (error) {
        console.error('Erro ao obter dados do Bling:', error);
        // Se for erro de autenticação, retornar instruções
        if (error.message.includes('Token') || error.message.includes('login')) {
            return res.status(401).json({
                success: false,
                message: 'Erro de autenticação',
                error: error.message,
                authRequired: true,
                instructions: [
                    '1. Use GET /api/bling/auth/url para obter URL de autorização',
                    '2. Faça login no Bling',
                    '3. Use POST /api/bling/auth/callback com o código retornado'
                ]
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Erro ao obter dados do Bling',
            error: error.message
        });
    }
});
exports.getBlingData = getBlingData;
// Obter apenas produtos do Bling
const getBlingProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = '1', limit = '20', search = '', active = '' } = req.query;
        const options = {
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            search: search || undefined,
            active: active === 'true' ? true : active === 'false' ? false : undefined
        };
        const data = yield bling_oauth_service_1.default.getProducts(options);
        // Formatar produtos para resposta mais limpa
        const formattedProducts = data.products.map(product => {
            var _a, _b, _c, _d, _e;
            return ({
                id: product.id,
                name: product.nome,
                code: product.codigo,
                price: product.preco,
                active: product.situacao === 'Ativo',
                category: ((_a = product.categoria) === null || _a === void 0 ? void 0 : _a.descricao) || 'Sem categoria',
                stock: ((_c = (_b = product.estoques) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.saldoFisico) || 0,
                virtualStock: ((_e = (_d = product.estoques) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.saldoVirtual) || 0,
                imageUrl: product.imagemURL || null,
                description: product.descricao || '',
                createdAt: product.dataCriacao,
                updatedAt: product.dataAlteracao
            });
        });
        return res.json({
            success: true,
            message: `${formattedProducts.length} produtos encontrados`,
            data: {
                products: formattedProducts,
                pagination: data.pagination,
                total: data.total,
                filters: options
            }
        });
    }
    catch (error) {
        console.error('Erro ao obter produtos do Bling:', error);
        if (error.message.includes('Token') || error.message.includes('login')) {
            return res.status(401).json({
                success: false,
                message: 'Erro de autenticação',
                error: error.message,
                authRequired: true
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Erro ao obter produtos do Bling',
            error: error.message
        });
    }
});
exports.getBlingProducts = getBlingProducts;
// Obter informações da empresa
const getBlingCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const company = yield bling_oauth_service_1.default.getCompanyInfo();
        return res.json({
            success: true,
            message: 'Informações da empresa obtidas com sucesso',
            data: {
                company: {
                    id: company.id,
                    name: company.nome,
                    email: company.email,
                    phone: company.telefone,
                    cnpj: company.cnpj
                }
            }
        });
    }
    catch (error) {
        console.error('Erro ao obter informações da empresa:', error);
        if (error.message.includes('Token') || error.message.includes('login')) {
            return res.status(401).json({
                success: false,
                message: 'Erro de autenticação',
                error: error.message,
                authRequired: true
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Erro ao obter informações da empresa',
            error: error.message
        });
    }
});
exports.getBlingCompany = getBlingCompany;
// Obter produto específico por ID
const getBlingProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { id } = req.params;
        const productId = parseInt(id);
        if (isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do produto inválido'
            });
        }
        const product = yield bling_oauth_service_1.default.getProductById(productId);
        const formattedProduct = {
            id: product.id,
            name: product.nome,
            code: product.codigo,
            price: product.preco,
            active: product.situacao === 'Ativo',
            category: ((_a = product.categoria) === null || _a === void 0 ? void 0 : _a.descricao) || 'Sem categoria',
            stock: ((_c = (_b = product.estoques) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.saldoFisico) || 0,
            virtualStock: ((_e = (_d = product.estoques) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.saldoVirtual) || 0,
            imageUrl: product.imagemURL || null,
            description: product.descricao || '',
            createdAt: product.dataCriacao,
            updatedAt: product.dataAlteracao
        };
        return res.json({
            success: true,
            message: 'Produto encontrado',
            data: {
                product: formattedProduct
            }
        });
    }
    catch (error) {
        console.error('Erro ao obter produto por ID:', error);
        if (error.message.includes('Token') || error.message.includes('login')) {
            return res.status(401).json({
                success: false,
                message: 'Erro de autenticação',
                error: error.message,
                authRequired: true
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Erro ao obter produto',
            error: error.message
        });
    }
});
exports.getBlingProductById = getBlingProductById;
