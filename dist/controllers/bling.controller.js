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
exports.blingWebhook = exports.getBlingProductStock = exports.getBlingOrders = exports.getBlingProducts = exports.updateSyncConfig = exports.getSyncConfig = exports.syncOrderToBling = exports.syncAllProductsToBling = exports.syncProductToBling = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../config/prisma"));
const bling_service_1 = __importDefault(require("../services/bling.service"));
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const products = yield bling_service_1.default.getProducts(page, limit);
        return res.json({
            success: true,
            products: products.data,
            pagination: {
                page: products.pagina,
                limit: products.limite,
                total: products.total
            }
        });
    }
    catch (error) {
        console.error('Erro ao buscar produtos do Bling:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao buscar produtos do Bling',
            error: error.message
        });
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
