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
exports.reduceStockOnPaymentApproved = exports.testReduceStock = exports.getStockInfo = exports.checkGuestOrderPaymentStatus = exports.createGuestOrder = exports.getGuestOrderById = exports.addShipmentUpdate = exports.updateTrackingInfo = exports.getOrderTracking = exports.adminUpdateOrderStatus = exports.updateOrderStatus = exports.cancelExpiredOrders = exports.createOrder = exports.getOrderById = exports.getUserOrders = exports.getAllOrders = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const mercadopago_service_1 = __importDefault(require("../services/mercadopago.service"));
const websocket_service_1 = __importDefault(require("../services/websocket.service"));
const prisma = new client_1.PrismaClient();
// Schema de validação para o item do pedido
const orderItemSchema = zod_1.z.object({
    productId: zod_1.z.number().int().positive(),
    quantity: zod_1.z.number().int().positive(),
    price: zod_1.z.number().positive(),
});
// Schema de validação para criação de pedido
const orderCreateSchema = zod_1.z.object({
    items: zod_1.z.array(orderItemSchema).nonempty('O pedido deve ter pelo menos um item'),
});
// Schema de validação para atualização de status do pedido
const orderUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELED']),
});
// Schema para atualização administrativa de status (apenas status)
const adminOrderUpdateSchema = zod_1.z.object({
    orderId: zod_1.z.number().int().positive(),
    status: zod_1.z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELED']),
});
// Schema for shipment update
const shipmentUpdateSchema = zod_1.z.object({
    status: zod_1.z.string(),
    location: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
// Schema for updating tracking information
const trackingUpdateSchema = zod_1.z.object({
    trackingNumber: zod_1.z.string().optional(),
    shippingCarrier: zod_1.z.string().optional(),
    estimatedDelivery: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
    departureDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
    currentLocation: zod_1.z.string().optional(),
    status: zod_1.z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELED']).optional(),
});
// Schema para pedido de convidado
const guestOrderCreateSchema = zod_1.z.object({
    items: zod_1.z.array(orderItemSchema).nonempty('O pedido deve ter pelo menos um item'),
    customerEmail: zod_1.z.string().email('Email inválido'),
    customerName: zod_1.z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    customerPhone: zod_1.z.string().optional(),
    shippingAddress: zod_1.z.object({
        name: zod_1.z.string(),
        street: zod_1.z.string(),
        number: zod_1.z.string(),
        complement: zod_1.z.string().optional(),
        neighborhood: zod_1.z.string(),
        city: zod_1.z.string(),
        state: zod_1.z.string(),
        zipCode: zod_1.z.string(),
        cpfCnpj: zod_1.z.string().optional()
    }),
    paymentMethod: zod_1.z.enum(['PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD']),
    total: zod_1.z.number().optional()
});
// Obter todos os pedidos (admin)
const getAllOrders = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield prisma.order.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                items: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json(orders);
    }
    catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        return res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
});
exports.getAllOrders = getAllOrders;
// Obter pedidos do usuário logado
const getUserOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const userId = req.user.id;
        const orders = yield prisma.order.findMany({
            where: { userId },
            include: {
                items: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json(orders);
    }
    catch (error) {
        console.error('Erro ao buscar pedidos do usuário:', error);
        return res.status(500).json({ error: 'Erro ao buscar pedidos' });
    }
});
exports.getUserOrders = getUserOrders;
// Obter pedido por ID
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const { id } = req.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const order = yield prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                items: true,
            },
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Verificar se o usuário é admin ou o dono do pedido
        if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        return res.json(order);
    }
    catch (error) {
        console.error('Erro ao buscar pedido:', error);
        return res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
});
exports.getOrderById = getOrderById;
// Criar pedido
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const userId = req.user.id;
        const validation = orderCreateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }
        const { items } = validation.data;
        // Verificar disponibilidade dos produtos
        const productIds = items.map(item => item.productId);
        const products = yield prisma.product.findMany({
            where: {
                id: {
                    in: productIds,
                },
            },
        });
        // Verificar se todos os produtos existem
        if (products.length !== productIds.length) {
            return res.status(400).json({ error: 'Um ou mais produtos não existem' });
        }
        // ✅ VERIFICAR ESTOQUE DISPONÍVEL (considerando reservas)
        const stockCheck = yield checkStockAvailability(items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            variantId: undefined // Por enquanto, sem variantes nesta função
        })));
        if (!stockCheck.allSufficient) {
            const insufficientDetails = stockCheck.insufficientItems.map(item => ({
                productId: item.productId,
                requested: item.requested,
                available: item.available
            }));
            return res.status(400).json({
                error: 'Estoque insuficiente',
                message: 'Um ou mais produtos não possuem estoque suficiente disponível',
                details: insufficientDetails
            });
        }
        console.log(`✅ Verificação de estoque aprovada para pedido do usuário ${userId}:`, stockCheck.stockChecks);
        // Calcular total do pedido
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        // Criar pedido com transaction para garantir consistência
        const newOrder = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Criar o pedido
            const order = yield tx.order.create({
                data: {
                    userId,
                    total,
                    status: 'PENDING',
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });
            // Atualizar estoque dos produtos
            for (const item of items) {
                yield tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity,
                        },
                    },
                });
            }
            return order;
        }));
        // Notificar via WebSocket sobre novo pedido
        try {
            websocket_service_1.default.notifyOrderCreated({
                id: newOrder.id,
                customerName: 'Cliente',
                total: newOrder.total,
                status: newOrder.status,
                createdAt: newOrder.createdAt
            });
        }
        catch (error) {
            console.error('Erro ao enviar notificação WebSocket:', error);
        }
        return res.status(201).json(newOrder);
    }
    catch (error) {
        console.error('Erro ao criar pedido:', error);
        return res.status(500).json({ error: 'Erro ao criar pedido' });
    }
});
exports.createOrder = createOrder;
// ==========================================
// GESTÃO DE ESTOQUE - FUNÇÕES AUXILIARES
// ==========================================
/**
 * Calcular estoque disponível considerando reservas (pedidos PENDING)
 */
const getAvailableStock = (productId, variantId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Buscar produto ou variante
        let totalStock = 0;
        if (variantId) {
            const variant = yield prisma.productVariant.findUnique({
                where: { id: variantId }
            });
            totalStock = (variant === null || variant === void 0 ? void 0 : variant.stock) || 0;
        }
        else {
            const product = yield prisma.product.findUnique({
                where: { id: productId }
            });
            totalStock = (product === null || product === void 0 ? void 0 : product.stock) || 0;
        }
        // Calcular quantidade reservada (em pedidos PENDING)
        const pendingOrders = yield prisma.orderItem.findMany({
            where: Object.assign(Object.assign({ productId }, (variantId && { productVariantId: variantId })), { order: {
                    status: 'PENDING'
                } }),
            select: {
                quantity: true
            }
        });
        const reservedStock = pendingOrders.reduce((sum, item) => sum + item.quantity, 0);
        const availableStock = Math.max(0, totalStock - reservedStock);
        return {
            totalStock,
            reservedStock,
            availableStock
        };
    }
    catch (error) {
        console.error('❌ Erro ao calcular estoque disponível:', error);
        return {
            totalStock: 0,
            reservedStock: 0,
            availableStock: 0
        };
    }
});
/**
 * Verificar se há estoque suficiente para todos os itens do pedido
 */
const checkStockAvailability = (items) => __awaiter(void 0, void 0, void 0, function* () {
    const stockChecks = [];
    for (const item of items) {
        const stockInfo = yield getAvailableStock(item.productId, item.variantId);
        stockChecks.push({
            productId: item.productId,
            variantId: item.variantId,
            requested: item.quantity,
            available: stockInfo.availableStock,
            sufficient: stockInfo.availableStock >= item.quantity
        });
    }
    const allSufficient = stockChecks.every(check => check.sufficient);
    const insufficientItems = stockChecks.filter(check => !check.sufficient);
    return {
        allSufficient,
        stockChecks,
        insufficientItems
    };
});
/**
 * Confirmar estoque - remove definitivamente do estoque quando pagamento é confirmado
 */
const confirmStockReservation = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`✅ Confirmando reserva de estoque para pedido ${orderId}`);
        const order = yield prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true
            }
        });
        if (!order) {
            console.error(`❌ Pedido ${orderId} não encontrado para confirmação de estoque`);
            return false;
        }
        // Se o pedido já foi PAID, o estoque já deve ter sido confirmado
        // Esta função é mais para casos onde queremos confirmar explicitamente
        console.log(`📦 Estoque do pedido ${orderId} já foi processado durante a criação`);
        return true;
    }
    catch (error) {
        console.error(`❌ Erro ao confirmar estoque do pedido ${orderId}:`, error);
        return false;
    }
});
/**
 * Restaurar estoque quando pedido é cancelado
 */
const restoreStockFromOrder = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`🔄 Iniciando restauração de estoque para pedido ${orderId}`);
        // Buscar pedido com itens
        const order = yield prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: true,
                        productVariant: true
                    }
                }
            }
        });
        if (!order) {
            console.error(`❌ Pedido ${orderId} não encontrado para restauração de estoque`);
            return false;
        }
        if (order.status !== 'CANCELED') {
            console.warn(`⚠️ Tentativa de restaurar estoque para pedido ${orderId} com status ${order.status}`);
            return false;
        }
        // Restaurar estoque usando transação
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            for (const item of order.items) {
                if (item.productVariantId && item.productVariant) {
                    // Restaurar estoque da variante
                    yield tx.productVariant.update({
                        where: { id: item.productVariantId },
                        data: {
                            stock: {
                                increment: item.quantity
                            }
                        }
                    });
                    console.log(`✅ Estoque da variante ${item.productVariantId} restaurado: +${item.quantity}`);
                }
                else {
                    // Restaurar estoque do produto principal
                    yield tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: {
                                increment: item.quantity
                            }
                        }
                    });
                    console.log(`✅ Estoque do produto ${item.productId} restaurado: +${item.quantity}`);
                }
            }
            // Marcar que o estoque foi restaurado para evitar duplicações
            yield tx.order.update({
                where: { id: orderId },
                data: {
                    // Adicionar campo de controle se existir no schema
                    updatedAt: new Date()
                }
            });
        }));
        console.log(`✅ Estoque restaurado com sucesso para pedido ${orderId}`);
        return true;
    }
    catch (error) {
        console.error(`❌ Erro ao restaurar estoque do pedido ${orderId}:`, error);
        return false;
    }
});
/**
 * Verificar se pedido pode ter estoque restaurado
 */
const canRestoreStock = (currentStatus, newStatus) => {
    // Só restaurar estoque se:
    // 1. Status atual não for CANCELED
    // 2. Novo status for CANCELED
    // 3. Status atual for PENDING (não pagos ainda)
    const allowedCurrentStatuses = ['PENDING', 'PAID']; // Permitir restaurar mesmo pedidos já pagos se cancelados
    const restoreStatuses = ['CANCELED'];
    return allowedCurrentStatuses.includes(currentStatus) && restoreStatuses.includes(newStatus);
};
/**
 * Cancelar pedidos expirados e restaurar estoque
 * Cancela pedidos PENDING que estão há mais de X horas sem pagamento
 */
const cancelExpiredOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { dryRun = 'false', hoursLimit = '24' } = req.query;
        const isDryRun = dryRun === 'true';
        const expirationHours = parseInt(hoursLimit) || 24;
        console.log(`🔍 Buscando pedidos expirados (${expirationHours}h) - ${isDryRun ? 'DRY RUN' : 'EXECUTAR'}`);
        // Calcular data limite (pedidos mais antigos que X horas)
        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() - expirationHours);
        // Buscar pedidos PENDING expirados
        const expiredOrders = yield prisma.order.findMany({
            where: {
                status: 'PENDING',
                createdAt: {
                    lt: expirationDate
                }
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true }
                        },
                        productVariant: {
                            select: { id: true, size: true }
                        }
                    }
                }
            }
        });
        console.log(`📊 Encontrados ${expiredOrders.length} pedidos expirados`);
        if (expiredOrders.length === 0) {
            return res.json({
                success: true,
                message: 'Nenhum pedido expirado encontrado',
                processed: 0,
                dryRun: isDryRun
            });
        }
        let processedCount = 0;
        const results = [];
        if (!isDryRun) {
            // Processar cada pedido expirado
            for (const order of expiredOrders) {
                try {
                    yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                        // 1. Atualizar status para CANCELED
                        yield tx.order.update({
                            where: { id: order.id },
                            data: {
                                status: 'CANCELED',
                                updatedAt: new Date()
                            }
                        });
                        // 2. Restaurar estoque
                        for (const item of order.items) {
                            if (item.productVariantId) {
                                // Restaurar estoque da variante
                                yield tx.productVariant.update({
                                    where: { id: item.productVariantId },
                                    data: {
                                        stock: {
                                            increment: item.quantity
                                        }
                                    }
                                });
                            }
                            else {
                                // Restaurar estoque do produto principal
                                yield tx.product.update({
                                    where: { id: item.productId },
                                    data: {
                                        stock: {
                                            increment: item.quantity
                                        }
                                    }
                                });
                            }
                        }
                    }));
                    processedCount++;
                    results.push({
                        orderId: order.id,
                        customerEmail: order.customerEmail || 'N/A',
                        total: order.total,
                        itemsCount: order.items.length,
                        status: 'processed'
                    });
                    console.log(`✅ Pedido ${order.id} cancelado e estoque restaurado`);
                }
                catch (error) {
                    console.error(`❌ Erro ao processar pedido ${order.id}:`, error);
                    results.push({
                        orderId: order.id,
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Erro desconhecido'
                    });
                }
            }
        }
        else {
            // Modo DRY RUN - apenas listar o que seria processado
            for (const order of expiredOrders) {
                results.push({
                    orderId: order.id,
                    customerEmail: order.customerEmail || 'N/A',
                    total: order.total,
                    createdAt: order.createdAt,
                    itemsCount: order.items.length,
                    status: 'would_be_cancelled'
                });
            }
            processedCount = expiredOrders.length;
        }
        return res.json({
            success: true,
            message: isDryRun
                ? `${expiredOrders.length} pedidos seriam cancelados`
                : `${processedCount} pedidos cancelados e estoque restaurado`,
            processed: processedCount,
            total: expiredOrders.length,
            expirationHours,
            dryRun: isDryRun,
            results
        });
    }
    catch (error) {
        console.error('❌ Erro ao cancelar pedidos expirados:', error);
        return res.status(500).json({
            error: 'Erro ao processar pedidos expirados',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
exports.cancelExpiredOrders = cancelExpiredOrders;
// Atualizar status do pedido (admin)
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const validation = orderUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }
        const { status } = validation.data;
        // Verificar se o pedido existe
        const currentOrder = yield prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true
            }
        });
        if (!currentOrder) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // ✅ LÓGICA DE RESTAURAÇÃO DE ESTOQUE
        const shouldRestoreStock = canRestoreStock(currentOrder.status, status);
        if (shouldRestoreStock) {
            console.log(`🔄 Pedido ${orderId}: ${currentOrder.status} → ${status} - Restaurando estoque`);
        }
        // Atualizar status do pedido
        const updatedOrder = yield prisma.order.update({
            where: { id: orderId },
            data: { status },
            include: {
                items: true,
            },
        });
        // ✅ RESTAURAR ESTOQUE SE NECESSÁRIO (após atualizar status)
        if (shouldRestoreStock) {
            const restored = yield restoreStockFromOrder(orderId);
            if (!restored) {
                console.error(`❌ Falha ao restaurar estoque do pedido ${orderId}`);
                // Não falhar a operação, apenas registrar o erro
            }
        }
        // Notificar via WebSocket sobre mudança de status
        try {
            websocket_service_1.default.notifyOrderStatusChanged(updatedOrder, currentOrder.status);
            // Notificação especial para pedidos pagos
            if (status === 'PAID' && currentOrder.status !== 'PAID') {
                websocket_service_1.default.notifyOrderPaid({
                    id: updatedOrder.id,
                    customerName: 'Cliente',
                    total: updatedOrder.total,
                    paymentMethod: updatedOrder.paymentMethod || 'Não informado'
                });
            }
        }
        catch (error) {
            console.error('Erro ao enviar notificação WebSocket:', error);
        }
        return res.json(Object.assign(Object.assign({}, updatedOrder), { stockRestored: shouldRestoreStock }));
    }
    catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        return res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
});
exports.updateOrderStatus = updateOrderStatus;
// Endpoint para administrador atualizar status do pedido (compatível com a API do frontend)
const adminUpdateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user || req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Acesso restrito a administradores' });
        }
        const validation = adminOrderUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }
        const { orderId, status } = validation.data;
        // Verificar se o pedido existe
        const currentOrder = yield prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: true
            }
        });
        if (!currentOrder) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // ✅ LÓGICA DE RESTAURAÇÃO DE ESTOQUE PARA ADMIN
        const shouldRestoreStock = canRestoreStock(currentOrder.status, status);
        if (shouldRestoreStock) {
            console.log(`🔄 [ADMIN] Pedido ${orderId}: ${currentOrder.status} → ${status} - Restaurando estoque`);
        }
        // Atualizar status do pedido
        const updatedOrder = yield prisma.order.update({
            where: { id: orderId },
            data: { status },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                items: true,
            },
        });
        // ✅ RESTAURAR ESTOQUE SE NECESSÁRIO (após atualizar status)
        if (shouldRestoreStock) {
            const restored = yield restoreStockFromOrder(orderId);
            if (!restored) {
                console.error(`❌ [ADMIN] Falha ao restaurar estoque do pedido ${orderId}`);
                // Não falhar a operação, apenas registrar o erro
            }
        }
        // Notificar via WebSocket sobre mudança de status (admin)
        try {
            websocket_service_1.default.notifyOrderStatusChanged(updatedOrder, currentOrder.status);
            // Notificação especial para pedidos pagos
            if (status === 'PAID' && currentOrder.status !== 'PAID') {
                websocket_service_1.default.notifyOrderPaid({
                    id: updatedOrder.id,
                    customerName: updatedOrder.customerName || 'Cliente',
                    total: updatedOrder.total,
                    paymentMethod: updatedOrder.paymentMethod || 'Não informado'
                });
            }
        }
        catch (error) {
            console.error('Erro ao enviar notificação WebSocket:', error);
        }
        return res.json(Object.assign(Object.assign({}, updatedOrder), { stockRestored: shouldRestoreStock }));
    }
    catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        return res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
    }
});
exports.adminUpdateOrderStatus = adminUpdateOrderStatus;
// Get order tracking information
const getOrderTracking = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const { id } = req.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const order = yield prisma.order.findUnique({
            where: { id: orderId },
            include: {
                trackingUpdates: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                },
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Verificar se o usuário é admin ou o dono do pedido
        if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
            return res.status(403).json({ error: 'Acesso negado' });
        }
        // Calcula tempo estimado de entrega com base no status
        let estimatedDeliveryText = 'Não disponível';
        let progressPercentage = 0;
        if (order.estimatedDelivery) {
            estimatedDeliveryText = new Date(order.estimatedDelivery).toLocaleDateString('pt-BR');
        }
        // Calcula o progresso da entrega baseado no status
        switch (order.status) {
            case 'PENDING':
                progressPercentage = 0;
                break;
            case 'PAID':
                progressPercentage = 10;
                break;
            case 'PROCESSING':
                progressPercentage = 25;
                break;
            case 'SHIPPED':
                progressPercentage = 40;
                break;
            case 'IN_TRANSIT':
                progressPercentage = 60;
                break;
            case 'OUT_FOR_DELIVERY':
                progressPercentage = 80;
                break;
            case 'DELIVERED':
                progressPercentage = 100;
                break;
            case 'CANCELED':
                progressPercentage = 0;
                break;
        }
        return res.json({
            order,
            trackingInfo: {
                trackingNumber: order.trackingNumber || 'Não disponível',
                shippingCarrier: order.shippingCarrier || 'Não disponível',
                estimatedDelivery: estimatedDeliveryText,
                departureDate: order.departureDate ? new Date(order.departureDate).toLocaleDateString('pt-BR') : 'Não disponível',
                currentLocation: order.currentLocation || 'Não disponível',
                status: order.status,
                progressPercentage,
            },
        });
    }
    catch (error) {
        console.error('Erro ao buscar informações de rastreio:', error);
        return res.status(500).json({ error: 'Erro ao buscar informações de rastreio' });
    }
});
exports.getOrderTracking = getOrderTracking;
// Update tracking information (admin)
const updateTrackingInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const validation = trackingUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }
        const updateData = validation.data;
        // Verificar se o pedido existe
        const orderExists = yield prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!orderExists) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Atualizar informações de rastreamento
        const updatedOrder = yield prisma.order.update({
            where: { id: orderId },
            data: updateData,
            include: {
                trackingUpdates: {
                    orderBy: {
                        timestamp: 'desc',
                    },
                },
            },
        });
        return res.json(updatedOrder);
    }
    catch (error) {
        console.error('Erro ao atualizar informações de rastreio:', error);
        return res.status(500).json({ error: 'Erro ao atualizar informações de rastreio' });
    }
});
exports.updateTrackingInfo = updateTrackingInfo;
// Add shipment update (admin)
const addShipmentUpdate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const validation = shipmentUpdateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }
        const { status, location, description } = validation.data;
        // Verificar se o pedido existe
        const orderExists = yield prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!orderExists) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Criar atualização de envio
        const shipmentUpdate = yield prisma.shipmentUpdate.create({
            data: {
                orderId,
                status,
                location,
                description,
            },
        });
        // Atualizar localização atual do pedido
        if (location) {
            yield prisma.order.update({
                where: { id: orderId },
                data: {
                    currentLocation: location,
                },
            });
        }
        return res.status(201).json(shipmentUpdate);
    }
    catch (error) {
        console.error('Erro ao adicionar atualização de envio:', error);
        return res.status(500).json({ error: 'Erro ao adicionar atualização de envio' });
    }
});
exports.addShipmentUpdate = addShipmentUpdate;
// Buscar pedido de convidado por ID
const getGuestOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const orderId = Number(id);
        if (isNaN(orderId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const order = yield prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Verificar se é um pedido de convidado (não tem userId)
        if (order.userId !== null) {
            return res.status(403).json({ error: 'Este pedido requer autenticação' });
        }
        // Parse do endereço de entrega
        let parsedShippingAddress = '';
        if (order.shippingAddress) {
            try {
                const address = JSON.parse(order.shippingAddress);
                parsedShippingAddress = `${address.street}, ${address.number}${address.complement ? `, ${address.complement}` : ''}, ${address.neighborhood}, ${address.city} - ${address.state}, CEP: ${address.zipCode}`;
            }
            catch (_a) {
                parsedShippingAddress = order.shippingAddress;
            }
        }
        const orderResponse = Object.assign(Object.assign({}, order), { shippingAddress: parsedShippingAddress });
        return res.json(orderResponse);
    }
    catch (error) {
        console.error('Erro ao buscar pedido de convidado:', error);
        return res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
});
exports.getGuestOrderById = getGuestOrderById;
// Criar pedido para usuário não autenticado (guest)
const createGuestOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validation = guestOrderCreateSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }
        const { items, customerEmail, customerName, customerPhone, shippingAddress, paymentMethod, total: sentTotal } = validation.data;
        // Verificar disponibilidade dos produtos
        const productIds = items.map(item => item.productId);
        const products = yield prisma.product.findMany({
            where: {
                id: {
                    in: productIds,
                },
            },
        });
        // Verificar se todos os produtos existem
        if (products.length !== productIds.length) {
            return res.status(400).json({ error: 'Um ou mais produtos não existem' });
        }
        // ✅ VERIFICAR ESTOQUE DISPONÍVEL (considerando reservas) - GUEST ORDER
        const stockCheck = yield checkStockAvailability(items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            variantId: undefined // Por enquanto, sem variantes nesta função
        })));
        if (!stockCheck.allSufficient) {
            const insufficientDetails = stockCheck.insufficientItems.map(item => ({
                productId: item.productId,
                requested: item.requested,
                available: item.available
            }));
            return res.status(400).json({
                error: 'Estoque insuficiente',
                message: 'Um ou mais produtos não possuem estoque suficiente disponível',
                details: insufficientDetails
            });
        }
        console.log(`✅ Verificação de estoque aprovada para pedido guest:`, stockCheck.stockChecks);
        // Calcular total do pedido
        const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        // Usar o total enviado no request (que já inclui o desconto) ou o calculado
        const total = sentTotal !== undefined ? sentTotal : calculatedTotal;
        // Criar pedido com transaction para garantir consistência
        const newOrder = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Criar o pedido
            const order = yield tx.order.create({
                data: {
                    total,
                    status: 'PENDING',
                    paymentMethod,
                    customerName,
                    customerEmail,
                    customerPhone,
                    shippingAddress: JSON.stringify(shippingAddress),
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                },
                include: {
                    items: true
                }
            });
            // Atualizar estoque dos produtos
            for (const item of items) {
                yield tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });
            }
            return order;
        }));
        return res.status(201).json(newOrder);
    }
    catch (error) {
        console.error('Erro ao criar pedido de convidado:', error);
        return res.status(500).json({ error: 'Erro ao criar pedido' });
    }
});
exports.createGuestOrder = createGuestOrder;
const checkGuestOrderPaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'ID do pedido é obrigatório' });
        }
        // Buscar o pedido
        const order = yield prisma.order.findUnique({
            where: {
                id: Number(id),
                userId: null // Garantir que é pedido de convidado
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true
                            }
                        }
                    }
                }
            }
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Verificar se é pagamento simulado
        const isSimulatedPayment = (_a = order.paymentId) === null || _a === void 0 ? void 0 : _a.startsWith('sim_');
        // Verificar status do pagamento no Mercado Pago apenas se não for simulado
        if (order.paymentId && !isSimulatedPayment) {
            try {
                const payment = yield mercadopago_service_1.default.getPaymentStatus(order.paymentId);
                const newStatus = mercadopago_service_1.default.mapMercadoPagoStatusToOrderStatus(payment.status);
                // Atualizar status se mudou
                if (order.status !== newStatus) {
                    yield prisma.order.update({
                        where: { id: order.id },
                        data: {
                            status: newStatus,
                            paymentStatus: payment.status === 'approved' ? 'PAID' : 'PENDING'
                        }
                    });
                    console.log(`🔄 Pedido ${order.id} atualizado: ${order.status} → ${newStatus}`);
                    // ✅ REDUZIR ESTOQUE SE PAGAMENTO FOI APROVADO AGORA
                    if (newStatus === 'PAID' && order.status !== 'PAID') {
                        console.log('🎉 Pagamento guest aprovado - reduzindo estoque:', order.id);
                        try {
                            yield reduceStockOnPaymentApproved(order.id);
                            console.log(`📦 Estoque reduzido automaticamente para pedido guest ${order.id}`);
                        }
                        catch (stockError) {
                            console.error(`❌ Erro ao reduzir estoque do pedido guest ${order.id}:`, stockError);
                        }
                    }
                    // Retornar dados atualizados
                    const updatedOrder = yield prisma.order.findUnique({
                        where: { id: order.id },
                        include: {
                            items: {
                                include: {
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                            imageUrl: true
                                        }
                                    }
                                }
                            }
                        }
                    });
                    // Parse do endereço de forma segura
                    let parsedAddress = null;
                    if (updatedOrder === null || updatedOrder === void 0 ? void 0 : updatedOrder.shippingAddress) {
                        try {
                            parsedAddress = JSON.parse(updatedOrder.shippingAddress);
                        }
                        catch (_b) {
                            // Se não é JSON válido, tratar como string simples
                            parsedAddress = { address: updatedOrder.shippingAddress };
                        }
                    }
                    return res.json(Object.assign(Object.assign({}, updatedOrder), { address: parsedAddress, statusChanged: true, previousStatus: order.status, newStatus: newStatus, simulation: isSimulatedPayment }));
                }
            }
            catch (paymentError) {
                console.error('Erro ao verificar pagamento:', paymentError);
                // Continuar com o status atual se não conseguir verificar
            }
        }
        // Parse do endereço de forma segura
        let parsedAddress = null;
        if (order.shippingAddress) {
            try {
                parsedAddress = JSON.parse(order.shippingAddress);
            }
            catch (_c) {
                // Se não é JSON válido, tratar como string simples
                parsedAddress = { address: order.shippingAddress };
            }
        }
        // Retornar pedido com status atual
        res.json(Object.assign(Object.assign({}, order), { address: parsedAddress, statusChanged: false, simulation: isSimulatedPayment }));
    }
    catch (error) {
        console.error('Erro ao verificar status do pedido:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.checkGuestOrderPaymentStatus = checkGuestOrderPaymentStatus;
/**
 * ✅ NOVA FUNCIONALIDADE: Obter informações de estoque em tempo real
 * Endpoint para verificar disponibilidade de estoque considerando reservas
 */
const getStockInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productIds, variantIds } = req.query;
        if (!productIds && !variantIds) {
            return res.status(400).json({
                error: 'Parâmetros obrigatórios',
                message: 'Informe productIds ou variantIds para consulta'
            });
        }
        const stockInfo = [];
        // Processar produtos se informados
        if (productIds) {
            const ids = productIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            for (const productId of ids) {
                const stockData = yield getAvailableStock(productId);
                let status = 'available';
                if (stockData.availableStock === 0) {
                    status = 'out_of_stock';
                }
                else if (stockData.availableStock <= 5) { // Estoque baixo quando <= 5 unidades
                    status = 'low_stock';
                }
                stockInfo.push(Object.assign(Object.assign({ productId }, stockData), { status }));
            }
        }
        // Processar variantes se informadas
        if (variantIds) {
            const ids = variantIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            for (const variantId of ids) {
                // Buscar produto da variante
                const variant = yield prisma.productVariant.findUnique({
                    where: { id: variantId },
                    select: { productId: true }
                });
                if (variant) {
                    const stockData = yield getAvailableStock(variant.productId, variantId);
                    let status = 'available';
                    if (stockData.availableStock === 0) {
                        status = 'out_of_stock';
                    }
                    else if (stockData.availableStock <= 5) {
                        status = 'low_stock';
                    }
                    stockInfo.push(Object.assign(Object.assign({ productId: variant.productId, variantId }, stockData), { status }));
                }
            }
        }
        return res.json({
            success: true,
            timestamp: new Date().toISOString(),
            stockInfo
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter informações de estoque:', error);
        return res.status(500).json({
            error: 'Erro ao consultar estoque',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
});
exports.getStockInfo = getStockInfo;
/**
 * ✅ REDUZIR ESTOQUE AUTOMATICAMENTE - PAGAMENTO APROVADO
 * Função chamada quando um pedido é aprovado para reduzir o estoque
 */
const reduceStockOnPaymentApproved = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`📦 REDUZINDO ESTOQUE: Pedido ${orderId} foi aprovado`);
        // 1. Buscar pedido com itens
        const order = yield prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                stock: true
                            }
                        },
                        productVariant: {
                            select: {
                                id: true,
                                stock: true
                            }
                        }
                    }
                }
            }
        });
        if (!order) {
            throw new Error(`Pedido ${orderId} não encontrado`);
        }
        if (order.status !== 'PAID') {
            console.log(`⚠️ Pedido ${orderId} não está marcado como PAID. Status: ${order.status}`);
            return;
        }
        // 2. Processar cada item do pedido
        const stockUpdates = [];
        for (const item of order.items) {
            console.log(`📦 Processando item: ${item.product.name} (Qtd: ${item.quantity})`);
            if (item.productVariantId && item.productVariant) {
                // ✅ PRODUTO COM VARIANTE
                const currentStock = item.productVariant.stock || 0;
                const newStock = Math.max(0, currentStock - item.quantity);
                yield prisma.productVariant.update({
                    where: { id: item.productVariantId },
                    data: { stock: newStock }
                });
                stockUpdates.push({
                    productId: item.productId,
                    productName: item.product.name,
                    quantity: item.quantity,
                    previousStock: currentStock,
                    newStock: newStock,
                    variantId: item.productVariantId
                });
                console.log(`✅ Estoque variante ${item.productVariantId}: ${currentStock} → ${newStock}`);
            }
            else {
                // ✅ PRODUTO SEM VARIANTE
                const currentStock = item.product.stock || 0;
                const newStock = Math.max(0, currentStock - item.quantity);
                yield prisma.product.update({
                    where: { id: item.productId },
                    data: { stock: newStock }
                });
                stockUpdates.push({
                    productId: item.productId,
                    productName: item.product.name,
                    quantity: item.quantity,
                    previousStock: currentStock,
                    newStock: newStock
                });
                console.log(`✅ Estoque produto ${item.productId}: ${currentStock} → ${newStock}`);
            }
        }
        // 3. Log final da operação
        console.log(`✅ ESTOQUE REDUZIDO: Pedido ${orderId}`, {
            totalItems: stockUpdates.length,
            updates: stockUpdates
        });
        return {
            success: true,
            orderId: orderId,
            stockUpdates: stockUpdates
        };
    }
    catch (error) {
        console.error(`❌ ERRO ao reduzir estoque do pedido ${orderId}:`, error);
        throw error;
    }
});
exports.reduceStockOnPaymentApproved = reduceStockOnPaymentApproved;
/**
 * ✅ ENDPOINT PARA TESTAR REDUÇÃO DE ESTOQUE
 * Endpoint administrativo para testar a redução manual de estoque
 */
const testReduceStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        if (!orderId || isNaN(Number(orderId))) {
            return res.status(400).json({
                error: 'ID do pedido inválido'
            });
        }
        const result = yield reduceStockOnPaymentApproved(Number(orderId));
        return res.json({
            success: true,
            message: 'Estoque reduzido com sucesso',
            result
        });
    }
    catch (error) {
        console.error('Erro ao testar redução de estoque:', error);
        return res.status(500).json({
            error: 'Erro ao reduzir estoque',
            message: error.message
        });
    }
});
exports.testReduceStock = testReduceStock;
