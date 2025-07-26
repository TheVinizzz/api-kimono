import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Helper function to serialize BigInt values for JSON
const serializeBigInt = (obj: any) => {
  return JSON.parse(JSON.stringify(obj, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  ));
};

// Schema de validação para cupom
const couponSchema = z.object({
  code: z.string().min(3, 'Código deve ter pelo menos 3 caracteres').max(20, 'Código deve ter no máximo 20 caracteres'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.union([z.string(), z.number()]).transform((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num <= 0) {
      throw new Error('Valor deve ser um número positivo');
    }
    return num;
  }),
  minOrderValue: z.union([z.string(), z.number()]).transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num < 0) {
      throw new Error('Valor mínimo deve ser zero ou positivo');
    }
    return num;
  }).optional(),
  maxDiscount: z.union([z.string(), z.number()]).transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num < 0) {
      throw new Error('Desconto máximo deve ser zero ou positivo');
    }
    return num;
  }).optional(),
  maxUses: z.union([z.string(), z.number()]).transform((val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? parseInt(val) : val;
    if (isNaN(num) || num < 1) {
      throw new Error('Número máximo de usos deve ser pelo menos 1');
    }
    return num;
  }).optional(),
  isActive: z.boolean().default(true),
  validFrom: z.string().transform((val) => new Date(val)).default(() => new Date().toISOString().split('T')[0]),
  validUntil: z.string().transform((val) => new Date(val)).optional(),
});

// Schema para validação de cupom
const validateCouponSchema = z.object({
  code: z.string().min(1, 'Código do cupom é obrigatório'),
  orderValue: z.number().positive('Valor do pedido deve ser positivo'),
});

// Obter todos os cupons
export const getAllCoupons = async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const serializedCoupons = serializeBigInt(coupons);
    return res.json(serializedCoupons);
  } catch (error) {
    console.error('Erro ao buscar cupons:', error);
    return res.status(500).json({ error: 'Erro ao buscar cupons' });
  }
};

// Obter cupom por ID
export const getCouponById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const couponId = Number(id);
    
    if (isNaN(couponId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId }
    });
    
    if (!coupon) {
      return res.status(404).json({ error: 'Cupom não encontrado' });
    }
    
    const serializedCoupon = serializeBigInt(coupon);
    return res.json(serializedCoupon);
  } catch (error) {
    console.error('Erro ao buscar cupom:', error);
    return res.status(500).json({ error: 'Erro ao buscar cupom' });
  }
};

// Criar novo cupom
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const validatedData = couponSchema.parse(req.body);
    
    // Verificar se o código já existe
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: validatedData.code.toUpperCase() }
    });
    
    if (existingCoupon) {
      return res.status(400).json({ error: 'Código de cupom já existe' });
    }
    
    // Criar cupom com código em maiúsculo
    const coupon = await prisma.coupon.create({
      data: {
        ...validatedData,
        code: validatedData.code.toUpperCase(),
      }
    });
    
    const serializedCoupon = serializeBigInt(coupon);
    return res.status(201).json(serializedCoupon);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.errors 
      });
    }
    
    console.error('Erro ao criar cupom:', error);
    return res.status(500).json({ error: 'Erro ao criar cupom' });
  }
};

// Atualizar cupom
export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const couponId = Number(id);
    
    if (isNaN(couponId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const validatedData = couponSchema.partial().parse(req.body);
    
    // Se o código está sendo atualizado, verificar se já existe
    if (validatedData.code) {
      const existingCoupon = await prisma.coupon.findFirst({
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
    
    const coupon = await prisma.coupon.update({
      where: { id: couponId },
      data: validatedData
    });
    
    const serializedCoupon = serializeBigInt(coupon);
    return res.json(serializedCoupon);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.errors 
      });
    }
    
    console.error('Erro ao atualizar cupom:', error);
    return res.status(500).json({ error: 'Erro ao atualizar cupom' });
  }
};

// Deletar cupom
export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const couponId = Number(id);
    
    if (isNaN(couponId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Verificar se o cupom existe
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId }
    });
    
    if (!coupon) {
      return res.status(404).json({ error: 'Cupom não encontrado' });
    }
    
    // Verificar se há pedidos usando este cupom
    const ordersWithCoupon = await prisma.order.findFirst({
      where: { couponId }
    });
    
    if (ordersWithCoupon) {
      return res.status(400).json({ 
        error: 'Não é possível deletar o cupom pois existem pedidos associados' 
      });
    }
    
    await prisma.coupon.delete({
      where: { id: couponId }
    });
    
    return res.json({ message: 'Cupom deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cupom:', error);
    return res.status(500).json({ error: 'Erro ao deletar cupom' });
  }
};

// Validar cupom
export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const validatedData = validateCouponSchema.parse(req.body);
    const { code, orderValue } = validatedData;
    
    // Buscar cupom pelo código
    const coupon = await prisma.coupon.findUnique({
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
    } else if (coupon.type === 'FIXED') {
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
    
  } catch (error) {
    if (error instanceof z.ZodError) {
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
};

// Aplicar cupom a um pedido
export const applyCouponToOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { code } = req.body;
    
    const orderIdNum = Number(orderId);
    if (isNaN(orderIdNum)) {
      return res.status(400).json({ error: 'ID do pedido inválido' });
    }
    
    // Buscar pedido
    const order = await prisma.order.findUnique({
      where: { id: orderIdNum }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    // Validar cupom diretamente
    const validatedData = validateCouponSchema.parse({ code, orderValue: parseFloat(order.total.toString()) });
    const { orderValue } = validatedData;
    
    // Buscar cupom pelo código
    const coupon = await prisma.coupon.findUnique({
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
    } else if (coupon.type === 'FIXED') {
      discountAmount = parseFloat(coupon.value.toString());
      finalValue = orderValue - discountAmount;
      
      // Garantir que o valor final não seja negativo
      if (finalValue < 0) {
        discountAmount = orderValue;
        finalValue = 0;
      }
    }
    
    // Atualizar pedido com o cupom
    const updatedOrder = await prisma.order.update({
      where: { id: orderIdNum },
      data: {
        couponId: coupon.id,
        subtotal: order.total,
        discountAmount: discountAmount,
        total: finalValue
      }
    });
    
    // Incrementar contador de uso do cupom
    await prisma.coupon.update({
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
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.errors 
      });
    }
    
    console.error('Erro ao aplicar cupom:', error);
    return res.status(500).json({ error: 'Erro ao aplicar cupom' });
  }
};

// Remover cupom de um pedido
export const removeCouponFromOrder = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const orderIdNum = Number(orderId);
    
    if (isNaN(orderIdNum)) {
      return res.status(400).json({ error: 'ID do pedido inválido' });
    }
    
    // Buscar pedido
    const order = await prisma.order.findUnique({
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
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderIdNum },
      data: {
        couponId: null,
        discountAmount: null,
        total: originalTotal
      }
    });
    
    // Decrementar contador de uso do cupom
    if (order.coupon) {
      await prisma.coupon.update({
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
    
  } catch (error) {
    console.error('Erro ao remover cupom:', error);
    return res.status(500).json({ error: 'Erro ao remover cupom' });
  }
}; 