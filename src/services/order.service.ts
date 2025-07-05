import { Order, OrderStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { correiosService } from './correios.service';

interface CreateOrderData {
  email: string;
  cpfCnpj: string;
  total: number;
  items: Array<{
    id?: number;
    productId?: number;
    name?: string;
    price: number;
    quantity: number;
  }>;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  paymentId?: string;
  paymentMethod: string;
  paymentStatus: string;
  userId?: number;
}

interface CreateGuestOrderData extends CreateOrderData {
  name: string;
  phone: string;
}

class OrderService {
  // Criar pedido para usuário autenticado
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    try {
      console.log('📦 Criando pedido para usuário autenticado:', {
        userId: orderData.userId,
        email: orderData.email,
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus
      });

      // ✅ DEFINIR STATUS DO PEDIDO BASEADO NO STATUS DO PAGAMENTO
      let orderStatus: OrderStatus = 'PENDING';
      if (orderData.paymentStatus === 'PAID') {
        orderStatus = 'PAID';
      } else if (orderData.paymentStatus === 'PENDING') {
        orderStatus = 'PENDING';
      }

      const order = await prisma.order.create({
        data: {
          userId: orderData.userId,
          customerEmail: orderData.email,
          customerName: '', // Será preenchido pelo perfil do usuário
          customerPhone: '', // Será preenchido pelo perfil do usuário
          customerDocument: orderData.cpfCnpj,
          total: orderData.total,
          status: orderStatus, // ✅ USAR STATUS CORRETO
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          paymentId: orderData.paymentId,
          
          // Endereço de entrega completo
          shippingAddress: `${orderData.address.street}, ${orderData.address.number}${orderData.address.complement ? ', ' + orderData.address.complement : ''}, ${orderData.address.neighborhood}, ${orderData.address.city} - ${orderData.address.state}, ${orderData.address.zipCode}`,
          
          // Items do pedido
          items: {
            create: orderData.items.map(item => ({
              productId: item.productId || item.id!,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: {
          items: true
        }
      });

      console.log('✅ Pedido criado com sucesso:', {
        orderId: order.id,
        userId: order.userId, // ✅ CONFIRMAR QUE userId ESTÁ PREENCHIDO
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus
      });

      return order;
    } catch (error) {
      console.error('❌ Erro ao criar pedido:', error);
      throw new Error('Erro ao criar pedido no banco de dados');
    }
  }

  // Criar pedido para usuário convidado
  async createGuestOrder(orderData: CreateGuestOrderData): Promise<Order> {
    try {
      console.log('📦 Criando pedido para usuário convidado:', {
        email: orderData.email,
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus
      });

      // ✅ DEFINIR STATUS DO PEDIDO BASEADO NO STATUS DO PAGAMENTO
      let orderStatus: OrderStatus = 'PENDING';
      if (orderData.paymentStatus === 'PAID') {
        orderStatus = 'PAID';
      } else if (orderData.paymentStatus === 'PENDING') {
        orderStatus = 'PENDING';
      }

      const order = await prisma.order.create({
        data: {
          userId: null, // Pedido guest
          customerEmail: orderData.email,
          customerName: orderData.name,
          customerPhone: orderData.phone,
          customerDocument: orderData.cpfCnpj,
          total: orderData.total,
          status: orderStatus, // ✅ USAR STATUS CORRETO
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          paymentId: orderData.paymentId,
          
          // Endereço de entrega completo
          shippingAddress: `${orderData.address.street}, ${orderData.address.number}${orderData.address.complement ? ', ' + orderData.address.complement : ''}, ${orderData.address.neighborhood}, ${orderData.address.city} - ${orderData.address.state}, ${orderData.address.zipCode}`,
          
          // Items do pedido
          items: {
            create: orderData.items.map(item => ({
              productId: item.productId || item.id!,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: {
          items: true
        }
      });

      console.log('✅ Pedido guest criado com sucesso:', {
        orderId: order.id,
        userId: order.userId, // ✅ DEVE SER null PARA GUESTS
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus
      });

      return order;
    } catch (error) {
      console.error('❌ Erro ao criar pedido guest:', error);
      console.error('📋 Dados do pedido que causaram erro:', JSON.stringify(orderData, null, 2));
      throw new Error(`Erro ao criar pedido guest no banco de dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Buscar pedido por ID
  async getOrderById(orderId: number): Promise<Order | null> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      return order;
    } catch (error) {
      console.error('❌ Erro ao buscar pedido:', error);
      throw new Error('Erro ao buscar pedido no banco de dados');
    }
  }

  // Buscar pedido por Payment ID
  async getOrderByPaymentId(paymentId: string): Promise<Order | null> {
    try {
      const order = await prisma.order.findFirst({
        where: { paymentId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      return order;
    } catch (error) {
      console.error('❌ Erro ao buscar pedido por payment ID:', error);
      throw new Error('Erro ao buscar pedido no banco de dados');
    }
  }

  // Atualizar status do pedido
  async updateOrderStatus(orderId: number, status: OrderStatus, paymentStatus?: string): Promise<Order> {
    try {
      console.log('🔄 Atualizando status do pedido:', {
        orderId,
        status,
        paymentStatus
      });

      const updateData: any = { status };
      if (paymentStatus) {
        updateData.paymentStatus = paymentStatus;
      }

      const order = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          items: true
        }
      });

      console.log('✅ Status do pedido atualizado:', {
        orderId: order.id,
        newStatus: order.status,
        paymentStatus: order.paymentStatus
      });

      return order;
    } catch (error) {
      console.error('❌ Erro ao atualizar status do pedido:', error);
      throw new Error('Erro ao atualizar pedido no banco de dados');
    }
  }

  // Atualizar status do pagamento
  async updatePaymentStatus(paymentId: string, paymentStatus: string, orderStatus?: OrderStatus): Promise<Order | null> {
    try {
      console.log('💳 Atualizando status do pagamento:', {
        paymentId,
        paymentStatus,
        orderStatus
      });

      const updateData: any = { paymentStatus };
      if (orderStatus) {
        updateData.status = orderStatus;
      }

      const order = await prisma.order.updateMany({
        where: { paymentId },
        data: updateData
      });

      if (order.count > 0) {
        // Buscar o pedido atualizado
        const updatedOrder = await this.getOrderByPaymentId(paymentId);
        
        console.log('✅ Status do pagamento atualizado:', {
          paymentId,
          newPaymentStatus: paymentStatus,
          orderStatus: updatedOrder?.status
        });

        return updatedOrder;
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao atualizar status do pagamento:', error);
      throw new Error('Erro ao atualizar status do pagamento');
    }
  }

  // Listar pedidos do usuário
  async getUserOrders(userId: number, limit: number = 10, offset: number = 0): Promise<Order[]> {
    try {
      const orders = await prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return orders;
    } catch (error) {
      console.error('❌ Erro ao listar pedidos do usuário:', error);
      throw new Error('Erro ao buscar pedidos do usuário');
    }
  }

  // Buscar pedidos por email (para guests)
  async getOrdersByEmail(email: string, limit: number = 10, offset: number = 0): Promise<Order[]> {
    try {
      const orders = await prisma.order.findMany({
        where: { 
          customerEmail: email,
          userId: null // Apenas pedidos guest
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return orders;
    } catch (error) {
      console.error('❌ Erro ao buscar pedidos por email:', error);
      throw new Error('Erro ao buscar pedidos por email');
    }
  }

  // Gerar código de rastreio dos Correios para um pedido pago
  async gerarCodigoRastreio(orderId: number): Promise<string | null> {
    try {
      console.log(`📮 Gerando código de rastreio para pedido ${orderId}...`);

      // Buscar pedido completo com itens
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });
      
      if (!order) {
        console.error('❌ Pedido não encontrado:', orderId);
        return null;
      }

      // Verificar se pedido está pago
      if (order.status !== 'PAID' && order.paymentStatus !== 'PAID') {
        console.log('⚠️ Pedido ainda não foi pago, aguardando confirmação de pagamento');
        return null;
      }

      // Verificar se já possui código de rastreio
      if (order.trackingNumber && order.trackingNumber !== 'Não disponível') {
        console.log('✅ Pedido já possui código de rastreio:', order.trackingNumber);
        return order.trackingNumber;
      }

      // Validar configuração dos Correios
      if (!correiosService.validateConfig()) {
        console.error('❌ Configuração dos Correios incompleta');
        return null;
      }

      // Extrair dados do endereço
      const enderecoPartes = order.shippingAddress?.split(', ') || [];
      if (enderecoPartes.length < 4) {
        console.error('❌ Endereço de entrega inválido:', order.shippingAddress);
        return null;
      }

      // Parse do endereço (formato: "Rua X, 123, Bairro, Cidade - UF, CEP")
      const [logradouroNumero, bairro, cidadeUF, cep] = enderecoPartes;
      const [logradouro, numero] = logradouroNumero.split(', ');
      const [cidade, uf] = cidadeUF.split(' - ');

      // Calcular peso total dos itens (estimativa de 400g por item como padrão para kimono)
      const pesoTotal = order.items?.reduce((total: number, item: any) => {
        return total + (item.quantity * 400); // 400g por kimono
      }, 0) || 400; // Peso padrão se não houver itens

      // Preparar dados para prepostagem
      const dadosPrepostagem = {
        orderId: order.id,
        destinatario: {
          nome: order.customerName || 'Cliente',
          documento: order.customerDocument || '',
          telefone: order.customerPhone || undefined,
          email: order.customerEmail || undefined,
          endereco: {
            logradouro: logradouro || '',
            numero: numero || '',
            complemento: '', // Pode ser extraído se necessário
            bairro: bairro || '',
            cidade: cidade || '',
            uf: uf || '',
            cep: (cep || '').replace(/\D/g, '') // Remove caracteres não numéricos
          }
        },
        servico: '03298', // PAC como padrão (mais econômico)
        peso: pesoTotal,
        valor: Number(order.total),
        observacao: `Pedido #${order.id} - Kimono Store`
      };

      // Criar prepostagem nos Correios
      const resultado = await correiosService.criarPrepostagemPedido(dadosPrepostagem);

      if (resultado.erro) {
        console.error('❌ Erro ao criar prepostagem:', resultado.mensagem);
        return null;
      }

      if (!resultado.codigoObjeto) {
        console.error('❌ Código de rastreio não foi gerado');
        return null;
      }

      // Atualizar pedido com código de rastreio
      await prisma.order.update({
        where: { id: orderId },
        data: {
          trackingNumber: resultado.codigoObjeto,
          shippingCarrier: 'Correios',
          status: 'PROCESSING' // Mover para processamento
        }
      });

      console.log('✅ Código de rastreio gerado com sucesso:', resultado.codigoObjeto);
      return resultado.codigoObjeto;

    } catch (error) {
      console.error('❌ Erro ao gerar código de rastreio:', error);
      return null;
    }
  }

  // Processar pedidos pagos sem código de rastreio
  async processarPedidosPagos(): Promise<void> {
    try {
      console.log('🔄 Processando pedidos pagos sem código de rastreio...');

      // Buscar pedidos pagos sem código de rastreio
      const pedidosSemRastreio = await prisma.order.findMany({
        where: {
          OR: [
            { status: 'PAID' },
            { paymentStatus: 'PAID' }
          ],
          AND: [
            {
              OR: [
                { trackingNumber: null },
                { trackingNumber: '' },
                { trackingNumber: 'Não disponível' },
                { trackingNumber: 'Ainda não disponível' }
              ]
            }
          ]
        },
        take: 10 // Processar máximo 10 por vez
      });

      console.log(`📊 Encontrados ${pedidosSemRastreio.length} pedidos para processar`);

      for (const pedido of pedidosSemRastreio) {
        await this.gerarCodigoRastreio(pedido.id);
        // Aguarda 2 segundos entre cada chamada para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('✅ Processamento de pedidos pagos concluído');
    } catch (error) {
      console.error('❌ Erro ao processar pedidos pagos:', error);
    }
  }
}

// Exportar uma instância única do serviço
export const orderService = new OrderService();
export default orderService; 