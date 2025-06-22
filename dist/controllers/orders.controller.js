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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGuestOrder = exports.addShipmentUpdate = exports.updateTrackingInfo = exports.getOrderTracking = exports.adminUpdateOrderStatus = exports.updateOrderStatus = exports.createOrder = exports.getOrderById = exports.getUserOrders = exports.getAllOrders = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
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
        // Verificar estoque
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({
                    error: 'Produto sem estoque suficiente',
                    productId: item.productId
                });
            }
        }
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
        return res.status(201).json(newOrder);
    }
    catch (error) {
        console.error('Erro ao criar pedido:', error);
        return res.status(500).json({ error: 'Erro ao criar pedido' });
    }
});
exports.createOrder = createOrder;
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
        const orderExists = yield prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!orderExists) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        const updatedOrder = yield prisma.order.update({
            where: { id: orderId },
            data: { status },
            include: {
                items: true,
            },
        });
        return res.json(updatedOrder);
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
        const orderExists = yield prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!orderExists) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
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
        return res.json(updatedOrder);
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
        // Verificar estoque
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({
                    error: 'Produto sem estoque suficiente',
                    productId: item.productId
                });
            }
        }
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
