import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma';
import mercadoPagoService from '../services/mercadopago.service';
import { OrderStatus } from '@prisma/client';
import { validateDocument } from '../utils/validation';
import { orderService } from '../services/order.service';
import emailService from '../services/email.service';
import { validateCPFForMercadoPago, formatPhoneForMercadoPago, generateExternalReference, processMercadoPagoError } from '../utils/mercadopago-errors';

// Schema para validação de pagamento com cartão de crédito
const creditCardPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  creditCard: z.object({
    holderName: z.string().min(1, 'Nome do titular é obrigatório'),
    number: z.string().min(13, 'Número do cartão inválido').max(19, 'Número do cartão inválido'),
    expiryMonth: z.string().min(1, 'Mês de expiração é obrigatório').max(2, 'Mês de expiração inválido'),
    expiryYear: z.string().min(2, 'Ano de expiração é obrigatório').max(4, 'Ano de expiração inválido'),
    ccv: z.string().min(3, 'CCV inválido').max(4, 'CCV inválido'),
  }),
  holderInfo: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido'),
    postalCode: z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
    addressNumber: z.string().min(1, 'Número do endereço é obrigatório'),
    addressComplement: z.string().optional(),
    phone: z.string().min(10, 'Telefone inválido').max(11, 'Telefone inválido'),
  }),
  installments: z.number().int().min(1).max(12).optional(),
});

// Schema para validação de pagamento via PIX
const pixPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido').optional(),
});

// Schema para validação de pagamento com cartão de débito
const debitCardPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  debitCard: z.object({
    holderName: z.string().min(1, 'Nome do titular é obrigatório'),
    number: z.string().min(13, 'Número do cartão inválido').max(19, 'Número do cartão inválido'),
    expiryMonth: z.string().min(1, 'Mês de expiração é obrigatório').max(2, 'Mês de expiração inválido'),
    expiryYear: z.string().min(2, 'Ano de expiração é obrigatório').max(4, 'Ano de expiração inválido'),
    ccv: z.string().min(3, 'CCV inválido').max(4, 'CCV inválido'),
  }),
  holderInfo: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido'),
    postalCode: z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
    addressNumber: z.string().min(1, 'Número do endereço é obrigatório'),
    addressComplement: z.string().optional(),
    phone: z.string().min(10, 'Telefone inválido').max(11, 'Telefone inválido'),
  }),
  installments: z.number().int().min(1).max(12).optional(),
});

// Schema para webhook
const webhookSchema = z.object({
  type: z.string(),
  action: z.string(),
  data: z.object({
    id: z.string(),
  }),
});

// Processar pagamento com cartão de crédito
export const processCreditCardPayment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const validation = creditCardPaymentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format() 
      });
    }

    const { orderId, creditCard, holderInfo, installments } = validation.data;

    // Validar CPF/CNPJ
    if (!validateDocument(holderInfo.cpfCnpj)) {
      return res.status(400).json({
        error: 'CPF/CNPJ inválido',
        message: 'O número de CPF/CNPJ fornecido não é válido'
      });
    }

    // Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Verificar se o usuário é o dono do pedido
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o pedido já foi pago
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Este pedido não está pendente de pagamento' });
    }

    // Primeiro criar o token do cartão
    const cardToken = await mercadoPagoService.createCardToken({
      card_number: creditCard.number,
      security_code: creditCard.ccv,
      expiration_month: Number(creditCard.expiryMonth),
      expiration_year: Number(creditCard.expiryYear),
      cardholder: {
        name: creditCard.holderName,
        identification: {
          type: holderInfo.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
          number: holderInfo.cpfCnpj
        }
      }
    });

    // Preparar dados do pagador
    const [firstName, ...lastNameParts] = holderInfo.name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

          // Criar pagamento no Mercado Pago
      const payment = await mercadoPagoService.createPayment({
        transaction_amount: Number(order.total),
        token: cardToken,
        description: `Pedido #${order.id}`,
        installments: installments || 1,
        // payment_method_id removido - será detectado automaticamente pelo token
        payer: {
        email: order.user?.email || holderInfo.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: holderInfo.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
          number: holderInfo.cpfCnpj
        },
        phone: {
          area_code: holderInfo.phone.slice(0, 2),
          number: holderInfo.phone.slice(2)
        },
        address: {
          zip_code: holderInfo.postalCode,
          street_number: holderInfo.addressNumber
        }
      },
      external_reference: String(order.id),
      metadata: {
        order_id: String(order.id)
      }
    });

    // Atualizar o pedido com as informações de pagamento
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status) as OrderStatus,
      }
    });

    return res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        transaction_amount: payment.transaction_amount,
        orderStatus: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status),
      }
    });
  } catch (error: any) {
    console.error('Erro ao processar pagamento com cartão:', error);
    
    // Verificar se é um erro de resposta da API
    if (error.response?.data?.cause?.length > 0) {
      const apiError = error.response.data.cause[0];
      let errorMessage = apiError.description || 'Erro ao processar pagamento';
      
      // Mapear códigos de erro específicos do Mercado Pago
      switch (apiError.code) {
        case 'invalid_card_number':
          errorMessage = 'Número do cartão inválido';
          break;
        case 'invalid_expiration_date':
          errorMessage = 'Data de expiração inválida';
          break;
        case 'invalid_security_code':
          errorMessage = 'Código de segurança inválido';
          break;
        case 'invalid_issuer':
          errorMessage = 'Emissor do cartão inválido';
          break;
        case 'rejected_insufficient_amount':
          errorMessage = 'Cartão sem limite suficiente';
          break;
        case 'rejected_high_risk':
          errorMessage = 'Pagamento rejeitado por segurança';
          break;
        default:
          errorMessage = apiError.description || 'Erro no processamento do pagamento';
      }
      
      return res.status(400).json({
        error: errorMessage,
        code: apiError.code
      });
    }
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor ao processar pagamento',
      message: error.message 
    });
  }
};

// Processar pagamento com cartão de débito (similar ao crédito no Mercado Pago)
export const processDebitCardPayment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const validation = debitCardPaymentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format() 
      });
    }

    const { orderId, debitCard, holderInfo, installments } = validation.data;

    // Validar CPF/CNPJ
    if (!validateDocument(holderInfo.cpfCnpj)) {
      return res.status(400).json({
        error: 'CPF/CNPJ inválido',
        message: 'O número de CPF/CNPJ fornecido não é válido'
      });
    }

    // Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Verificar se o usuário é o dono do pedido
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o pedido já foi pago
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Este pedido não está pendente de pagamento' });
    }

    // Primeiro criar o token do cartão
    const cardToken = await mercadoPagoService.createCardToken({
      card_number: debitCard.number,
      security_code: debitCard.ccv,
      expiration_month: Number(debitCard.expiryMonth),
      expiration_year: Number(debitCard.expiryYear),
      cardholder: {
        name: debitCard.holderName,
        identification: {
          type: holderInfo.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
          number: holderInfo.cpfCnpj
        }
      }
    });

    // Preparar dados do pagador
    const [firstName, ...lastNameParts] = holderInfo.name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    // Criar pagamento no Mercado Pago (débito = crédito com 1 parcela)
    const payment = await mercadoPagoService.createPayment({
      transaction_amount: Number(order.total),
      token: cardToken,
      description: `Pedido #${order.id}`,
      installments: 1, // Débito sempre 1 parcela
      // payment_method_id removido - será detectado automaticamente pelo token
      payer: {
        email: order.user?.email || holderInfo.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: holderInfo.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
          number: holderInfo.cpfCnpj
        },
        phone: {
          area_code: holderInfo.phone.slice(0, 2),
          number: holderInfo.phone.slice(2)
        },
        address: {
          zip_code: holderInfo.postalCode,
          street_number: holderInfo.addressNumber
        }
      },
      external_reference: String(order.id),
      metadata: {
        order_id: String(order.id)
      }
    });

    // Atualizar o pedido com as informações de pagamento
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status) as OrderStatus,
      }
    });

    return res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        transaction_amount: payment.transaction_amount,
        orderStatus: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status),
      }
    });
  } catch (error: any) {
    console.error('Erro ao processar pagamento com cartão de débito:', error);
    
    if (error.response?.data?.cause?.length > 0) {
      const apiError = error.response.data.cause[0];
      return res.status(400).json({
        error: apiError.description || 'Erro ao processar pagamento',
        code: apiError.code
      });
    }
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor ao processar pagamento',
      message: error.message 
    });
  }
};

// Gerar link de pagamento (usando preferência do Mercado Pago)
export const generatePaymentLink = async (req: Request, res: Response) => {
  try {
    // Para usuários guest, não exigir autenticação
    const isGuest = !req.user;
    
    // Validação diferente para guest vs autenticado
    let validation;
    if (isGuest) {
      // Schema para guest payment
      const guestPaymentSchema = z.object({
        orderId: z.string(),
        billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD']),
        cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido'),
        email: z.string().email('Email inválido'),
        name: z.string().min(1, 'Nome é obrigatório'),
        creditCard: z.object({
          holderName: z.string().min(1, 'Nome do titular é obrigatório'),
          number: z.string().min(13, 'Número do cartão inválido').max(19, 'Número do cartão inválido'),
          expiryMonth: z.string().min(1, 'Mês de expiração é obrigatório').max(2, 'Mês de expiração inválido'),
          expiryYear: z.string().min(2, 'Ano de expiração é obrigatório').max(4, 'Ano de expiração inválido'),
          cvv: z.string().min(3, 'CVV inválido').max(4, 'CVV inválido'),
        }).optional(),
        installments: z.number().int().min(1).max(12).optional(),
      });

      validation = guestPaymentSchema.safeParse(req.body);
    } else {
      validation = pixPaymentSchema.safeParse(req.body);
    }
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format() 
      });
    }

    let orderId: number;
    let cpfCnpj: string;
    let customerEmail: string = '';
    let customerName: string = '';

    let creditCard: any;
    let installments: number;

    if (isGuest) {
      const { orderId: guestOrderId, billingType, cpfCnpj: guestCpfCnpj, email, name, creditCard: guestCreditCard, installments: guestInstallments } = validation.data as any;
      orderId = Number(guestOrderId);
      cpfCnpj = guestCpfCnpj;
      customerEmail = email;
      customerName = name;
      creditCard = guestCreditCard;
      installments = guestInstallments || 1;
    } else {
      const { orderId: authOrderId, cpfCnpj: authCpfCnpj } = validation.data as any;
      orderId = authOrderId;
      cpfCnpj = authCpfCnpj || '';
      installments = 1;
    }

    // Buscar o pedido
    const order = await prisma.order.findUnique({
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
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Para usuários autenticados, verificar se é o dono do pedido
    if (!isGuest && order.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o pedido já foi pago
    if (order.status !== 'PENDING') {
      return res.status(400).json({ error: 'Este pedido não está pendente de pagamento' });
    }

    // Preparar dados do pagador
    const payerName = isGuest ? customerName : (order.user?.name || 'Cliente');
    const payerEmail = isGuest ? customerEmail : (order.user?.email || '');
    
    const [firstName, ...lastNameParts] = payerName.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    // Validar CPF/CNPJ se fornecido
    if (cpfCnpj && !validateDocument(cpfCnpj)) {
      return res.status(400).json({
        error: 'CPF/CNPJ inválido',
        message: 'O número de CPF/CNPJ fornecido não é válido'
      });
    }

    // Determinar o tipo de pagamento baseado no billingType (para guest) ou método padrão PIX
    const billingType = isGuest ? (validation.data as any).billingType : 'PIX';
    let payment;

    if (billingType === 'PIX') {
      // Criar pagamento PIX no Mercado Pago
      payment = await mercadoPagoService.createPixPayment({
        transaction_amount: Number(order.total),
        description: `Pedido #${order.id}`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: cpfCnpj ? {
            type: cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
            number: cpfCnpj
          } : undefined
        },
        external_reference: String(order.id)
      });

      // Obter informações do PIX
      const pixInfo = await mercadoPagoService.getPixInfo(String(payment.id));

      // Atualizar o pedido com as informações de pagamento
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status) as OrderStatus,
        }
      });

      return res.json({
        success: true,
        orderId: order.id,
        payment: {
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
          transaction_amount: payment.transaction_amount,
          orderStatus: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status),
          pixQrCode: pixInfo.qrCode,
          pixEncodedImage: pixInfo.qrCodeBase64,
          pixCodeQrCode: pixInfo.qrCode,
          pixCodeBase64: pixInfo.qrCodeBase64,
          value: payment.transaction_amount,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
        }
      });
    } else if (billingType === 'BOLETO') {
      // Criar pagamento boleto no Mercado Pago
      payment = await mercadoPagoService.createPayment({
        transaction_amount: Number(order.total),
        description: `Pedido #${order.id}`,
        payment_method_id: 'bolbradesco',
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: cpfCnpj ? {
            type: cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
            number: cpfCnpj
          } : undefined
        },
        external_reference: String(order.id)
      });

      // Atualizar o pedido com as informações de pagamento
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status) as OrderStatus,
        }
      });

      return res.json({
        success: true,
        orderId: order.id,
        payment: {
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
          transaction_amount: payment.transaction_amount,
          orderStatus: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status),
          bankSlipUrl: payment.transaction_details?.external_resource_url,
          invoiceUrl: payment.transaction_details?.external_resource_url,
          value: payment.transaction_amount,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias
        }
      });
    } else if (billingType === 'CREDIT_CARD' || billingType === 'DEBIT_CARD') {
      // Validar dados do cartão
      if (!creditCard) {
        return res.status(400).json({
          error: 'Dados do cartão são obrigatórios',
          message: 'Para pagamentos com cartão, é necessário informar os dados do cartão'
        });
      }

      // Criar token do cartão
      const cardToken = await mercadoPagoService.createCardToken({
        card_number: creditCard.number.replace(/\s/g, ''),
        security_code: creditCard.cvv,
        expiration_month: Number(creditCard.expiryMonth),
        expiration_year: Number(creditCard.expiryYear),
        cardholder: {
          name: creditCard.holderName,
          identification: {
            type: cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
            number: cpfCnpj
          }
        }
      });

      // Criar pagamento com cartão
      payment = await mercadoPagoService.createPayment({
        transaction_amount: Number(order.total),
        token: cardToken,
        description: `Pedido #${order.id}`,
        installments: billingType === 'DEBIT_CARD' ? 1 : installments,
        // payment_method_id será detectado automaticamente pelo token
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
            number: cpfCnpj
          }
        },
        external_reference: String(order.id),
        metadata: {
          order_id: String(order.id)
        }
      });

      // Atualizar o pedido com as informações de pagamento
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status) as OrderStatus,
        }
      });

      return res.json({
        success: true,
        orderId: order.id,
        payment: {
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
          transaction_amount: payment.transaction_amount,
          orderStatus: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status),
          value: payment.transaction_amount,
        }
      });
    }

    throw new Error('Tipo de pagamento não suportado');
  } catch (error: any) {
    console.error('Erro ao gerar link de pagamento:', error);
    
    if (error.response?.data?.cause?.length > 0) {
      const apiError = error.response.data.cause[0];
      return res.status(400).json({
        error: apiError.description || 'Erro ao gerar link de pagamento',
        code: apiError.code
      });
    }
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor ao gerar link de pagamento',
      message: error.message 
    });
  }
};

// Verificar status de pagamento
export const checkPaymentStatus = async (req: Request, res: Response) => {
  try {
    // Para usuários guest, não exigir autenticação
    const isGuest = !req.user;
    
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: 'ID do pedido é obrigatório' });
    }

    // Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { user: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Para usuários autenticados, verificar se é o dono do pedido
    if (!isGuest && order.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se existe um pagamento no Mercado Pago para este pedido
    try {
      const payments = await mercadoPagoService.getPaymentsByExternalReference(String(order.id));
      
      if (payments.length === 0) {
        return res.json({
          success: true,
          orderId: order.id,
          status: order.status,
          orderStatus: order.status,
          hasPayment: false,
          message: 'Nenhum pagamento encontrado para este pedido'
        });
      }

      // Pegar o último pagamento (mais recente)
      const latestPayment = payments[payments.length - 1];
      
      console.log('Status de pagamento do Mercado Pago:', latestPayment);

      // ✅ MAPEAR STATUS E ATUALIZAR APENAS SE NECESSÁRIO
      const orderStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(latestPayment.status);
      const newPaymentStatus = latestPayment.status === 'approved' ? 'PAID' : 'PENDING';

      // Atualizar o status do pedido se necessário
      if (order.status !== orderStatus || order.paymentStatus !== newPaymentStatus) {
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            status: orderStatus,
            paymentStatus: newPaymentStatus
          }
        });

        console.log(`✅ Status verificado e atualizado - Pedido ${order.id}: ${order.status} → ${orderStatus}, Payment: ${order.paymentStatus} → ${newPaymentStatus}`);
      }

      // Preparar informações do pagamento para retorno
      let paymentInfo: any = {
        id: latestPayment.id,
        status: latestPayment.status,
        value: latestPayment.transaction_amount,
        dueDate: latestPayment.date_created ? new Date(new Date(latestPayment.date_created).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      };

      // Adicionar informações específicas baseadas no método de pagamento
      if (latestPayment.payment_method_id === 'pix') {
        try {
          const pixInfo = await mercadoPagoService.getPixInfo(String(latestPayment.id));
          paymentInfo = {
            ...paymentInfo,
            pixQrCode: pixInfo.qrCode,
            pixEncodedImage: pixInfo.qrCodeBase64,
            pixCodeQrCode: pixInfo.qrCode,
            pixCodeBase64: pixInfo.qrCodeBase64,
          };
        } catch (pixError) {
          console.error('Erro ao obter informações PIX:', pixError);
        }
      } else if (latestPayment.payment_method_id?.includes('bol')) {
        paymentInfo = {
          ...paymentInfo,
          bankSlipUrl: latestPayment.transaction_details?.external_resource_url,
          invoiceUrl: latestPayment.transaction_details?.external_resource_url,
        };
      }

      return res.json({
        success: true,
        orderId: order.id,
        status: orderStatus,
        orderStatus,
        paymentStatus: latestPayment.status,
        hasPayment: true,
        paymentInfo,
        payment: {
          id: latestPayment.id,
          status: latestPayment.status,
          status_detail: latestPayment.status_detail,
          transaction_amount: latestPayment.transaction_amount,
          date_created: latestPayment.date_created,
          date_approved: latestPayment.date_approved
        }
      });
    } catch (error) {
      console.error('Erro ao verificar status de pagamento no Mercado Pago:', error);
      return res.status(500).json({
        error: 'Erro ao verificar status de pagamento',
        message: 'Não foi possível consultar o status do pagamento no momento'
      });
    }
  } catch (error: any) {
    console.error('Erro ao verificar status de pagamento:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ✅ WEBHOOK PARA RECEBER NOTIFICAÇÕES DO MERCADO PAGO
// Este é o método OFICIAL para atualizar status de pagamento para PAID
// Apenas este webhook deve marcar pedidos como PAID quando realmente aprovados
export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  try {
    console.log('🔔 Webhook recebido do Mercado Pago:', req.body);
    
    const validation = webhookSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.error('Webhook inválido:', validation.error);
      return res.status(400).json({ error: 'Dados do webhook inválidos' });
    }

    const { type, action, data } = validation.data;

    // Verificar se é um webhook de pagamento
    if (type !== 'payment') {
      console.log('Webhook ignorado - não é de pagamento:', type);
      return res.status(200).json({ received: true });
    }

    // Buscar detalhes do pagamento
    const payment = await mercadoPagoService.getPaymentStatus(data.id);
    
    if (!payment.external_reference) {
      console.log('Pagamento sem referência externa:', payment.id);
      return res.status(200).json({ received: true });
    }

    // Extrair ID do pedido da referência externa
    let orderId: number;
    
    if (payment.external_reference.includes('guest_order_')) {
      // Para pedidos guest, buscar pelo paymentId
      const guestOrder = await prisma.order.findFirst({
        where: { paymentId: String(payment.id) }
      });
      
      if (!guestOrder) {
        console.error('Pedido guest não encontrado para pagamento:', payment.id);
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      
      orderId = guestOrder.id;
    } else if (payment.external_reference.includes('guest_pix_') || payment.external_reference.includes('guest_boleto_')) {
      // Para PIX e Boleto guest, buscar pelo paymentId
      const guestOrder = await prisma.order.findFirst({
        where: { paymentId: String(payment.id) }
      });
      
      if (!guestOrder) {
        console.error('Pedido guest não encontrado para pagamento:', payment.id);
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }
      
      orderId = guestOrder.id;
    } else {
      // Para pedidos normais, usar a referência externa
      orderId = Number(payment.external_reference);
    }

    // Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.error('Pedido não encontrado para ID:', orderId);
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // ✅ ATUALIZAR STATUS APENAS SE MUDOU E FOR VÁLIDO
    const newStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status);
    const newPaymentStatus = payment.status === 'approved' ? 'PAID' : 'PENDING';
    
    // Só atualizar se o status realmente mudou
    if (order.status !== newStatus || order.paymentStatus !== newPaymentStatus) {
      await prisma.order.update({
        where: { id: order.id },
        data: { 
          status: newStatus,
          paymentStatus: newPaymentStatus
        }
      });

      console.log(`✅ Pedido ${order.id} atualizado: ${order.status} → ${newStatus}, Payment: ${order.paymentStatus} → ${newPaymentStatus}`);
    } else {
      console.log(`ℹ️ Pedido ${order.id} já está com status correto: ${newStatus}`);
    }

    // ✅ ENVIAR EMAIL APENAS SE PAGAMENTO FOI APROVADO AGORA (primeira vez)
    if (payment.status === 'approved' && order.paymentStatus !== 'PAID') {
      try {
        // Buscar pedido com itens para email
        const orderWithItems = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        });

        if (orderWithItems && orderWithItems.customerEmail) {
          const emailData = {
            orderId: orderWithItems.id,
            customerName: orderWithItems.customerName || 'Cliente',
            customerEmail: orderWithItems.customerEmail,
            total: Number(orderWithItems.total),
            items: orderWithItems.items.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              price: Number(item.price)
            })),
            paymentMethod: orderWithItems.paymentMethod || 'CARTAO'
          };

          await emailService.sendPaymentConfirmation(emailData);
          console.log(`📧 Email de confirmação enviado para ${orderWithItems.customerEmail}`);
        }
      } catch (emailError) {
        console.error('❌ Erro ao enviar email de confirmação:', emailError);
        // Não falhar o webhook por causa do email
      }
    }
    
    return res.status(200).json({ 
      received: true,
      processed: true,
      orderId: order.id,
      newStatus,
      emailSent: payment.status === 'approved'
    });
  } catch (error: any) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Manter compatibilidade com nome antigo do webhook (para não quebrar integrações existentes)
export const asaasWebhook = mercadoPagoWebhook;

export const processCardPayment = async (req: Request, res: Response) => {
  try {
    console.log('🎯 Iniciando processamento de cartão para usuário logado:', {
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      email: req.user?.email,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    });

    const { orderData, cardData, paymentMethod = 'CREDIT_CARD' } = req.body;
    
    // ✅ VALIDAÇÃO RIGOROSA DE AUTENTICAÇÃO
    if (!req.user || !req.user.id || !req.user.email) {
      console.error('❌ FALHA DE SEGURANÇA: Tentativa de pagamento sem autenticação válida:', {
        hasUser: !!req.user,
        userId: req.user?.id,
        userEmail: req.user?.email,
        timestamp: new Date().toISOString(),
        ip: req.ip
      });
      
      return res.status(401).json({ 
        error: 'ACESSO_NEGADO',
        message: 'Usuário não autenticado. É obrigatório estar logado para realizar pagamentos.',
        code: 'AUTH_REQUIRED'
      });
    }

    // ✅ VALIDAÇÃO ADICIONAL: Verificar se o usuário ainda existe no banco
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, role: true }
      });

      if (!userExists) {
        console.error('❌ FALHA DE SEGURANÇA: Usuário não encontrado no banco:', {
          userId: req.user.id,
          email: req.user.email,
          timestamp: new Date().toISOString()
        });
        
        return res.status(401).json({
          error: 'USUARIO_INVALIDO',
          message: 'Usuário não encontrado. Faça login novamente.',
          code: 'USER_NOT_FOUND'
        });
      }

      console.log('✅ Usuário autenticado e validado:', {
        userId: userExists.id,
        email: userExists.email,
        role: userExists.role
      });

    } catch (dbError) {
      console.error('❌ Erro ao validar usuário no banco:', dbError);
      return res.status(500).json({
        error: 'ERRO_VALIDACAO',
        message: 'Erro interno ao validar usuário.',
        code: 'DB_ERROR'
      });
    }

    // ✅ VALIDAÇÃO DE DADOS OBRIGATÓRIOS
    if (!orderData) {
      console.error('❌ orderData ausente para usuário:', req.user.id);
      return res.status(400).json({ 
        error: 'DADOS_INCOMPLETOS',
        message: 'Dados do pedido são obrigatórios',
        code: 'MISSING_ORDER_DATA'
      });
    }

    // ✅ VALIDAÇÃO DE CONSISTÊNCIA: Email deve bater com usuário logado
    if (orderData.email && orderData.email !== req.user.email) {
      console.error('❌ FALHA DE SEGURANÇA: Email do pedido não confere com usuário logado:', {
        userId: req.user.id,
        userEmail: req.user.email,
        orderEmail: orderData.email
      });
      
      return res.status(400).json({
        error: 'EMAIL_INCONSISTENTE',
        message: 'Email do pedido deve ser igual ao email do usuário logado.',
        code: 'EMAIL_MISMATCH'
      });
    }

    // ✅ FORÇAR EMAIL DO USUÁRIO LOGADO
    orderData.email = req.user.email;

    if (!orderData.cpfCnpj || !orderData.address) {
      console.error('❌ Dados do pedido incompletos para usuário:', req.user.id, {
        cpfCnpj: !!orderData.cpfCnpj,
        address: !!orderData.address
      });
      return res.status(400).json({ 
        error: 'DADOS_INCOMPLETOS',
        message: 'CPF/CNPJ e endereço são obrigatórios',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    if (!cardData || !cardData.holderName || !cardData.cardNumber || !cardData.expiryMonth || 
        !cardData.expiryYear || !cardData.cvv) {
      console.error('❌ Dados do cartão incompletos para usuário:', req.user.id);
      return res.status(400).json({ 
        error: 'CARTAO_INCOMPLETO',
        message: 'Todos os dados do cartão são obrigatórios',
        code: 'MISSING_CARD_DATA'
      });
    }

    console.log('✅ Todas as validações passaram - processando pagamento para usuário autenticado...');

    // ✅ CRIAR PEDIDO COM STATUS PENDING - AGUARDARÁ CONFIRMAÇÃO DO PAGAMENTO
    const orderServiceData = {
      userId: req.user.id, // ✅ GARANTIR ASSOCIAÇÃO AO USUÁRIO
      email: req.user.email, // ✅ USAR EMAIL DO USUÁRIO LOGADO
      cpfCnpj: orderData.cpfCnpj,
      total: orderData.total,
      items: orderData.items,
      address: orderData.address,
      paymentMethod: paymentMethod,
      paymentStatus: 'PENDING' // ✅ SEMPRE INICIAR COMO PENDING
    };

    console.log('📦 Criando pedido PENDING no banco de dados para usuário autenticado:', {
      userId: orderServiceData.userId,
      email: orderServiceData.email,
      total: orderServiceData.total,
      paymentStatus: orderServiceData.paymentStatus
    });
    
    let order;
    try {
      // ✅ USAR MÉTODO CORRETO PARA USUÁRIOS AUTENTICADOS
      order = await orderService.createOrder(orderServiceData);
      
      console.log('✅ Pedido criado com status PENDING e ASSOCIADO ao usuário:', {
        orderId: order.id,
        userId: order.userId, // ✅ DEVE TER O userId PREENCHIDO
        customerEmail: order.customerEmail,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus
      });

      // ✅ VALIDAÇÃO FINAL: Confirmar que o pedido foi associado
      if (!order.userId || order.userId !== req.user.id) {
        console.error('❌ ERRO CRÍTICO: Pedido não foi associado corretamente ao usuário!', {
          expectedUserId: req.user.id,
          actualUserId: order.userId,
          orderId: order.id
        });
        
        return res.status(500).json({
          error: 'ERRO_ASSOCIACAO',
          message: 'Erro na associação do pedido ao usuário.',
          code: 'USER_ASSOCIATION_FAILED'
        });
      }

    } catch (orderError) {
      console.error('❌ Erro ao criar pedido no banco para usuário:', req.user.id, orderError);
      return res.status(500).json({
        error: 'ERRO_BANCO',
        message: 'Erro ao salvar pedido. Entre em contato com o suporte.',
        code: 'DB_CREATE_ERROR'
      });
    }

    // ✅ TENTAR PROCESSAR PAGAMENTO REAL NO MERCADO PAGO
    try {
      console.log('💳 Tentando processar pagamento real no Mercado Pago...');
      
      // Criar token do cartão
      const cardToken = await mercadoPagoService.createCardToken({
        card_number: cardData.cardNumber.replace(/\s/g, ''),
        security_code: cardData.cvv,
        expiration_month: Number(cardData.expiryMonth),
        expiration_year: Number(cardData.expiryYear),
        cardholder: {
          name: cardData.holderName,
          identification: {
            type: orderData.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
            number: orderData.cpfCnpj
          }
        }
      });

      // Preparar dados do pagador
      const [firstName, ...lastNameParts] = orderData.address.name.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      // Criar pagamento no Mercado Pago
      const payment = await mercadoPagoService.createPayment({
        transaction_amount: Number(orderData.total),
        token: cardToken,
        description: `Pedido #${order.id}`,
        installments: cardData.installments || 1,
        // payment_method_id removido - será detectado automaticamente pelo token
        payer: {
          email: req.user.email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: orderData.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
            number: orderData.cpfCnpj
          },
          phone: {
            area_code: orderData.address.phone?.slice(0, 2) || '11',
            number: orderData.address.phone?.slice(2) || '999999999'
          },
          address: {
            zip_code: orderData.address.zipCode,
            street_number: orderData.address.number
          }
        },
        external_reference: String(order.id),
        metadata: {
          order_id: String(order.id)
        }
      });

      // ✅ ATUALIZAR PEDIDO COM DADOS DO PAGAMENTO REAL
      const paymentStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status);
      
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentId: String(payment.id),
          status: paymentStatus as any,
          paymentStatus: payment.status === 'approved' ? 'PAID' : 'PENDING'
        }
      });

      console.log('✅ Pagamento REAL processado com sucesso:', {
        paymentId: payment.id,
        status: payment.status,
        orderStatus: paymentStatus
      });

      // ✅ ENVIAR EMAIL APENAS SE PAGAMENTO FOR APROVADO
      if (payment.status === 'approved') {
        console.log('📧 Pagamento aprovado - enviando email de confirmação...');
        try {
          const emailData = {
            orderId: order.id,
            customerName: orderData.address.name || 'Cliente',
            customerEmail: req.user.email,
            total: Number(order.total),
            items: orderData.items.map((item: any) => ({
              name: item.name || `Produto ${item.productId}`,
              quantity: item.quantity,
              price: item.price
            })),
            paymentMethod: paymentMethod
          };

          await emailService.sendPaymentConfirmation(emailData);
          console.log('✅ Email de confirmação enviado com sucesso!');
        } catch (emailError) {
          console.error('❌ Erro ao enviar email:', emailError);
          // Não falhar a operação por causa do email
        }
      }

      // ✅ RESPOSTA COM DADOS REAIS DO PAGAMENTO
      res.json({
        success: true,
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        orderStatus: paymentStatus,
        message: payment.status === 'approved' ? 'Pagamento aprovado com sucesso!' : 'Pagamento em processamento',
        userType: 'authenticated',
        userId: req.user.id,
        userEmail: req.user.email,
        emailSent: payment.status === 'approved',
        userAssociated: true,
        associatedUserId: order.userId,
        realPayment: true
      });

    } catch (paymentError) {
      console.error('❌ Erro no pagamento real - usando fallback para pendente:', paymentError);
      
      // ✅ SE FALHAR O PAGAMENTO REAL, MANTER PEDIDO COMO PENDING
      console.log('⚠️ Pagamento falhou - pedido permanece PENDING aguardando nova tentativa');
      
      // ✅ RETORNAR RESPOSTA CONSISTENTE MESMO COM FALHA NO PAGAMENTO
      return res.json({
        success: false,
        orderId: order.id,
        status: 'pending',
        orderStatus: 'PENDING',
        message: 'Erro no processamento do pagamento. Tente novamente.',
        userType: 'authenticated',
        error: paymentError instanceof Error ? paymentError.message : 'Erro desconhecido',
        realPayment: true,
        paymentFailed: true
      });
    }

  } catch (error) {
    console.error('❌ ERRO CRÍTICO no processamento de pagamento:', {
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'ERRO_INTERNO',
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const processGuestCardPayment = async (req: Request, res: Response) => {
  try {
    console.log('🎯 Iniciando processamento de cartão guest:', {
      timestamp: new Date().toISOString(),
      body: JSON.stringify(req.body, null, 2)
    });

    const { orderData, cardData, paymentMethod = 'CREDIT_CARD' } = req.body;
    
    // Validar dados obrigatórios
    if (!orderData) {
      console.error('❌ orderData ausente');
      return res.status(400).json({ 
        error: 'Dados do pedido são obrigatórios',
        message: 'orderData é obrigatório'
      });
    }

    if (!orderData.email || !orderData.cpfCnpj || !orderData.address) {
      console.error('❌ Dados do pedido incompletos:', {
        email: !!orderData.email,
        cpfCnpj: !!orderData.cpfCnpj,
        address: !!orderData.address
      });
      return res.status(400).json({ 
        error: 'Dados do pedido incompletos',
        message: 'Email, CPF/CNPJ e endereço são obrigatórios'
      });
    }

    if (!cardData) {
      console.error('❌ cardData ausente');
      return res.status(400).json({ 
        error: 'Dados do cartão são obrigatórios',
        message: 'cardData é obrigatório'
      });
    }

    if (!cardData.holderName || !cardData.cardNumber || !cardData.expiryMonth || 
        !cardData.expiryYear || !cardData.cvv) {
      console.error('❌ Dados do cartão incompletos:', {
        holderName: !!cardData.holderName,
        cardNumber: !!cardData.cardNumber,
        expiryMonth: !!cardData.expiryMonth,
        expiryYear: !!cardData.expiryYear,
        cvv: !!cardData.cvv
      });
      return res.status(400).json({ 
        error: 'Dados do cartão incompletos',
        message: 'Todos os dados do cartão são obrigatórios'
      });
    }

    console.log('✅ Validação inicial passou - processando pagamento...');

    // ✅ CRIAR PEDIDO COM STATUS PENDING - AGUARDARÁ CONFIRMAÇÃO DO PAGAMENTO
    const orderServiceData = {
      email: orderData.email,
      cpfCnpj: orderData.cpfCnpj,
      name: orderData.address.name,
      phone: orderData.address.phone,
      total: orderData.total,
      items: orderData.items,
      address: orderData.address,
      paymentMethod: paymentMethod,
      paymentStatus: 'PENDING' // ✅ SEMPRE INICIAR COMO PENDING
    };

    console.log('📦 Criando pedido PENDING no banco de dados...');
    
    let order;
    try {
      order = await orderService.createGuestOrder(orderServiceData);
      console.log('✅ Pedido criado com status PENDING:', {
        orderId: order.id,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus
      });
    } catch (orderError) {
      console.error('❌ Erro ao criar pedido no banco:', orderError);
      return res.status(500).json({
        error: 'Erro ao criar pedido',
        message: 'Erro ao salvar pedido. Entre em contato com o suporte.'
      });
    }

    // ✅ TENTAR PROCESSAR PAGAMENTO REAL NO MERCADO PAGO
    try {
      console.log('💳 Tentando processar pagamento real no Mercado Pago...');
      
      // Primeiro criar o token do cartão
      const cardToken = await mercadoPagoService.createCardToken({
        card_number: cardData.cardNumber.replace(/\s/g, ''),
        security_code: cardData.cvv,
        expiration_month: Number(cardData.expiryMonth),
        expiration_year: Number(cardData.expiryYear),
        cardholder: {
          name: cardData.holderName,
          identification: {
            type: orderData.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
            number: orderData.cpfCnpj
          }
        }
      });

      // Preparar dados do pagador
      const [firstName, ...lastNameParts] = orderData.address.name.split(' ');
      const lastName = lastNameParts.join(' ') || '';

      // Criar pagamento no Mercado Pago
      const payment = await mercadoPagoService.createPayment({
        transaction_amount: Number(orderData.total),
        token: cardToken,
        description: `Pedido Guest #${order.id}`,
        installments: cardData.installments || 1,
        // payment_method_id removido - será detectado automaticamente pelo token
        payer: {
          email: orderData.email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: orderData.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
            number: orderData.cpfCnpj
          },
          phone: {
            area_code: orderData.address.phone?.slice(0, 2) || '11',
            number: orderData.address.phone?.slice(2) || '999999999'
          },
          address: {
            zip_code: orderData.address.zipCode,
            street_number: orderData.address.number
          }
        },
        external_reference: `guest_order_${order.id}`,
                 metadata: {
           order_id: String(order.id)
         }
      });

      // ✅ ATUALIZAR PEDIDO COM DADOS DO PAGAMENTO REAL
      const paymentStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status);
      
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentId: String(payment.id),
          status: paymentStatus as any,
          paymentStatus: payment.status === 'approved' ? 'PAID' : 'PENDING'
        }
      });

      console.log('✅ Pagamento REAL processado com sucesso:', {
        paymentId: payment.id,
        status: payment.status,
        orderStatus: paymentStatus
      });

      // ✅ ENVIAR EMAIL APENAS SE PAGAMENTO FOR APROVADO
      if (payment.status === 'approved') {
        console.log('📧 Pagamento aprovado - enviando email de confirmação...');
        try {
          const emailData = {
            orderId: order.id,
            customerName: orderData.address.name || 'Cliente',
            customerEmail: orderData.email,
            total: Number(order.total),
            items: orderData.items.map((item: any) => ({
              name: item.name || `Produto ${item.productId}`,
              quantity: item.quantity,
              price: item.price
            })),
            paymentMethod: paymentMethod
          };

          await emailService.sendPaymentConfirmation(emailData);
          console.log('✅ Email de confirmação enviado com sucesso!');
        } catch (emailError) {
          console.error('❌ Erro ao enviar email:', emailError);
          // Não falhar a operação por causa do email
        }
      }

      // ✅ RESPOSTA COM DADOS REAIS DO PAGAMENTO
      res.json({
        success: true,
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        orderStatus: paymentStatus,
        message: payment.status === 'approved' ? 'Pagamento aprovado com sucesso!' : 'Pagamento em processamento',
        userType: 'guest',
        emailSent: payment.status === 'approved',
        realPayment: true
      });

    } catch (paymentError) {
      console.error('❌ Erro no pagamento real - usando fallback para pendente:', paymentError);
      
      // ✅ SE FALHAR O PAGAMENTO REAL, MANTER PEDIDO COMO PENDING
      console.log('⚠️ Pagamento falhou - pedido permanece PENDING aguardando nova tentativa');
      
      // ✅ RETORNAR RESPOSTA CONSISTENTE MESMO COM FALHA NO PAGAMENTO
      return res.json({
        success: false,
        orderId: order.id,
        status: 'pending',
        orderStatus: 'PENDING',
        message: 'Erro no processamento do pagamento. Tente novamente.',
        userType: 'guest',
        error: paymentError instanceof Error ? paymentError.message : 'Erro desconhecido',
        realPayment: true,
        paymentFailed: true
      });
    }

  } catch (error: any) {
    console.error('💥 Erro geral no processamento:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro no pagamento: internal_error'
    });
  }
};

export const processGuestPixPayment = async (req: Request, res: Response) => {
  try {
    console.log('🎯 Iniciando processamento de PIX guest:', {
      timestamp: new Date().toISOString(),
      body: JSON.stringify(req.body, null, 2)
    });

    const { orderData } = req.body;
    
    // Validar dados obrigatórios
    if (!orderData) {
      console.error('❌ orderData ausente');
      return res.status(400).json({ 
        error: 'Dados do pedido são obrigatórios',
        message: 'orderData é obrigatório'
      });
    }

    if (!orderData.email || !orderData.cpfCnpj || !orderData.address) {
      console.error('❌ Dados do pedido incompletos:', {
        email: !!orderData.email,
        cpfCnpj: !!orderData.cpfCnpj,
        address: !!orderData.address
      });
      return res.status(400).json({ 
        error: 'Dados do pedido incompletos',
        message: 'Email, CPF/CNPJ e endereço são obrigatórios'
      });
    }

    // Validar CPF/CNPJ específico para Mercado Pago
    if (!validateCPFForMercadoPago(orderData.cpfCnpj)) {
      console.error('❌ CPF/CNPJ inválido para Mercado Pago:', orderData.cpfCnpj);
      return res.status(400).json({ 
        error: 'CPF/CNPJ inválido',
        message: 'O número de CPF/CNPJ fornecido não é válido para o Mercado Pago. Para testes, use: 11144477735'
      });
    }

    console.log('✅ Validação inicial passou - criando pagamento PIX...');

    // Preparar dados para o PIX
    const pixPaymentData = {
      transaction_amount: parseFloat(orderData.total.toString()),
      description: `Pedido Guest PIX - ${orderData.email}`,
      payment_method_id: 'pix' as const,
      payer: {
        email: orderData.email,
        first_name: orderData.address.name.split(' ')[0],
        last_name: orderData.address.name.split(' ').slice(1).join(' ') || orderData.address.name.split(' ')[0],
        identification: {
          type: orderData.cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
          number: orderData.cpfCnpj.replace(/\D/g, '')
        }
      },
      // Só incluir notification_url se não for localhost
      ...(process.env.API_URL && !process.env.API_URL.includes('localhost') && {
        notification_url: `${process.env.API_URL}/api/payment/webhook`
      }),
      external_reference: generateExternalReference(Date.now(), 'guest')
    };

    console.log('🔄 Dados do PIX preparados:', {
      transaction_amount: pixPaymentData.transaction_amount,
      payer: pixPaymentData.payer
    });

    // Processar pagamento PIX via Mercado Pago
    let payment;
    try {
      console.log('🔄 Processando PIX no Mercado Pago...');
      payment = await mercadoPagoService.createPixPayment(pixPaymentData);
      console.log('✅ PIX processado no Mercado Pago:', {
        id: payment.id,
        status: payment.status
      });
    } catch (paymentError) {
      console.error('❌ Erro ao processar PIX no Mercado Pago:', paymentError);
      return res.status(400).json({
        error: 'Erro no processamento do PIX',
        message: paymentError instanceof Error ? paymentError.message : 'Erro desconhecido no PIX'
      });
    }

    // Obter informações do PIX (QR Code)
    let pixInfo;
    try {
      pixInfo = await mercadoPagoService.getPixInfo(String(payment.id));
      console.log('✅ Informações do PIX obtidas');
    } catch (pixError) {
      console.error('❌ Erro ao obter informações do PIX:', pixError);
      return res.status(400).json({
        error: 'Erro ao gerar QR Code do PIX',
        message: 'PIX criado mas erro ao gerar QR Code'
      });
    }

    // Criar pedido como convidado
    const orderServiceData = {
      email: orderData.email,
      cpfCnpj: orderData.cpfCnpj,
      name: orderData.address.name,
      phone: orderData.address.phone,
      total: orderData.total,
      items: orderData.items,
      address: orderData.address,
      paymentId: String(payment.id),
      paymentMethod: 'PIX',
      paymentStatus: 'PENDING'
    };

    console.log('📦 Criando pedido PIX no banco de dados...');
    
    let order;
    try {
      order = await orderService.createGuestOrder(orderServiceData);
      console.log('✅ Pedido PIX criado com sucesso:', {
        orderId: order.id,
        total: order.total,
        status: order.status
      });
    } catch (orderError) {
      console.error('❌ Erro ao criar pedido PIX no banco:', orderError);
      return res.status(500).json({
        error: 'Erro ao criar pedido',
        message: 'PIX processado mas erro ao salvar pedido. Entre em contato com o suporte.'
      });
    }

    console.log('🎉 Processo PIX completo finalizado com sucesso!');

    res.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      status: payment.status,
      pixQrCode: pixInfo.qrCode,
      pixQrCodeBase64: pixInfo.qrCodeBase64,
      message: 'PIX gerado com sucesso'
    });

  } catch (error: any) {
    console.error('💥 Erro geral no processamento PIX:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro no PIX: internal_error'
    });
  }
};

export const processGuestBoletoPayment = async (req: Request, res: Response) => {
  try {
    console.log('🎯 Iniciando processamento de Boleto guest:', {
      timestamp: new Date().toISOString(),
      body: JSON.stringify(req.body, null, 2)
    });

    const { orderData } = req.body;
    
    // Validar dados obrigatórios
    if (!orderData) {
      console.error('❌ orderData ausente');
      return res.status(400).json({ 
        error: 'Dados do pedido são obrigatórios',
        message: 'orderData é obrigatório'
      });
    }

    if (!orderData.email || !orderData.cpfCnpj || !orderData.address) {
      console.error('❌ Dados do pedido incompletos:', {
        email: !!orderData.email,
        cpfCnpj: !!orderData.cpfCnpj,
        address: !!orderData.address
      });
      return res.status(400).json({ 
        error: 'Dados do pedido incompletos',
        message: 'Email, CPF/CNPJ e endereço são obrigatórios'
      });
    }

    console.log('✅ Validação inicial passou - criando boleto...');

    // Calcular data de vencimento (3 dias úteis)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    // Preparar dados para o Boleto
    const boletoPaymentData = {
      transaction_amount: parseFloat(orderData.total.toString()),
      description: `Pedido Guest Boleto - ${orderData.email}`,
      payment_method_id: 'bolbradesco', // Boleto Bradesco
      payer: {
        email: orderData.email,
        first_name: orderData.address.name.split(' ')[0],
        last_name: orderData.address.name.split(' ').slice(1).join(' ') || orderData.address.name.split(' ')[0],
        identification: {
          type: orderData.cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
          number: orderData.cpfCnpj.replace(/\D/g, '')
        },
        address: {
          zip_code: orderData.address.zipCode,
          street_name: orderData.address.street,
          street_number: orderData.address.number,
          neighborhood: orderData.address.neighborhood,
          city: orderData.address.city,
          federal_unit: orderData.address.state
        }
      },
      date_of_expiration: dueDate.toISOString(),
      // Só incluir notification_url se não for localhost
      ...(process.env.API_URL && !process.env.API_URL.includes('localhost') && {
        notification_url: `${process.env.API_URL}/api/payment/webhook`
      }),
      external_reference: `guest_boleto_${Date.now()}`
    };

    console.log('🔄 Dados do Boleto preparados:', {
      transaction_amount: boletoPaymentData.transaction_amount,
      due_date: dueDate.toISOString(),
      payer: boletoPaymentData.payer
    });

    // Processar pagamento Boleto via Mercado Pago
    let payment;
    try {
      console.log('🔄 Processando Boleto no Mercado Pago...');
      payment = await mercadoPagoService.createPayment(boletoPaymentData);
      console.log('✅ Boleto processado no Mercado Pago:', {
        id: payment.id,
        status: payment.status
      });
    } catch (paymentError) {
      console.error('❌ Erro ao processar Boleto no Mercado Pago:', paymentError);
      return res.status(400).json({
        error: 'Erro no processamento do Boleto',
        message: paymentError instanceof Error ? paymentError.message : 'Erro desconhecido no Boleto'
      });
    }

    // Criar pedido como convidado
    const orderServiceData = {
      email: orderData.email,
      cpfCnpj: orderData.cpfCnpj,
      name: orderData.address.name,
      phone: orderData.address.phone,
      total: orderData.total,
      items: orderData.items,
      address: orderData.address,
      paymentId: String(payment.id),
      paymentMethod: 'BOLETO',
      paymentStatus: 'PENDING'
    };

    console.log('📦 Criando pedido Boleto no banco de dados...');
    
    let order;
    try {
      order = await orderService.createGuestOrder(orderServiceData);
      console.log('✅ Pedido Boleto criado com sucesso:', {
        orderId: order.id,
        total: order.total,
        status: order.status
      });
    } catch (orderError) {
      console.error('❌ Erro ao criar pedido Boleto no banco:', orderError);
      return res.status(500).json({
        error: 'Erro ao criar pedido',
        message: 'Boleto processado mas erro ao salvar pedido. Entre em contato com o suporte.'
      });
    }

    console.log('🎉 Processo Boleto completo finalizado com sucesso!');

    res.json({
      success: true,
      orderId: order.id,
      status: 'pending',
      message: 'Boleto será gerado em breve',
      userType: 'authenticated',
      userId: req.user!.id,
      userEmail: req.user!.email,
      note: 'Funcionalidade de Boleto será implementada com provedor específico'
    });

  } catch (error: any) {
    console.error('💥 Erro geral no processamento Boleto:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Erro no Boleto: internal_error'
    });
  }
};

// ✅ PROCESSAR PIX PARA USUÁRIOS AUTENTICADOS
export const processAuthenticatedPix = async (req: Request, res: Response) => {
  try {
    console.log('🎯 Iniciando processamento de PIX para usuário logado:', {
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      email: req.user?.email
    });

    const { orderData } = req.body;
    
    // ✅ VALIDAÇÃO RIGOROSA DE AUTENTICAÇÃO
    if (!req.user || !req.user.id || !req.user.email) {
      console.error('❌ FALHA DE SEGURANÇA: Tentativa de PIX sem autenticação válida');
      return res.status(401).json({ 
        error: 'ACESSO_NEGADO',
        message: 'Usuário não autenticado. É obrigatório estar logado para realizar pagamentos.',
        code: 'AUTH_REQUIRED'
      });
    }

    // ✅ FORÇAR EMAIL DO USUÁRIO LOGADO
    orderData.email = req.user.email;

    if (!orderData.cpfCnpj || !orderData.address) {
      console.error('❌ Dados do pedido incompletos para usuário:', req.user.id);
      return res.status(400).json({ 
        error: 'DADOS_INCOMPLETOS',
        message: 'CPF/CNPJ e endereço são obrigatórios',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    // Validar CPF/CNPJ específico para Mercado Pago
    if (!validateCPFForMercadoPago(orderData.cpfCnpj)) {
      console.error('❌ CPF/CNPJ inválido para Mercado Pago:', orderData.cpfCnpj);
      return res.status(400).json({ 
        error: 'CPF/CNPJ inválido',
        message: 'O número de CPF/CNPJ fornecido não é válido para o Mercado Pago. Para testes, use: 11144477735'
      });
    }

    console.log('✅ Todas as validações passaram - processando PIX para usuário autenticado...');

    // ✅ CRIAR PEDIDO COM STATUS PENDING
    const orderServiceData = {
      userId: req.user.id,
      email: req.user.email,
      cpfCnpj: orderData.cpfCnpj,
      total: orderData.total,
      items: orderData.items,
      address: orderData.address,
      paymentMethod: 'PIX',
      paymentStatus: 'PENDING'
    };

    console.log('📦 Criando pedido PIX no banco de dados para usuário autenticado');
    
    let order;
    try {
      order = await orderService.createOrder(orderServiceData);
      console.log('✅ Pedido PIX criado:', { orderId: order.id, userId: order.userId });
    } catch (orderError) {
      console.error('❌ Erro ao criar pedido PIX:', orderError);
      return res.status(500).json({
        error: 'Erro ao criar pedido',
        message: 'Erro interno ao processar pedido'
      });
    }

    // Preparar dados para o PIX
    const pixPaymentData = {
      transaction_amount: parseFloat(orderData.total.toString()),
      description: `Pedido PIX #${order.id} - ${req.user.email}`,
      payment_method_id: 'pix' as const,
      payer: {
        email: req.user.email,
        first_name: orderData.address.name.split(' ')[0],
        last_name: orderData.address.name.split(' ').slice(1).join(' ') || orderData.address.name.split(' ')[0],
        identification: {
          type: orderData.cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
          number: orderData.cpfCnpj.replace(/\D/g, '')
        }
      },
      external_reference: generateExternalReference(order.id, 'user')
    };

    // Processar pagamento PIX via Mercado Pago
    let payment;
    try {
      console.log('🔄 Processando PIX no Mercado Pago...');
      payment = await mercadoPagoService.createPixPayment(pixPaymentData);
      console.log('✅ PIX processado no Mercado Pago:', { id: payment.id, status: payment.status });
    } catch (paymentError) {
      console.error('❌ Erro ao processar PIX no Mercado Pago:', paymentError);
      return res.status(400).json({
        error: 'Erro no processamento do PIX',
        message: paymentError instanceof Error ? paymentError.message : 'Erro desconhecido no PIX'
      });
    }

    // Obter informações do PIX (QR Code)
    let pixInfo;
    try {
      pixInfo = await mercadoPagoService.getPixInfo(String(payment.id));
      console.log('✅ Informações do PIX obtidas');
    } catch (pixError) {
      console.error('❌ Erro ao obter informações do PIX:', pixError);
      return res.status(400).json({
        error: 'Erro ao gerar QR Code do PIX',
        message: 'PIX criado mas erro ao gerar QR Code'
      });
    }

    // Atualizar pedido com dados do pagamento
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: String(payment.id),
        status: 'PENDING'
      }
    });

    console.log('🎉 Processo PIX autenticado finalizado com sucesso!');

    res.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      status: payment.status,
      pixQrCode: pixInfo.qrCode,
      pixQrCodeBase64: pixInfo.qrCodeBase64,
      message: 'PIX gerado com sucesso',
      userType: 'authenticated',
      userId: req.user.id,
      userEmail: req.user.email
    });

  } catch (error) {
    console.error('❌ ERRO CRÍTICO no processamento de PIX:', error);
    res.status(500).json({ 
      error: 'ERRO_INTERNO',
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// ✅ PROCESSAR BOLETO PARA USUÁRIOS AUTENTICADOS
export const processAuthenticatedBoleto = async (req: Request, res: Response) => {
  try {
    console.log('🎯 Iniciando processamento de Boleto para usuário logado:', {
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      email: req.user?.email
    });

    const { orderData } = req.body;
    
    // ✅ VALIDAÇÃO RIGOROSA DE AUTENTICAÇÃO
    if (!req.user || !req.user.id || !req.user.email) {
      console.error('❌ FALHA DE SEGURANÇA: Tentativa de Boleto sem autenticação válida');
      return res.status(401).json({ 
        error: 'ACESSO_NEGADO',
        message: 'Usuário não autenticado. É obrigatório estar logado para realizar pagamentos.',
        code: 'AUTH_REQUIRED'
      });
    }

    // ✅ FORÇAR EMAIL DO USUÁRIO LOGADO
    orderData.email = req.user.email;

    if (!orderData.cpfCnpj || !orderData.address) {
      console.error('❌ Dados do pedido incompletos para usuário:', req.user.id);
      return res.status(400).json({ 
        error: 'DADOS_INCOMPLETOS',
        message: 'CPF/CNPJ e endereço são obrigatórios',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    // Validar CPF/CNPJ
    if (!validateDocument(orderData.cpfCnpj)) {
      console.error('❌ CPF/CNPJ inválido:', orderData.cpfCnpj);
      return res.status(400).json({ 
        error: 'CPF/CNPJ inválido',
        message: 'O número de CPF/CNPJ fornecido não é válido'
      });
    }

    console.log('✅ Todas as validações passaram - processando Boleto para usuário autenticado...');

    // ✅ CRIAR PEDIDO COM STATUS PENDING
    const orderServiceData = {
      userId: req.user.id,
      email: req.user.email,
      cpfCnpj: orderData.cpfCnpj,
      total: orderData.total,
      items: orderData.items,
      address: orderData.address,
      paymentMethod: 'BOLETO',
      paymentStatus: 'PENDING'
    };

    console.log('📦 Criando pedido Boleto no banco de dados para usuário autenticado');
    
    let order;
    try {
      order = await orderService.createOrder(orderServiceData);
      console.log('✅ Pedido Boleto criado:', { orderId: order.id, userId: order.userId });
    } catch (orderError) {
      console.error('❌ Erro ao criar pedido Boleto:', orderError);
      return res.status(500).json({
        error: 'Erro ao criar pedido',
        message: 'Erro interno ao processar pedido'
      });
    }

    // Para Boleto, retornamos sucesso simples (Mercado Pago não suporta Boleto diretamente)
    // Em produção, seria integrado com outro provedor como Asaas ou PagSeguro
    console.log('🎉 Processo Boleto autenticado finalizado com sucesso!');

    res.json({
      success: true,
      orderId: order.id,
      status: 'pending',
      message: 'Boleto será gerado em breve',
      userType: 'authenticated',
      userId: req.user!.id,
      userEmail: req.user!.email,
      note: 'Funcionalidade de Boleto será implementada com provedor específico'
    });

  } catch (error) {
    console.error('❌ ERRO CRÍTICO no processamento de Boleto:', error);
    res.status(500).json({ 
      error: 'ERRO_INTERNO',
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
}; 