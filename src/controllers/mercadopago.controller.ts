import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../config/prisma';
import mercadoPagoService from '../services/mercadopago.service';
import { OrderStatus } from '@prisma/client';
import { validateDocument } from '../utils/validation';

// Chave secreta do webhook (obtida do painel do Mercado Pago)
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || '4862b799a3bb9fa8fd7ee3b25af593add5631a6af3f5e366564eb8f2e713fce9';

// Função para validar assinatura do webhook
const validateWebhookSignature = (req: Request): boolean => {
  try {
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;
    const dataID = req.body?.data?.id;

    if (!xSignature || !xRequestId || !dataID) {
      console.log('Headers ou dados necessários ausentes para validação');
      return false;
    }

    // Extrair ts e hash da assinatura
    const parts = xSignature.split(',');
    let ts = '';
    let hash = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        const cleanKey = key.trim();
        const cleanValue = value.trim();
        if (cleanKey === 'ts') {
          ts = cleanValue;
        } else if (cleanKey === 'v1') {
          hash = cleanValue;
        }
      }
    }

    if (!ts || !hash) {
      console.log('Timestamp ou hash não encontrados na assinatura');
      return false;
    }

    // Criar a string para validação
    const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;
    
    // Gerar HMAC
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    hmac.update(manifest);
    const sha = hmac.digest('hex');

    console.log('Validação de assinatura:', {
      manifest,
      hashRecebido: hash,
      hashCalculado: sha,
      valido: sha === hash
    });

    return sha === hash;
  } catch (error) {
    console.error('Erro ao validar assinatura do webhook:', error);
    return false;
  }
};

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
      let statusCode = 400;
      
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
      
      return res.status(statusCode).json({
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

// Processar pagamento PIX
export const processPixPayment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const validation = pixPaymentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format() 
      });
    }

    const { orderId, cpfCnpj } = validation.data;

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

    // Preparar dados do pagador
    const [firstName, ...lastNameParts] = (order.user?.name || 'Cliente').split(' ');
    const lastName = lastNameParts.join(' ') || '';

    // Criar pagamento PIX no Mercado Pago
    const payment = await mercadoPagoService.createPixPayment({
      transaction_amount: Number(order.total),
      description: `Pedido #${order.id}`,
      payment_method_id: 'pix',
      payer: {
        email: order.user?.email || '',
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

    // Obter informações do PIX
    const pixInfo = await mercadoPagoService.getPixInfo(String(payment.id));

    return res.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        transaction_amount: payment.transaction_amount,
        orderStatus: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status),
        pix: {
          qr_code: pixInfo.qrCode,
          qr_code_base64: pixInfo.qrCodeBase64
        }
      }
    });
  } catch (error: any) {
    console.error('Erro ao processar pagamento PIX:', error);
    
    if (error.response?.data?.cause?.length > 0) {
      const apiError = error.response.data.cause[0];
      return res.status(400).json({
        error: apiError.description || 'Erro ao processar pagamento PIX',
        code: apiError.code
      });
    }
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor ao processar pagamento PIX',
      message: error.message 
    });
  }
};

// Verificar status de pagamento
export const checkPaymentStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

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

    // Verificar se o usuário é o dono do pedido
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se existe um pagamento no Mercado Pago para este pedido
    try {
      const payments = await mercadoPagoService.getPaymentsByExternalReference(String(order.id));
      
      if (payments.length === 0) {
        return res.json({
          success: true,
          orderStatus: order.status,
          hasPayment: false,
          message: 'Nenhum pagamento encontrado para este pedido'
        });
      }

      // Pegar o último pagamento (mais recente)
      const latestPayment = payments[payments.length - 1];
      
      console.log('Status de pagamento do Mercado Pago:', latestPayment);

      // Mapear o status do Mercado Pago para o status do pedido
      const orderStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(latestPayment.status);

      // Atualizar o status do pedido se necessário
      if (order.status !== orderStatus) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: orderStatus }
        });
      }

      return res.json({
        success: true,
        orderStatus,
        hasPayment: true,
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

// Webhook para receber notificações do Mercado Pago
export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  try {
    console.log('Webhook recebido do Mercado Pago:', {
      headers: req.headers,
      body: req.body
    });

    // Validar a assinatura do webhook
    if (!validateWebhookSignature(req)) {
      console.error('Assinatura do webhook inválida');
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    console.log('✅ Assinatura do webhook validada com sucesso');
    
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

    // Buscar o pedido pela referência externa
    const order = await prisma.order.findUnique({
      where: { id: Number(payment.external_reference) }
    });

    if (!order) {
      console.error('Pedido não encontrado para referência:', payment.external_reference);
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Atualizar o status do pedido
    const newStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status);
    
    await prisma.order.update({
      where: { id: order.id },
      data: { status: newStatus }
    });

    console.log(`Pedido ${order.id} atualizado para status: ${newStatus}`);
    
    return res.status(200).json({ 
      received: true,
      processed: true,
      orderId: order.id,
      newStatus
    });
  } catch (error: any) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 