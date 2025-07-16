import { Order, OrderStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { correiosService } from './correios.service';
import emailService from './email.service';

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

  /**
   * Gerar código de rastreio para um pedido específico
   * @param orderId ID do pedido
   * @returns Objeto com o código de rastreio
   */
  async gerarCodigoRastreio(orderId: number): Promise<{ trackingNumber: string }> {
    try {
      console.log(`📦 Gerando código de rastreio para pedido ${orderId}`);
      
      // Buscar pedido com endereço
      const pedido = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  weight: true,
                  height: true,
                  width: true,
                  length: true
                }
              },
              productVariant: {
                select: {
                  id: true,
                  weight: true
                }
              }
            }
          },
          user: { // ✅ Incluir dados do usuário se disponível
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (!pedido) {
        throw new Error(`Pedido ${orderId} não encontrado`);
      }
      
      // Verificar se o pedido já tem código de rastreio válido
      if (pedido.trackingNumber && 
          pedido.trackingNumber !== '' && 
          pedido.trackingNumber !== 'Não disponível' && 
          pedido.trackingNumber !== 'Ainda não disponível' &&
          pedido.trackingNumber.length >= 13) { // Código dos Correios tem pelo menos 13 caracteres
        console.log(`⚠️ Pedido ${orderId} já possui código de rastreio válido: ${pedido.trackingNumber}`);
        return { trackingNumber: pedido.trackingNumber };
      }
      
      // Verificar se o pedido está pago
      if (pedido.status !== 'PAID' && pedido.paymentStatus !== 'PAID') {
        throw new Error(`Pedido ${orderId} não está pago. Status: ${pedido.status}, PaymentStatus: ${pedido.paymentStatus}`);
      }

      // Verificar se tem paymentId para confirmar que foi processado pelo gateway
      if (!pedido.paymentId) {
        throw new Error(`Pedido ${orderId} não possui ID de pagamento. Pode não ter sido processado corretamente.`);
      }

      // Verificar se tem email do cliente
      if (!pedido.customerEmail) {
        throw new Error(`Pedido ${orderId} não possui email do cliente`);
      }

      // Verificar se tem endereço de entrega
      if (!pedido.shippingAddress) {
        throw new Error(`Pedido ${orderId} não possui endereço de entrega`);
      }

      // ✅ COMPLETAR DADOS DO CLIENTE COM INFORMAÇÕES DO USUÁRIO
      let customerName = pedido.customerName;
      let customerPhone = pedido.customerPhone;
      let customerDocument = pedido.customerDocument;

      // Se o pedido tem usuário vinculado e dados estão faltando, completar
      if (pedido.user) {
        if (!customerName && pedido.user.name) {
          customerName = pedido.user.name;
          console.log(`✅ Nome do cliente completado com dados do usuário: ${customerName}`);
        }
        // Telefone e documento não estão no modelo User, usar apenas dados do pedido

        // Atualizar o pedido com os dados completos se nome foi alterado
        if (customerName !== pedido.customerName) {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              customerName: customerName || pedido.customerName
            }
          });
          console.log(`✅ Nome do cliente atualizado no pedido ${orderId}`);
        }
      }
      
      // Obter endereço do pedido com melhor tratamento
      let endereco: any = null;
      
      try {
        // Primeiro tenta fazer parse como JSON
        if (pedido.shippingAddress.startsWith('{')) {
          endereco = JSON.parse(pedido.shippingAddress);
        } else {
          // Se não for JSON, tenta extrair do formato string
          endereco = this.parseEnderecoString(pedido.shippingAddress, customerName);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar endereço do pedido ${orderId}:`, error);
        console.log(`- shippingAddress raw: ${pedido.shippingAddress}`);
        console.log(`- shippingAddress length: ${pedido.shippingAddress.length}`);
        console.log(`- shippingAddress type: ${typeof pedido.shippingAddress}`);
        
        // Última tentativa: extrair do formato string
        try {
          endereco = this.parseEnderecoString(pedido.shippingAddress, customerName);
        } catch (parseError) {
          throw new Error(`Endereço do pedido ${orderId} não é válido e não pode ser processado`);
        }
      }
      
      // Validar campos obrigatórios do endereço
      if (!endereco || !endereco.zipCode) {
        throw new Error(`Endereço do pedido ${orderId} não possui CEP`);
      }

      if (!endereco.city || !endereco.state) {
        throw new Error(`Endereço do pedido ${orderId} não possui cidade ou estado`);
      }

      if (!endereco.street || !endereco.number) {
        throw new Error(`Endereço do pedido ${orderId} não possui logradouro ou número`);
      }

      // ✅ GARANTIR QUE O NOME ESTEJA NO ENDEREÇO
      if (!endereco.name) {
        endereco.name = customerName || 'Destinatário';
      }

      // ✅ GARANTIR QUE DOCUMENTO E TELEFONE ESTEJAM DISPONÍVEIS
      if (!endereco.document && customerDocument) {
        endereco.document = customerDocument;
      }
      if (!endereco.phone && customerPhone) {
        endereco.phone = customerPhone;
      }
      if (!endereco.email && pedido.customerEmail) {
        endereco.email = pedido.customerEmail;
      }
      
      // Calcular peso total do pedido considerando variações
      const pesoTotal = pedido.items.reduce((total, item) => {
        // Usar peso da variação se disponível, senão usar peso do produto
        const peso = item.productVariant?.weight || item.product?.weight || 0.5;
        return total + (peso * item.quantity);
      }, 0);

      // Peso mínimo de 100g
      const pesoFinal = Math.max(pesoTotal, 0.1);
      
      console.log(`📋 Dados COMPLETOS do pedido ${orderId}:`);
      console.log(`- Destinatário: ${endereco.name}`);
      console.log(`- Email: ${endereco.email}`);
      console.log(`- Documento cliente: ${endereco.document || 'NÃO INFORMADO'}`);
      console.log(`- Telefone cliente: ${endereco.phone || 'NÃO INFORMADO'}`);
      console.log(`- Endereço completo: ${pedido.shippingAddress}`);
      console.log(`- Endereço parseado:`);
      console.log(`  • Logradouro: ${endereco.street}`);
      console.log(`  • Número: ${endereco.number}`);
      console.log(`  • Bairro: ${endereco.neighborhood}`);
      console.log(`  • Cidade: ${endereco.city}`);
      console.log(`  • Estado: ${endereco.state}`);
      console.log(`  • CEP: ${endereco.zipCode}`);
      console.log(`- Peso total: ${pesoFinal}kg`);
      console.log(`- Valor: R$ ${pedido.total}`);
      
      // Chamar serviço dos Correios com dados COMPLETOS
      const resultado = await correiosService.criarPrepostagemPedido({
        orderId: pedido.id,
        destinatario: {
          nome: endereco.name,
          documento: endereco.document || customerDocument || '',
          telefone: endereco.phone || customerPhone || '',
          email: endereco.email || pedido.customerEmail,
          endereco: {
            logradouro: endereco.street,
            numero: endereco.number,
            complemento: endereco.complement || '',
            bairro: endereco.neighborhood,
            cidade: endereco.city,
            uf: endereco.state,
            cep: endereco.zipCode.replace(/\D/g, '') // Limpar CEP
          }
        },
        servico: '03298', // PAC Contrato
        peso: pesoFinal,
                 valor: Number(pedido.total),
        observacao: `Pedido #${pedido.id} - Kimono Store`
      });
      
      if (!resultado || !resultado.codigoObjeto) {
        throw new Error(`Não foi possível gerar código de rastreio para o pedido ${orderId}. Resposta dos Correios: ${JSON.stringify(resultado)}`);
      }
      
      const codigoRastreio = resultado.codigoObjeto;
      console.log(`✅ Código de rastreio gerado com sucesso para o pedido ${orderId}: ${codigoRastreio}`);
      
      // Atualizar pedido com código de rastreio
      await prisma.order.update({
        where: { id: orderId },
        data: {
          trackingNumber: codigoRastreio,
          status: 'PROCESSING', // Atualiza status para "em processamento"
          updatedAt: new Date()
        }
      });
      
      // Enviar e-mail para o cliente com o código de rastreio
      try {
        await this.enviarEmailRastreio(pedido, codigoRastreio);
      } catch (emailError) {
        console.error(`❌ Erro ao enviar e-mail com código de rastreio para o pedido ${orderId}:`, emailError);
        // Não falhar a operação por causa do e-mail
      }
      
      return { trackingNumber: codigoRastreio };
      
    } catch (error) {
      console.error(`❌ Erro ao gerar código de rastreio para o pedido ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Enviar e-mail com código de rastreio para o cliente
   * @param pedido Pedido com os dados do cliente
   * @param codigoRastreio Código de rastreio gerado
   */
  private async enviarEmailRastreio(pedido: any, codigoRastreio: string): Promise<void> {
    try {
      // Verificar se temos um e-mail para enviar
      let emailCliente = '';
      
      // Tentar obter e-mail do cliente diretamente
      if (pedido.customerEmail) {
        emailCliente = pedido.customerEmail;
      }
      // Ou tentar obter do endereço
      else if (pedido.shippingAddress) {
        try {
          const endereco = JSON.parse(pedido.shippingAddress as string);
          emailCliente = endereco.email || '';
        } catch (e) {
          // Ignorar erro de parse
        }
      }
      // Se não encontrou, tentar obter do usuário
      if (!emailCliente && pedido.user?.email) {
        emailCliente = pedido.user.email;
      }
      
      // Se não temos e-mail, não podemos enviar
      if (!emailCliente) {
        console.log(`⚠️ Não foi possível enviar e-mail de rastreio para o pedido ${pedido.id}: e-mail não encontrado`);
        return;
      }
      
      // Calcular estimativa de entrega (7 dias úteis a partir de hoje)
      const dataEstimada = new Date();
      dataEstimada.setDate(dataEstimada.getDate() + 7); // +7 dias
      const estimatedDelivery = dataEstimada.toLocaleDateString('pt-BR');
      
      // Enviar e-mail
      await emailService.sendTrackingCodeNotification({
        orderId: pedido.id,
        customerName: pedido.customerName || 'Cliente',
        customerEmail: emailCliente,
        trackingNumber: codigoRastreio,
        shippingCarrier: 'Correios',
        estimatedDelivery: estimatedDelivery
      });
      
      console.log(`📧 E-mail com código de rastreio enviado para ${emailCliente}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar e-mail de rastreio:`, error);
      throw error;
    }
  }

  // Processar pedidos pagos sem código de rastreio
  async processarPedidosPagos(): Promise<{ processados: number }> {
    try {
      console.log('🔄 Processando pedidos pagos sem código de rastreio...');

      // Buscar pedidos pagos nos últimos 10 dias para evitar processar pedidos muito antigos
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 10);

      // Buscar pedidos pagos sem código de rastreio com critérios mais restritivos
      const pedidosSemRastreio = await prisma.order.findMany({
        where: {
          // Deve ter status PAID E paymentStatus PAID
          AND: [
            {
              OR: [
                { status: 'PAID' },
                { paymentStatus: 'PAID' }
              ]
            },
            {
              OR: [
                { trackingNumber: null },
                { trackingNumber: '' },
                { trackingNumber: 'Não disponível' },
                { trackingNumber: 'Ainda não disponível' }
              ]
            },
            // Pedidos criados nos últimos 10 dias
            {
              createdAt: {
                gte: dataLimite
              }
            },
            // Deve ter ID de pagamento para confirmar que foi processado
            {
              paymentId: {
                not: null
              }
            },
            // Não deve estar cancelado
            {
              status: {
                not: 'CANCELED'
              }
            }
          ]
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  weight: true,
                  height: true,
                  width: true,
                  length: true
                }
              },
              productVariant: {
                select: {
                  id: true,
                  weight: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc' // Processar pedidos mais antigos primeiro
        },
        take: 10 // Processar máximo 10 por vez
      });

      console.log(`📊 Encontrados ${pedidosSemRastreio.length} pedidos pagos nos últimos 10 dias`);

      let processados = 0;
      for (const pedido of pedidosSemRastreio) {
        try {
          console.log(`🔍 Processando pedido ${pedido.id}:`);
          console.log(`- Status: ${pedido.status}`);
          console.log(`- PaymentStatus: ${pedido.paymentStatus}`);
          console.log(`- PaymentId: ${pedido.paymentId}`);
          console.log(`- TrackingNumber: ${pedido.trackingNumber || 'null'}`);
          console.log(`- CustomerEmail: ${pedido.customerEmail}`);
          console.log(`- Total: R$ ${pedido.total}`);
          console.log(`- Items: ${pedido.items.length}`);

          // Validação adicional antes de processar
          if (!pedido.customerEmail) {
            console.log(`⚠️ Pulando pedido ${pedido.id}: sem email do cliente`);
            continue;
          }

          if (!pedido.shippingAddress) {
            console.log(`⚠️ Pulando pedido ${pedido.id}: sem endereço de entrega`);
            continue;
          }

          if (pedido.items.length === 0) {
            console.log(`⚠️ Pulando pedido ${pedido.id}: sem itens`);
            continue;
          }

          await this.gerarCodigoRastreio(pedido.id);
          processados++;
          console.log(`✅ Pedido ${pedido.id} processado com sucesso (${processados}/${pedidosSemRastreio.length})`);
          
          // Aguarda 3 segundos entre cada chamada para não sobrecarregar a API
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          console.error(`❌ Erro ao processar pedido ${pedido.id}:`, error);
          // Continua para o próximo pedido mesmo se houver erro
        }
      }

      console.log(`✅ Processamento de pedidos pagos concluído. ${processados} de ${pedidosSemRastreio.length} pedidos processados com sucesso.`);
      return { processados };
    } catch (error) {
      console.error('❌ Erro ao processar pedidos pagos:', error);
      throw error;
    }
  }

  // Contar pedidos pagos aguardando código de rastreio
  async contarPedidosPagosAguardandoRastreio(): Promise<number> {
    try {
      // Contar apenas pedidos dos últimos 10 dias
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 10);

      const count = await prisma.order.count({
        where: {
          AND: [
            {
              OR: [
                { status: 'PAID' },
                { paymentStatus: 'PAID' }
              ]
            },
            {
              OR: [
                { trackingNumber: null },
                { trackingNumber: '' },
                { trackingNumber: 'Não disponível' },
                { trackingNumber: 'Ainda não disponível' }
              ]
            },
            {
              createdAt: {
                gte: dataLimite
              }
            },
            {
              paymentId: {
                not: null
              }
            },
            {
              status: {
                not: 'CANCELED'
              }
            }
          ]
        }
      });
      
      return count;
    } catch (error) {
      console.error('❌ Erro ao contar pedidos pagos sem código de rastreio:', error);
      return 0;
    }
  }

  // Helper para parsear endereço de string para JSON - versão robusta
  private parseEnderecoString(addressString: string, customerName: string | null): any {
    console.log(`- Processando como endereço formatado: ${addressString}`);
    
    // Separar por vírgulas
    const parts = addressString.split(',').map(part => part.trim());
    console.log(`- Partes separadas por vírgula:`, parts);
    
    let street = '', number = '', complement = '', neighborhood = '', city = '', state = '', zipCode = '';
    
    if (parts.length >= 4) {
      // Formato padrão brasileiro: Rua, Número, Bairro, Cidade - Estado, CEP
      street = parts[0] || '';
      number = parts[1] || 'S/N';
      neighborhood = parts[2] || '';
      
      // A última parte pode ter CEP separado ou junto com cidade/estado
      const lastPart = parts[parts.length - 1] || '';
      let cityStatePart = parts[3] || '';
      
      // Extrair CEP primeiro (formato brasileiro: 12345-123 ou 12345123)
      const cepMatch = addressString.match(/(\d{5}-?\d{3})/);
      if (cepMatch) {
        zipCode = cepMatch[1];
        // Remover CEP da string para processar cidade/estado
        cityStatePart = cityStatePart.replace(cepMatch[1], '').trim();
        // Se CEP estava em parte separada, usar a parte anterior
        if (lastPart.includes(cepMatch[1]) && parts.length > 4) {
          cityStatePart = parts[3];
        }
      }
      
      // Processar cidade e estado (formato: "Cidade - Estado" ou "Cidade/Estado")
      if (cityStatePart.includes(' - ')) {
        const [cityPart, statePart] = cityStatePart.split(' - ');
        city = cityPart.trim();
        state = statePart.trim();
      } else if (cityStatePart.includes('/')) {
        const [cityPart, statePart] = cityStatePart.split('/');
        city = cityPart.trim();
        state = statePart.trim();
      } else {
        // Tentar extrair estado como últimas 2 letras maiúsculas
        const stateMatch = cityStatePart.match(/\b([A-Z]{2})$/);
        if (stateMatch) {
          state = stateMatch[1];
          city = cityStatePart.replace(stateMatch[0], '').trim();
        } else {
          city = cityStatePart;
          // Tentar extrair estado do endereço completo
          const fullStateMatch = addressString.match(/\b([A-Z]{2})\b/);
          if (fullStateMatch) {
            state = fullStateMatch[1];
          }
        }
      }
    } 
    else if (parts.length >= 3) {
      // Formato mais simples: Rua, Número, Resto
      street = parts[0] || '';
      number = parts[1] || 'S/N';
      
      // Combinar o resto e tentar extrair informações
      const remainingText = parts.slice(2).join(', ');
      
      // Extrair CEP
      const cepMatch = remainingText.match(/(\d{5}-?\d{3})/);
      if (cepMatch) {
        zipCode = cepMatch[1];
      }
      
      // Extrair estado (2 letras maiúsculas)
      const stateMatch = remainingText.match(/\b([A-Z]{2})\b/);
      if (stateMatch) {
        state = stateMatch[1];
      }
      
      // O que sobrar é bairro e cidade
      let cleanText = remainingText.replace(/\d{5}-?\d{3}/, '').replace(/\b[A-Z]{2}\b/, '').replace(/[-,]+$/, '').trim();
      
      // Se tem hífen, provavelmente separa bairro de cidade
      if (cleanText.includes(' - ')) {
        const textParts = cleanText.split(' - ');
        neighborhood = textParts[0]?.trim() || '';
        city = textParts[1]?.trim() || '';
      } else {
        // Assumir que é tudo cidade ou dividir meio a meio
        const words = cleanText.split(/\s+/);
        if (words.length > 2) {
          neighborhood = words.slice(0, Math.floor(words.length / 2)).join(' ');
          city = words.slice(Math.floor(words.length / 2)).join(' ');
        } else {
          city = cleanText;
        }
      }
    }
    else if (parts.length >= 2) {
      // Mínimo: Rua, Número
      street = parts[0] || '';
      number = parts[1] || 'S/N';
      
      // Tentar extrair outras informações do primeiro campo se for muito longo
      if (street.length > 50) {
        const streetParts = street.split(/\s+/);
        if (streetParts.length > 3) {
          street = streetParts.slice(0, 3).join(' ');
          // O resto pode ser bairro
          neighborhood = streetParts.slice(3).join(' ');
        }
      }
      
      city = 'Cidade não informada';
    }
    else {
      // Apenas um campo - provavelmente endereço completo mal formatado
      street = addressString;
      number = 'S/N';
      city = 'Verificar endereço';
    }
    
    // Limpar e formatar campos
    street = street.replace(/^(Rua|Av|Avenida|R\.|Av\.)\s*/i, '').trim();
    number = number.replace(/[^\d\-A-Za-z]/g, '') || 'S/N';
    neighborhood = neighborhood.replace(/^[-,\s]+|[-,\s]+$/g, '');
    city = city.replace(/^[-,\s]+|[-,\s]+$/g, '');
    state = state.replace(/[^A-Z]/g, '');
    zipCode = zipCode.replace(/[^\d\-]/g, '');
    
    // Garantir formato do CEP
    if (zipCode && zipCode.length === 8 && !zipCode.includes('-')) {
      zipCode = zipCode.substring(0, 5) + '-' + zipCode.substring(5);
    }
    
    // Limpeza do logradouro (remover prefixos comuns)
    const cleanStreet = (str: string): string => {
      if (!str) return str;
      return str.replace(/^(Rua|Av\.?|Avenida|Travessa|Alameda|Praça|R\.)\s+/i, '').trim();
    };

    const cleanedStreet = cleanStreet(street);
    
    console.log(`🔧 Limpeza do logradouro:`);
    console.log(`- Original: "${street}"`);
    console.log(`- Limpo: "${cleanedStreet}"`);

    const endereco = {
      name: customerName || 'Destinatário',
      street: cleanedStreet || 'Endereço não disponível',
      number: number || 'S/N',
      complement: complement,
      neighborhood: neighborhood || '',
      city: city || 'Cidade não informada',
      state: state || '',
      zipCode: zipCode || '',
      document: '', // Não disponível na string
      phone: '', // Não disponível na string
      email: '', // Não disponível na string
    };
    
    console.log(`- Endereço extraído da string:`, endereco);
    return endereco;
  }
}

// Exportar uma instância única do serviço
export const orderService = new OrderService();
export default orderService; 