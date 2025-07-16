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
exports.syncStockFromBling = exports.testBlingConnection = exports.getBlingProductsDetailed = exports.getBlingData = exports.checkOAuthStatus = exports.blingWebhook = exports.getBlingProductStock = exports.getBlingOrders = exports.getBlingProducts = exports.updateSyncConfig = exports.getSyncConfig = exports.syncOrderToBling = exports.syncAllProductsToBling = exports.syncProductToBling = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../config/prisma"));
const bling_service_1 = __importDefault(require("../services/bling.service"));
// Importar funções do script OAuth
const { makeAuthenticatedRequest, getCompanyInfo, getProducts, getCategories, getOrders, loadTokens, saveTokens, refreshAccessToken, isTokenExpired } = require('../../scripts/bling-oauth-complete');
// Helper function to serialize BigInt values for JSON
const serializeBigInt = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value));
};
// Schema para validação de webhook
const webhookSchema = zod_1.z.object({
    evento: zod_1.z.string(),
    dados: zod_1.z.object({
        id: zod_1.z.number(),
        numero: zod_1.z.string().optional(),
        situacao: zod_1.z.string().optional()
    }).passthrough()
});
// Schema para configuração de sincronização
const syncConfigSchema = zod_1.z.object({
    syncProducts: zod_1.z.boolean().optional(),
    syncOrders: zod_1.z.boolean().optional(),
    syncStock: zod_1.z.boolean().optional(),
    syncCustomers: zod_1.z.boolean().optional(),
    autoUpdateStock: zod_1.z.boolean().optional(),
    defaultCategory: zod_1.z.number().optional(),
    defaultStore: zod_1.z.number().optional()
});
// ===================
// SINCRONIZAÇÃO
// ===================
// Sincronizar produto específico para o Bling
const syncProductToBling = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const productId = parseInt(req.params.id);
        if (isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do produto inválido'
            });
        }
        // Buscar produto no banco local
        const product = yield prisma_1.default.product.findUnique({
            where: { id: productId },
            include: {
                category: true,
                images: true
            }
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }
        // Sincronizar com Bling
        const blingProduct = yield bling_service_1.default.syncProductToBling({
            id: product.id,
            name: product.name,
            code: product.id.toString(),
            price: product.price,
            active: true, // Assumindo que produtos ativos são sincronizados
            description: product.description,
            minStock: 0, // Campo não existe no schema atual
            imageUrl: product.imageUrl || ((_b = (_a = product.images) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.imageUrl),
            category: (_c = product.category) === null || _c === void 0 ? void 0 : _c.name
        });
        if (!blingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Erro ao sincronizar produto com Bling'
            });
        }
        // Salvar ID do Bling no produto local (se necessário)
        yield prisma_1.default.product.update({
            where: { id: productId },
            data: {
            // Você pode adicionar um campo blingId na tabela Product
            // blingId: blingProduct.id
            }
        });
        return res.json({
            success: true,
            message: 'Produto sincronizado com sucesso',
            blingProduct
        });
    }
    catch (error) {
        console.error('Erro ao sincronizar produto:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});
exports.syncProductToBling = syncProductToBling;
// Sincronizar todos os produtos para o Bling
const syncAllProductsToBling = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const products = yield prisma_1.default.product.findMany({
            where: { stock: { gte: 0 } }, // Buscar produtos com estoque >= 0
            include: {
                category: true,
                images: true
            }
        });
        const results = [];
        let successCount = 0;
        let errorCount = 0;
        for (const product of products) {
            try {
                const blingProduct = yield bling_service_1.default.syncProductToBling({
                    id: product.id,
                    name: product.name,
                    code: product.id.toString(),
                    price: product.price,
                    active: true, // Assumindo que produtos são ativos
                    description: product.description,
                    minStock: 0, // Campo não existe no schema atual
                    imageUrl: product.imageUrl || ((_b = (_a = product.images) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.imageUrl),
                    category: (_c = product.category) === null || _c === void 0 ? void 0 : _c.name
                });
                if (blingProduct) {
                    successCount++;
                    results.push({
                        productId: product.id,
                        productName: product.name,
                        blingId: blingProduct.id,
                        status: 'success'
                    });
                }
                else {
                    errorCount++;
                    results.push({
                        productId: product.id,
                        productName: product.name,
                        status: 'error',
                        message: 'Falha na sincronização'
                    });
                }
                // Delay para evitar rate limiting
                yield new Promise(resolve => setTimeout(resolve, 1000));
            }
            catch (error) {
                errorCount++;
                results.push({
                    productId: product.id,
                    productName: product.name,
                    status: 'error',
                    message: error.message
                });
            }
        }
        return res.json({
            success: true,
            message: `Sincronização concluída: ${successCount} sucessos, ${errorCount} erros`,
            summary: {
                total: products.length,
                success: successCount,
                errors: errorCount
            },
            results
        });
    }
    catch (error) {
        console.error('Erro ao sincronizar produtos:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});
exports.syncAllProductsToBling = syncAllProductsToBling;
// Sincronizar pedido específico para o Bling
const syncOrderToBling = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const orderId = parseInt(req.params.id);
        if (isNaN(orderId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do pedido inválido'
            });
        }
        // Buscar pedido no banco local
        const order = yield prisma_1.default.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Pedido não encontrado'
            });
        }
        // Sincronizar com Bling
        const blingOrder = yield bling_service_1.default.syncOrderToBling({
            id: order.id,
            total: order.total,
            customerName: ((_a = order.user) === null || _a === void 0 ? void 0 : _a.name) || order.customerName,
            customerEmail: ((_b = order.user) === null || _b === void 0 ? void 0 : _b.email) || order.customerEmail,
            customerPhone: order.customerPhone,
            customerDocument: '', // Campo não existe no schema atual
            shippingAddress: order.shippingAddress ? {
                street: order.shippingAddress,
                number: '',
                neighborhood: '',
                zipCode: '',
                city: '',
                state: ''
            } : undefined,
            items: (_c = order.items) === null || _c === void 0 ? void 0 : _c.map((item) => ({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.price
            })),
            notes: '' // Campo não existe no schema atual
        });
        if (!blingOrder) {
            return res.status(400).json({
                success: false,
                message: 'Erro ao sincronizar pedido com Bling'
            });
        }
        // Salvar ID do Bling no pedido local (se necessário)
        yield prisma_1.default.order.update({
            where: { id: orderId },
            data: {
            // Você pode adicionar um campo blingId na tabela Order
            // blingId: blingOrder.id
            }
        });
        return res.json({
            success: true,
            message: 'Pedido sincronizado com sucesso',
            blingOrder
        });
    }
    catch (error) {
        console.error('Erro ao sincronizar pedido:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});
exports.syncOrderToBling = syncOrderToBling;
// ===================
// CONFIGURAÇÕES
// ===================
// Obter configurações de sincronização
const getSyncConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const config = bling_service_1.default.getSyncConfig();
        return res.json({
            success: true,
            config
        });
    }
    catch (error) {
        console.error('Erro ao obter configurações:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});
exports.getSyncConfig = getSyncConfig;
// Atualizar configurações de sincronização
const updateSyncConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = syncConfigSchema.parse(req.body);
        bling_service_1.default.setSyncConfig(validatedData);
        return res.json({
            success: true,
            message: 'Configurações atualizadas com sucesso',
            config: bling_service_1.default.getSyncConfig()
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: error.errors
            });
        }
        console.error('Erro ao atualizar configurações:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});
exports.updateSyncConfig = updateSyncConfig;
// ===================
// CONSULTAS BLING
// ===================
// Listar produtos do Bling
const getBlingProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield bling_service_1.default.getAllProducts();
        // Serializar BigInt antes de enviar resposta
        const serializedProducts = serializeBigInt(products);
        res.json({ success: true, data: serializedProducts });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getBlingProducts = getBlingProducts;
// Listar pedidos do Bling
const getBlingOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const orders = yield bling_service_1.default.getOrders(page, limit);
        return res.json({
            success: true,
            orders: orders.data,
            pagination: {
                page: orders.pagina,
                limit: orders.limite,
                total: orders.total
            }
        });
    }
    catch (error) {
        console.error('Erro ao buscar pedidos do Bling:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar pedidos do Bling',
            error: error.message
        });
    }
});
exports.getBlingOrders = getBlingOrders;
// Obter estoque de um produto no Bling
const getBlingProductStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const productId = parseInt(req.params.id);
        if (isNaN(productId)) {
            return res.status(400).json({
                success: false,
                message: 'ID do produto inválido'
            });
        }
        const stock = yield bling_service_1.default.getProductStock(productId);
        return res.json({
            success: true,
            stock: stock.data
        });
    }
    catch (error) {
        console.error('Erro ao buscar estoque do Bling:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar estoque do Bling',
            error: error.message
        });
    }
});
exports.getBlingProductStock = getBlingProductStock;
// ===================
// WEBHOOKS
// ===================
// Processar webhook do Bling
const blingWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Webhook recebido do Bling:', req.body);
        // Validar dados do webhook
        const webhookData = webhookSchema.parse(req.body);
        // Processar webhook
        const result = bling_service_1.default.processWebhook(webhookData);
        // Processar diferentes tipos de eventos
        switch (result.event) {
            case 'pedido_venda_alterado':
                yield handleOrderStatusChange(result.data);
                break;
            case 'produto_alterado':
                yield handleProductChange(result.data);
                break;
            case 'estoque_alterado':
                yield handleStockChange(result.data);
                break;
            default:
                console.log(`Evento ${result.event} processado mas não requer ação específica`);
        }
        return res.status(200).json({
            success: true,
            message: 'Webhook processado com sucesso',
            event: result.event
        });
    }
    catch (error) {
        console.error('Erro ao processar webhook do Bling:', error);
        // Retornar 200 mesmo com erro para evitar reenvios desnecessários
        return res.status(200).json({
            success: false,
            message: 'Erro ao processar webhook',
            error: error.message
        });
    }
});
exports.blingWebhook = blingWebhook;
// ===================
// FUNÇÕES AUXILIARES
// ===================
// Processar alteração de status de pedido
function handleOrderStatusChange(orderData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Buscar pedido local pelo número ou ID do Bling
            const order = yield prisma_1.default.order.findFirst({
                where: {
                    OR: [
                        { id: orderData.numeroLoja ? parseInt(orderData.numeroLoja) : undefined },
                        // { blingId: orderData.id } // Se você tiver campo blingId
                    ]
                }
            });
            if (order) {
                const newStatus = bling_service_1.default.mapBlingStatusToSystemStatus(orderData.situacao);
                yield prisma_1.default.order.update({
                    where: { id: order.id },
                    data: { status: newStatus }
                });
                console.log(`Status do pedido ${order.id} atualizado para ${newStatus}`);
            }
            else {
                console.log(`Pedido ${orderData.numeroLoja || orderData.id} não encontrado localmente`);
            }
        }
        catch (error) {
            console.error('Erro ao processar alteração de pedido:', error);
        }
    });
}
// Processar alteração de produto
function handleProductChange(productData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Buscar produto local pelo código ou ID do Bling
            const product = yield prisma_1.default.product.findFirst({
                where: {
                    OR: [
                        { id: productData.codigo ? parseInt(productData.codigo) : undefined },
                        // { blingId: productData.id } // Se você tiver campo blingId
                    ]
                }
            });
            if (product) {
                console.log(`Produto ${product.id} foi alterado no Bling`);
                // Aqui você pode implementar a sincronização reversa se necessário
            }
            else {
                console.log(`Produto ${productData.codigo || productData.id} não encontrado localmente`);
            }
        }
        catch (error) {
            console.error('Erro ao processar alteração de produto:', error);
        }
    });
}
// Processar alteração de estoque
function handleStockChange(stockData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Buscar produto local
            const product = yield prisma_1.default.product.findFirst({
                where: {
                    OR: [
                        { id: stockData.codigo ? parseInt(stockData.codigo) : undefined },
                        // { blingId: stockData.id } // Se você tiver campo blingId
                    ]
                }
            });
            if (product && bling_service_1.default.getSyncConfig().autoUpdateStock) {
                // Obter estoque atual do Bling
                const blingStock = yield bling_service_1.default.getProductStock(stockData.id);
                if (blingStock.data && typeof blingStock.data.saldo === 'number') {
                    yield prisma_1.default.product.update({
                        where: { id: product.id },
                        data: { stock: blingStock.data.saldo }
                    });
                    console.log(`Estoque do produto ${product.id} atualizado para ${blingStock.data.saldo}`);
                }
            }
        }
        catch (error) {
            console.error('Erro ao processar alteração de estoque:', error);
        }
    });
}
// ===================
// OAUTH E TESTES
// ===================
// Verificar status da autenticação OAuth
const checkOAuthStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokens = loadTokens();
        if (!tokens) {
            return res.json({
                success: false,
                authenticated: false,
                message: 'Nenhum token OAuth encontrado. Execute a autenticação primeiro.',
                authUrl: 'Execute: node scripts/bling-oauth-complete.js'
            });
        }
        if (isTokenExpired(tokens)) {
            return res.json({
                success: false,
                authenticated: false,
                expired: true,
                message: 'Token OAuth expirado. Execute a autenticação novamente.',
                authUrl: 'Execute: node scripts/bling-oauth-complete.js'
            });
        }
        return res.json({
            success: true,
            authenticated: true,
            message: 'Autenticação OAuth válida',
            tokenInfo: {
                expiresAt: new Date(tokens.expires_at),
                tokenType: tokens.token_type,
                hasRefreshToken: !!tokens.refresh_token
            }
        });
    }
    catch (error) {
        console.error('Erro ao verificar status OAuth:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});
exports.checkOAuthStatus = checkOAuthStatus;
// Obter dados completos do Bling (empresa, produtos, pedidos, etc.)
const getBlingData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        // Verificar autenticação
        const tokens = loadTokens();
        if (!tokens || isTokenExpired(tokens)) {
            return res.status(401).json({
                success: false,
                message: 'Token OAuth inválido ou expirado. Execute a autenticação primeiro.',
                authRequired: true
            });
        }
        const { includeCompany = true, includeProducts = true, includeCategories = true, includeOrders = true, includeContacts = true, includeStock = true, productLimit = 20, orderLimit = 10, contactLimit = 10 } = req.query;
        const data = {
            timestamp: new Date().toISOString(),
            authenticated: true
        };
        // Obter informações da empresa
        if (includeCompany === 'true') {
            try {
                const response = yield makeAuthenticatedRequest('/empresas');
                if (response && response.statusCode === 200) {
                    const companies = response.data.data || response.data;
                    data.company = Array.isArray(companies) && companies.length > 0 ? companies[0] : null;
                }
            }
            catch (error) {
                console.error('Erro ao obter empresa:', error);
                data.company = { error: 'Erro ao obter dados da empresa' };
            }
        }
        // Obter produtos
        if (includeProducts === 'true') {
            try {
                const response = yield makeAuthenticatedRequest(`/produtos?limite=${productLimit}&pagina=1`);
                if (response && response.statusCode === 200) {
                    data.products = {
                        items: response.data.data || response.data,
                        pagination: response.data.pagination || null
                    };
                }
            }
            catch (error) {
                console.error('Erro ao obter produtos:', error);
                data.products = { error: 'Erro ao obter produtos' };
            }
        }
        // Obter categorias
        if (includeCategories === 'true') {
            try {
                const response = yield makeAuthenticatedRequest('/categorias');
                if (response && response.statusCode === 200) {
                    data.categories = {
                        items: response.data.data || response.data,
                        pagination: response.data.pagination || null
                    };
                }
            }
            catch (error) {
                console.error('Erro ao obter categorias:', error);
                data.categories = { error: 'Erro ao obter categorias' };
            }
        }
        // Obter pedidos
        if (includeOrders === 'true') {
            try {
                const response = yield makeAuthenticatedRequest(`/pedidos/vendas?limite=${orderLimit}&pagina=1`);
                if (response && response.statusCode === 200) {
                    data.orders = {
                        items: response.data.data || response.data,
                        pagination: response.data.pagination || null
                    };
                }
            }
            catch (error) {
                console.error('Erro ao obter pedidos:', error);
                data.orders = { error: 'Erro ao obter pedidos' };
            }
        }
        // Obter contatos
        if (includeContacts === 'true') {
            try {
                const response = yield makeAuthenticatedRequest(`/contatos?limite=${contactLimit}&pagina=1`);
                if (response && response.statusCode === 200) {
                    data.contacts = {
                        items: response.data.data || response.data,
                        pagination: response.data.pagination || null
                    };
                }
            }
            catch (error) {
                console.error('Erro ao obter contatos:', error);
                data.contacts = { error: 'Erro ao obter contatos' };
            }
        }
        // Obter estoque
        if (includeStock === 'true') {
            try {
                const response = yield makeAuthenticatedRequest('/estoques');
                if (response && response.statusCode === 200) {
                    data.stock = {
                        items: response.data.data || response.data,
                        pagination: response.data.pagination || null
                    };
                }
            }
            catch (error) {
                console.error('Erro ao obter estoque:', error);
                data.stock = { error: 'Erro ao obter estoque' };
            }
        }
        // Estatísticas resumidas
        data.summary = {
            companyConfigured: !!data.company && !data.company.error,
            totalProducts: ((_b = (_a = data.products) === null || _a === void 0 ? void 0 : _a.items) === null || _b === void 0 ? void 0 : _b.length) || 0,
            totalCategories: ((_d = (_c = data.categories) === null || _c === void 0 ? void 0 : _c.items) === null || _d === void 0 ? void 0 : _d.length) || 0,
            totalOrders: ((_f = (_e = data.orders) === null || _e === void 0 ? void 0 : _e.items) === null || _f === void 0 ? void 0 : _f.length) || 0,
            totalContacts: ((_h = (_g = data.contacts) === null || _g === void 0 ? void 0 : _g.items) === null || _h === void 0 ? void 0 : _h.length) || 0,
            totalStockItems: ((_k = (_j = data.stock) === null || _j === void 0 ? void 0 : _j.items) === null || _k === void 0 ? void 0 : _k.length) || 0
        };
        return res.json({
            success: true,
            message: 'Dados do Bling obtidos com sucesso',
            data
        });
    }
    catch (error) {
        console.error('Erro ao obter dados do Bling:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});
exports.getBlingData = getBlingData;
// Obter apenas produtos do Bling com filtros
const getBlingProductsDetailed = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticação
        const tokens = loadTokens();
        if (!tokens || isTokenExpired(tokens)) {
            return res.status(401).json({
                success: false,
                message: 'Token OAuth inválido ou expirado',
                authRequired: true
            });
        }
        const { page = 1, limit = 20, search = '', category = '', active = '' } = req.query;
        let endpoint = `/produtos?limite=${limit}&pagina=${page}`;
        // Adicionar filtros se fornecidos
        if (search)
            endpoint += `&pesquisa=${encodeURIComponent(search)}`;
        if (category)
            endpoint += `&categoria=${category}`;
        if (active)
            endpoint += `&situacao=${active === 'true' ? 'Ativo' : 'Inativo'}`;
        const response = yield makeAuthenticatedRequest(endpoint);
        if (response && response.statusCode === 200) {
            const products = response.data.data || response.data;
            const pagination = response.data.pagination || null;
            // Enriquecer dados dos produtos
            const enrichedProducts = products.map((product) => {
                var _a, _b, _c, _d, _e;
                return ({
                    id: product.id,
                    name: product.nome,
                    code: product.codigo,
                    price: product.preco,
                    stock: ((_b = (_a = product.estoques) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.saldoFisico) || 0,
                    virtualStock: ((_d = (_c = product.estoques) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.saldoVirtual) || 0,
                    category: ((_e = product.categoria) === null || _e === void 0 ? void 0 : _e.descricao) || 'Sem categoria',
                    active: product.situacao === 'Ativo',
                    imageUrl: product.imagemURL || null,
                    description: product.descricao || '',
                    createdAt: product.dataCriacao,
                    updatedAt: product.dataAlteracao
                });
            });
            return res.json({
                success: true,
                message: `${enrichedProducts.length} produtos encontrados`,
                data: {
                    products: enrichedProducts,
                    pagination,
                    filters: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        search,
                        category,
                        active
                    }
                }
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Erro ao obter produtos do Bling',
                statusCode: response === null || response === void 0 ? void 0 : response.statusCode
            });
        }
    }
    catch (error) {
        console.error('Erro ao obter produtos detalhados:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});
exports.getBlingProductsDetailed = getBlingProductsDetailed;
// Testar conectividade com Bling
const testBlingConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar autenticação
        const tokens = loadTokens();
        if (!tokens) {
            return res.json({
                success: false,
                connected: false,
                message: 'Nenhum token OAuth encontrado',
                authRequired: true
            });
        }
        if (isTokenExpired(tokens)) {
            return res.json({
                success: false,
                connected: false,
                message: 'Token OAuth expirado',
                expired: true,
                authRequired: true
            });
        }
        // Testar conexão fazendo uma requisição simples
        const response = yield makeAuthenticatedRequest('/empresas');
        if (response && response.statusCode === 200) {
            const companies = response.data.data || response.data;
            const company = Array.isArray(companies) && companies.length > 0 ? companies[0] : null;
            return res.json({
                success: true,
                connected: true,
                message: 'Conexão com Bling estabelecida com sucesso',
                data: {
                    apiStatus: 'OK',
                    responseTime: new Date().toISOString(),
                    company: company ? {
                        name: company.nome,
                        email: company.email,
                        id: company.id
                    } : null,
                    tokenInfo: {
                        type: tokens.token_type,
                        expiresAt: new Date(tokens.expires_at),
                        hasRefreshToken: !!tokens.refresh_token
                    }
                }
            });
        }
        else {
            return res.json({
                success: false,
                connected: false,
                message: 'Falha na conexão com Bling',
                statusCode: response === null || response === void 0 ? void 0 : response.statusCode,
                error: response === null || response === void 0 ? void 0 : response.data
            });
        }
    }
    catch (error) {
        console.error('Erro ao testar conexão:', error);
        return res.status(500).json({
            success: false,
            connected: false,
            message: 'Erro ao testar conexão com Bling',
            error: error.message
        });
    }
});
exports.testBlingConnection = testBlingConnection;
// Sincronizar estoque específico do Bling para o sistema local
const syncStockFromBling = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { productId } = req.params;
        // Verificar autenticação
        const tokens = loadTokens();
        if (!tokens || isTokenExpired(tokens)) {
            return res.status(401).json({
                success: false,
                message: 'Token OAuth inválido ou expirado',
                authRequired: true
            });
        }
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'ID do produto é obrigatório'
            });
        }
        // Buscar produto no Bling
        const response = yield makeAuthenticatedRequest(`/produtos/${productId}`);
        if (response && response.statusCode === 200) {
            const blingProduct = response.data.data || response.data;
            // Buscar produto local correspondente
            const localProduct = yield prisma_1.default.product.findFirst({
                where: {
                    OR: [
                        { id: parseInt(productId) },
                        { name: blingProduct.nome }
                    ]
                }
            });
            if (!localProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Produto não encontrado no sistema local'
                });
            }
            // Atualizar estoque local com dados do Bling
            const newStock = ((_b = (_a = blingProduct.estoques) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.saldoFisico) || 0;
            const updatedProduct = yield prisma_1.default.product.update({
                where: { id: localProduct.id },
                data: {
                    stock: newStock,
                    price: blingProduct.preco || localProduct.price
                }
            });
            return res.json({
                success: true,
                message: 'Estoque sincronizado com sucesso',
                data: {
                    productId: localProduct.id,
                    productName: localProduct.name,
                    oldStock: localProduct.stock,
                    newStock: newStock,
                    blingData: {
                        id: blingProduct.id,
                        name: blingProduct.nome,
                        price: blingProduct.preco,
                        stock: newStock
                    }
                }
            });
        }
        else {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado no Bling'
            });
        }
    }
    catch (error) {
        console.error('Erro ao sincronizar estoque:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});
exports.syncStockFromBling = syncStockFromBling;
