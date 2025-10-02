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
exports.removeCouponFromOrder = exports.applyCouponToOrder = exports.validateCoupon = exports.deactivateCoupon = exports.updateCoupon = exports.createCoupon = exports.getCouponById = exports.getAllCoupons = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Helper function to serialize BigInt values for JSON
const serializeBigInt = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) => typeof value === 'bigint' ? value.toString() : value));
};
// Schema de validação para cupom
const couponSchema = zod_1.z.object({
    code: zod_1.z.string().min(3, 'Código deve ter pelo menos 3 caracteres').max(20, 'Código deve ter no máximo 20 caracteres'),
    name: zod_1.z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['PERCENTAGE', 'FIXED']),
    value: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num) || num <= 0) {
            throw new Error('Valor deve ser um número positivo');
        }
        return num;
    }),
    minOrderValue: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform((val) => {
        if (val === '' || val === null || val === undefined)
            return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num) || num < 0) {
            throw new Error('Valor mínimo deve ser zero ou positivo');
        }
        return num;
    }).optional(),
    maxDiscount: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform((val) => {
        if (val === '' || val === null || val === undefined)
            return undefined;
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num) || num < 0) {
            throw new Error('Desconto máximo deve ser zero ou positivo');
        }
        return num;
    }).optional(),
    maxUses: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform((val) => {
        if (val === '' || val === null || val === undefined)
            return undefined;
        const num = typeof val === 'string' ? parseInt(val) : val;
        if (isNaN(num) || num < 1) {
            throw new Error('Número máximo de usos deve ser pelo menos 1');
        }
        return num;
    }).optional(),
    isActive: zod_1.z.boolean().default(true),
    validFrom: zod_1.z.string().transform((val) => new Date(val)).default(() => new Date().toISOString().split('T')[0]),
    validUntil: zod_1.z.string().transform((val) => new Date(val)).optional(),
});
// Schema para validação de cupom
const validateCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Código do cupom é obrigatório'),
    orderValue: zod_1.z.number().positive('Valor do pedido deve ser positivo'),
});
// Obter todos os cupons (excluindo desativados)
const getAllCoupons = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const coupons = yield prisma.coupon.findMany({
            where: {
                // Filtrar cupons que não foram desativados (não começam com DISABLED_)
                NOT: {
                    code: {
                        startsWith: 'DISABLED_'
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const serializedCoupons = serializeBigInt(coupons);
        return res.json(serializedCoupons);
    }
    catch (error) {
        console.error('Erro ao buscar cupons:', error);
        return res.status(500).json({ error: 'Erro ao buscar cupons' });
    }
});
exports.getAllCoupons = getAllCoupons;
// Obter cupom por ID
const getCouponById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const couponId = Number(id);
        if (isNaN(couponId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const coupon = yield prisma.coupon.findUnique({
            where: { id: couponId }
        });
        if (!coupon) {
            return res.status(404).json({ error: 'Cupom não encontrado' });
        }
        const serializedCoupon = serializeBigInt(coupon);
        return res.json(serializedCoupon);
    }
    catch (error) {
        console.error('Erro ao buscar cupom:', error);
        return res.status(500).json({ error: 'Erro ao buscar cupom' });
    }
});
exports.getCouponById = getCouponById;
// Criar novo cupom
const createCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = couponSchema.parse(req.body);
        // Verificar se o código já existe
        const existingCoupon = yield prisma.coupon.findUnique({
            where: { code: validatedData.code.toUpperCase() }
        });
        if (existingCoupon) {
            return res.status(400).json({ error: 'Código de cupom já existe' });
        }
        // Criar cupom com código em maiúsculo
        const coupon = yield prisma.coupon.create({
            data: Object.assign(Object.assign({}, validatedData), { code: validatedData.code.toUpperCase() })
        });
        const serializedCoupon = serializeBigInt(coupon);
        return res.status(201).json(serializedCoupon);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors
            });
        }
        console.error('Erro ao criar cupom:', error);
        return res.status(500).json({ error: 'Erro ao criar cupom' });
    }
});
exports.createCoupon = createCoupon;
// Atualizar cupom
const updateCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const couponId = Number(id);
        if (isNaN(couponId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        const validatedData = couponSchema.partial().parse(req.body);
        // Se o código está sendo atualizado, verificar se já existe
        if (validatedData.code) {
            const existingCoupon = yield prisma.coupon.findFirst({
                where: {
                    code: validatedData.code.toUpperCase(),
                    id: { not: couponId }
                }
            });
            if (existingCoupon) {
                return res.status(400).json({ error: 'Código de cupom já existe' });
            }
            validatedData.code = validatedData.code.toUpperCase();
        }
        const coupon = yield prisma.coupon.update({
            where: { id: couponId },
            data: validatedData
        });
        const serializedCoupon = serializeBigInt(coupon);
        return res.json(serializedCoupon);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors
            });
        }
        console.error('Erro ao atualizar cupom:', error);
        return res.status(500).json({ error: 'Erro ao atualizar cupom' });
    }
});
exports.updateCoupon = updateCoupon;
// Desativar cupom (soft delete)
const deactivateCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const couponId = Number(id);
        if (isNaN(couponId)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        // Verificar se o cupom existe
        const coupon = yield prisma.coupon.findUnique({
            where: { id: couponId }
        });
        if (!coupon) {
            return res.status(404).json({ error: 'Cupom não encontrado' });
        }
        // Verificar se o cupom já está desativado
        if (!coupon.isActive) {
            return res.status(400).json({
                error: 'Cupom já está desativado'
            });
        }
        // Gerar novo código único para evitar conflitos futuros
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newCode = `DISABLED_${timestamp}_${randomSuffix}`;
        // Desativar cupom e alterar código
        const updatedCoupon = yield prisma.coupon.update({
            where: { id: couponId },
            data: {
                isActive: false,
                code: newCode,
                updatedAt: new Date()
            }
        });
        console.log(`✅ Cupom ${coupon.code} desativado com sucesso. Novo código: ${newCode}`);
        return res.json({
            message: 'Cupom desativado com sucesso',
            data: {
                id: updatedCoupon.id,
                originalCode: coupon.code,
                newCode: updatedCoupon.code,
                isActive: updatedCoupon.isActive
            }
        });
    }
    catch (error) {
        console.error('Erro ao desativar cupom:', error);
        return res.status(500).json({ error: 'Erro ao desativar cupom' });
    }
});
exports.deactivateCoupon = deactivateCoupon;
// Validar cupom
const validateCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = validateCouponSchema.parse(req.body);
        const { code, orderValue } = validatedData;
        // Buscar cupom pelo código
        const coupon = yield prisma.coupon.findUnique({
            where: { code: code.toUpperCase() }
        });
        if (!coupon) {
            return res.status(200).json({
                error: 'Cupom não encontrado. Verifique o código e tente novamente',
                valid: false
            });
        }
        // Verificar se o cupom está ativo
        if (!coupon.isActive) {
            return res.status(200).json({
                error: 'Este cupom está inativo e não pode ser utilizado',
                valid: false
            });
        }
        // Verificar validade temporal
        const now = new Date();
        if (coupon.validFrom > now) {
            const validFromDate = new Date(coupon.validFrom).toLocaleDateString('pt-BR');
            return res.status(200).json({
                error: `Este cupom será válido a partir de ${validFromDate}`,
                valid: false
            });
        }
        if (coupon.validUntil && coupon.validUntil < now) {
            const validUntilDate = new Date(coupon.validUntil).toLocaleDateString('pt-BR');
            return res.status(200).json({
                error: `Este cupom expirou em ${validUntilDate}`,
                valid: false
            });
        }
        // Verificar limite de usos
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            return res.status(200).json({
                error: `Este cupom atingiu o limite máximo de ${coupon.maxUses} usos e não pode ser utilizado novamente`,
                valid: false
            });
        }
        // Verificar valor mínimo do pedido
        if (coupon.minOrderValue && orderValue < parseFloat(coupon.minOrderValue.toString())) {
            return res.status(200).json({
                error: `Valor mínimo do pedido: R$ ${parseFloat(coupon.minOrderValue.toString()).toFixed(2)}`,
                valid: false
            });
        }
        // Calcular desconto
        let discountAmount = 0;
        let finalValue = orderValue;
        if (coupon.type === 'PERCENTAGE') {
            discountAmount = orderValue * (parseFloat(coupon.value.toString()) / 100);
            // Aplicar desconto máximo se definido
            if (coupon.maxDiscount && discountAmount > parseFloat(coupon.maxDiscount.toString())) {
                discountAmount = parseFloat(coupon.maxDiscount.toString());
            }
            finalValue = orderValue - discountAmount;
        }
        else if (coupon.type === 'FIXED') {
            discountAmount = parseFloat(coupon.value.toString());
            finalValue = orderValue - discountAmount;
            // Garantir que o valor final não seja negativo
            if (finalValue < 0) {
                discountAmount = orderValue;
                finalValue = 0;
            }
        }
        const serializedCoupon = serializeBigInt(coupon);
        return res.json({
            valid: true,
            coupon: serializedCoupon,
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            finalValue: parseFloat(finalValue.toFixed(2)),
            originalValue: orderValue
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors,
                valid: false
            });
        }
        console.error('Erro ao validar cupom:', error);
        return res.status(500).json({
            error: 'Erro ao validar cupom',
            valid: false
        });
    }
});
exports.validateCoupon = validateCoupon;
// Aplicar cupom a um pedido
const applyCouponToOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const { code } = req.body;
        const orderIdNum = Number(orderId);
        if (isNaN(orderIdNum)) {
            return res.status(400).json({ error: 'ID do pedido inválido' });
        }
        // Buscar pedido
        const order = yield prisma.order.findUnique({
            where: { id: orderIdNum }
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Validar cupom diretamente
        const validatedData = validateCouponSchema.parse({ code, orderValue: parseFloat(order.total.toString()) });
        const { orderValue } = validatedData;
        // Buscar cupom pelo código
        const coupon = yield prisma.coupon.findUnique({
            where: { code: code.toUpperCase() }
        });
        if (!coupon) {
            return res.status(404).json({ error: 'Cupom não encontrado' });
        }
        // Verificar se o cupom está ativo
        if (!coupon.isActive) {
            return res.status(400).json({ error: 'Cupom inativo' });
        }
        // Verificar validade temporal
        const now = new Date();
        if (coupon.validFrom > now) {
            return res.status(400).json({ error: 'Cupom ainda não está válido' });
        }
        if (coupon.validUntil && coupon.validUntil < now) {
            return res.status(400).json({ error: 'Cupom expirado' });
        }
        // Verificar limite de usos
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            return res.status(400).json({ error: 'Cupom esgotado' });
        }
        // Verificar valor mínimo do pedido
        if (coupon.minOrderValue && orderValue < parseFloat(coupon.minOrderValue.toString())) {
            return res.status(400).json({
                error: `Valor mínimo do pedido: R$ ${parseFloat(coupon.minOrderValue.toString()).toFixed(2)}`
            });
        }
        // Calcular desconto
        let discountAmount = 0;
        let finalValue = orderValue;
        if (coupon.type === 'PERCENTAGE') {
            discountAmount = orderValue * (parseFloat(coupon.value.toString()) / 100);
            // Aplicar desconto máximo se definido
            if (coupon.maxDiscount && discountAmount > parseFloat(coupon.maxDiscount.toString())) {
                discountAmount = parseFloat(coupon.maxDiscount.toString());
            }
            finalValue = orderValue - discountAmount;
        }
        else if (coupon.type === 'FIXED') {
            discountAmount = parseFloat(coupon.value.toString());
            finalValue = orderValue - discountAmount;
            // Garantir que o valor final não seja negativo
            if (finalValue < 0) {
                discountAmount = orderValue;
                finalValue = 0;
            }
        }
        // Atualizar pedido com o cupom
        const updatedOrder = yield prisma.order.update({
            where: { id: orderIdNum },
            data: {
                couponId: coupon.id,
                subtotal: order.total,
                discountAmount: discountAmount,
                total: finalValue
            }
        });
        // Incrementar contador de uso do cupom
        yield prisma.coupon.update({
            where: { id: coupon.id },
            data: {
                usedCount: {
                    increment: 1
                }
            }
        });
        const serializedOrder = serializeBigInt(updatedOrder);
        return res.json({
            success: true,
            order: serializedOrder,
            discountAmount: parseFloat(discountAmount.toFixed(2)),
            finalValue: parseFloat(finalValue.toFixed(2))
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: error.errors
            });
        }
        console.error('Erro ao aplicar cupom:', error);
        return res.status(500).json({ error: 'Erro ao aplicar cupom' });
    }
});
exports.applyCouponToOrder = applyCouponToOrder;
// Remover cupom de um pedido
const removeCouponFromOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const orderIdNum = Number(orderId);
        if (isNaN(orderIdNum)) {
            return res.status(400).json({ error: 'ID do pedido inválido' });
        }
        // Buscar pedido
        const order = yield prisma.order.findUnique({
            where: { id: orderIdNum },
            include: { coupon: true }
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        if (!order.couponId) {
            return res.status(400).json({ error: 'Pedido não possui cupom aplicado' });
        }
        // Restaurar valor original
        const originalTotal = order.subtotal || order.total;
        const updatedOrder = yield prisma.order.update({
            where: { id: orderIdNum },
            data: {
                couponId: null,
                discountAmount: null,
                total: originalTotal
            }
        });
        // Decrementar contador de uso do cupom
        if (order.coupon) {
            yield prisma.coupon.update({
                where: { id: order.coupon.id },
                data: {
                    usedCount: {
                        decrement: 1
                    }
                }
            });
        }
        const serializedOrder = serializeBigInt(updatedOrder);
        return res.json({
            success: true,
            order: serializedOrder,
            message: 'Cupom removido com sucesso'
        });
    }
    catch (error) {
        console.error('Erro ao remover cupom:', error);
        return res.status(500).json({ error: 'Erro ao remover cupom' });
    }
});
exports.removeCouponFromOrder = removeCouponFromOrder;
