import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import mercadoPagoService from '../services/mercadopago.service';

const prisma = new PrismaClient();

// Schema de validação para o item do pedido
const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

// Schema de validação para criação de pedido
const orderCreateSchema = z.object({
  items: z.array(orderItemSchema).nonempty('O pedido deve ter pelo menos um item'),
});

// Schema de validação para atualização de status do pedido
const orderUpdateSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELED']),
});

// Schema para atualização administrativa de status (apenas status)
const adminOrderUpdateSchema = z.object({
  orderId: z.number().int().positive(),
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELED']),
});

// Schema for shipment update
const shipmentUpdateSchema = z.object({
  status: z.string(),
  location: z.string().optional(),
  description: z.string().optional(),
});

// Schema for updating tracking information
const trackingUpdateSchema = z.object({
  trackingNumber: z.string().optional(),
  shippingCarrier: z.string().optional(),
  estimatedDelivery: z.string().optional().transform(val => val ? new Date(val) : undefined),
  departureDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  currentLocation: z.string().optional(),
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELED']).optional(),
});

// Schema para pedido de convidado
const guestOrderCreateSchema = z.object({
  items: z.array(orderItemSchema).nonempty('O pedido deve ter pelo menos um item'),
  customerEmail: z.string().email('Email inválido'),
  customerName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  customerPhone: z.string().optional(),
  shippingAddress: z.object({
    name: z.string(),
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    cpfCnpj: z.string().optional()
  }),
  paymentMethod: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD']),
  total: z.number().optional()
});

// Obter todos os pedidos (admin)
export const getAllOrders = async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
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
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
};

// Obter pedidos do usuário logado
export const getUserOrders = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const userId = req.user.id;
    
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return res.json(orders);
  } catch (error) {
    console.error('Erro ao buscar pedidos do usuário:', error);
    return res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
};

// Obter pedido por ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const { id } = req.params;
    const orderId = Number(id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const order = await prisma.order.findUnique({
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
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
};

// Criar pedido
export const createOrder = async (req: Request, res: Response) => {
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
    
    const products = await prisma.product.findMany({
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
    const newOrder = await prisma.$transaction(async (tx) => {
      // Criar o pedido
      const order = await tx.order.create({
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
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }
      
      return order;
    });
    
    return res.status(201).json(newOrder);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return res.status(500).json({ error: 'Erro ao criar pedido' });
  }
};

// Atualizar status do pedido (admin)
export const updateOrderStatus = async (req: Request, res: Response) => {
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
    const orderExists = await prisma.order.findUnique({
      where: { id: orderId },
    });
    
    if (!orderExists) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        items: true,
      },
    });
    
    return res.json(updatedOrder);
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
  }
};

// Endpoint para administrador atualizar status do pedido (compatível com a API do frontend)
export const adminUpdateOrderStatus = async (req: Request, res: Response) => {
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
    const orderExists = await prisma.order.findUnique({
      where: { id: orderId },
    });
    
    if (!orderExists) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    const updatedOrder = await prisma.order.update({
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
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    return res.status(500).json({ error: 'Erro ao atualizar status do pedido' });
  }
};

// Get order tracking information
export const getOrderTracking = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const { id } = req.params;
    const orderId = Number(id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const order = await prisma.order.findUnique({
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
  } catch (error) {
    console.error('Erro ao buscar informações de rastreio:', error);
    return res.status(500).json({ error: 'Erro ao buscar informações de rastreio' });
  }
};

// Update tracking information (admin)
export const updateTrackingInfo = async (req: Request, res: Response) => {
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
    const orderExists = await prisma.order.findUnique({
      where: { id: orderId },
    });
    
    if (!orderExists) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    // Atualizar informações de rastreamento
    const updatedOrder = await prisma.order.update({
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
  } catch (error) {
    console.error('Erro ao atualizar informações de rastreio:', error);
    return res.status(500).json({ error: 'Erro ao atualizar informações de rastreio' });
  }
};

// Add shipment update (admin)
export const addShipmentUpdate = async (req: Request, res: Response) => {
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
    const orderExists = await prisma.order.findUnique({
      where: { id: orderId },
    });
    
    if (!orderExists) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    // Criar atualização de envio
    const shipmentUpdate = await prisma.shipmentUpdate.create({
      data: {
        orderId,
        status,
        location,
        description,
      },
    });
    
    // Atualizar localização atual do pedido
    if (location) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          currentLocation: location,
        },
      });
    }
    
    return res.status(201).json(shipmentUpdate);
  } catch (error) {
    console.error('Erro ao adicionar atualização de envio:', error);
    return res.status(500).json({ error: 'Erro ao adicionar atualização de envio' });
  }
};

// Buscar pedido de convidado por ID
export const getGuestOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderId = Number(id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const order = await prisma.order.findUnique({
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
      } catch {
        parsedShippingAddress = order.shippingAddress;
      }
    }
    
    const orderResponse = {
      ...order,
      shippingAddress: parsedShippingAddress,
    };
    
    return res.json(orderResponse);
  } catch (error) {
    console.error('Erro ao buscar pedido de convidado:', error);
    return res.status(500).json({ error: 'Erro ao buscar pedido' });
  }
};

// Criar pedido para usuário não autenticado (guest)
export const createGuestOrder = async (req: Request, res: Response) => {
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
    
    const products = await prisma.product.findMany({
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
    const newOrder = await prisma.$transaction(async (tx) => {
      // Criar o pedido
      const order = await tx.order.create({
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
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        });
      }
      
      return order;
    });
    
    return res.status(201).json(newOrder);
  } catch (error) {
    console.error('Erro ao criar pedido de convidado:', error);
    return res.status(500).json({ error: 'Erro ao criar pedido' });
  }
};

export const checkGuestOrderPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório' });
    }

    // Buscar o pedido
    const order = await prisma.order.findUnique({
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
    const isSimulatedPayment = order.paymentId?.startsWith('sim_');

    // Verificar status do pagamento no Mercado Pago apenas se não for simulado
    if (order.paymentId && !isSimulatedPayment) {
      try {
        const payment = await mercadoPagoService.getPaymentStatus(order.paymentId);
        const newStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status);

        // Atualizar status se mudou
        if (order.status !== newStatus) {
          await prisma.order.update({
            where: { id: order.id },
            data: { 
              status: newStatus,
              paymentStatus: payment.status === 'approved' ? 'PAID' : 'PENDING'
            }
          });

          console.log(`🔄 Pedido ${order.id} atualizado: ${order.status} → ${newStatus}`);
          
          // Retornar dados atualizados
          const updatedOrder = await prisma.order.findUnique({
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
          if (updatedOrder?.shippingAddress) {
            try {
              parsedAddress = JSON.parse(updatedOrder.shippingAddress);
            } catch {
              // Se não é JSON válido, tratar como string simples
              parsedAddress = { address: updatedOrder.shippingAddress };
            }
          }

          return res.json({
            ...updatedOrder,
            address: parsedAddress,
            statusChanged: true,
            previousStatus: order.status,
            newStatus: newStatus,
            simulation: isSimulatedPayment
          });
        }
      } catch (paymentError) {
        console.error('Erro ao verificar pagamento:', paymentError);
        // Continuar com o status atual se não conseguir verificar
      }
    }

    // Parse do endereço de forma segura
    let parsedAddress = null;
    if (order.shippingAddress) {
      try {
        parsedAddress = JSON.parse(order.shippingAddress);
      } catch {
        // Se não é JSON válido, tratar como string simples
        parsedAddress = { address: order.shippingAddress };
      }
    }

    // Retornar pedido com status atual
    res.json({
      ...order,
      address: parsedAddress,
      statusChanged: false,
      simulation: isSimulatedPayment
    });

  } catch (error) {
    console.error('Erro ao verificar status do pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 