import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../config/prisma';
import mercadoPagoService from '../services/mercadopago.service';
import { OrderStatus } from '@prisma/client';
import { validateDocument } from '../utils/validation';
import { reduceStockOnPaymentApproved, updateCouponUsage } from './orders.controller';
import config from '../config';

// ===== CONTROLLER MERCADO PAGO PROFISSIONAL (2025) =====
// Implementação com validações robustas e segurança aprimorada

// Chave secreta do webhook (obtida do painel do Mercado Pago)
const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

// ✅ VALIDAÇÃO DE WEBHOOK SEGURA ATUALIZADA (2025)
const validateWebhookSignature = (req: Request): boolean => {
  try {
    console.log('🔍 DEBUG - Validando webhook signature...');
    console.log('🔑 WEBHOOK_SECRET configurado:', WEBHOOK_SECRET ? 'SIM' : 'NÃO');
    
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;
    const dataID = req.body?.data?.id;

    console.log('📨 Headers recebidos:', {
      'x-signature': xSignature ? 'PRESENTE' : 'AUSENTE',
      'x-request-id': xRequestId ? 'PRESENTE' : 'AUSENTE',
      'data.id': dataID || 'AUSENTE'
    });

    if (!xSignature || !xRequestId || !dataID) {
      console.log('❌ Headers ou dados necessários ausentes para validação webhook');
      return false;
    }

    // Extrair ts e hash da assinatura
    const parts = xSignature.split(',');
    let ts = '';
    let hash = '';

    console.log('🔍 Partes da signature:', parts);

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

    console.log('🔍 Extraído da signature:', { ts, hash: hash ? 'PRESENTE' : 'AUSENTE' });

    if (!ts || !hash) {
      console.log('❌ Timestamp ou hash não encontrados na assinatura');
      return false;
    }

    // ✅ VERIFICAR TIMESTAMP PARA EVITAR REPLAY ATTACKS (FLEXÍVEL PARA TESTES)
    const requestTimeMs = parseInt(ts); // Timestamp pode vir em milissegundos
    const requestTime = requestTimeMs > 9999999999 ? Math.floor(requestTimeMs / 1000) : requestTimeMs; // Converter para segundos se necessário
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - requestTime);
    
    console.log('⏰ Validação de timestamp:', {
      requestTimeOriginal: requestTimeMs,
      requestTime: requestTime,
      currentTime: currentTime,
      timeDifference: `${timeDifference}s`,
      requestDate: new Date(requestTime * 1000).toISOString(),
      currentDate: new Date(currentTime * 1000).toISOString(),
      isMilliseconds: requestTimeMs > 9999999999
    });
    
    // Rejeitar requisições com mais de 30 minutos (flexível para testes)
    if (timeDifference > 1800) {
      console.log('❌ Webhook muito antigo, possível replay attack');
      console.log(`📅 Diferença: ${timeDifference}s (máximo: 1800s)`);
      return false;
    }

    // Criar a string para validação (sempre usar o timestamp original)
    const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;
    console.log('📝 Manifest criado:', manifest);
    console.log('📝 Timestamp usado no manifest:', ts, '(valor original)');
    
    // Gerar HMAC
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    hmac.update(manifest);
    const sha = hmac.digest('hex');

    console.log('🔐 Comparação de hashes:', {
      hashRecebido: hash,
      hashCalculado: sha,
      saoIguais: sha === hash
    });

    const isValid = sha === hash;
    console.log('🔒 Resultado final da validação:', {
      dataId: dataID,
      isValid,
      timeDifference: `${timeDifference}s`
    });

    return isValid;
  } catch (error) {
    console.error('❌ Erro ao validar assinatura do webhook:', error);
    return false;
  }
};

// ✅ SCHEMAS DE VALIDAÇÃO APRIMORADOS
const creditCardPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  creditCard: z.object({
    holderName: z.string().min(2, 'Nome do titular deve ter pelo menos 2 caracteres'),
    number: z.string().min(13, 'Número do cartão inválido').max(19, 'Número do cartão inválido'),
    expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Mês de expiração inválido'),
    expiryYear: z.string().regex(/^20[2-9][0-9]$/, 'Ano de expiração inválido'),
    ccv: z.string().regex(/^[0-9]{3,4}$/, 'CCV deve ter 3 ou 4 dígitos'),
  }),
  holderInfo: z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido'),
    postalCode: z.string().regex(/^[0-9]{8}$/, 'CEP deve ter 8 dígitos'),
    addressNumber: z.string().min(1, 'Número do endereço é obrigatório'),
    addressComplement: z.string().optional(),
    phone: z.string().regex(/^[0-9]{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
  }),
  installments: z.number().int().min(1).max(12).default(1),
});

const pixPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido').optional(),
});

const webhookSchema = z.object({
  type: z.string(),
  action: z.string(),
  data: z.object({
    id: z.string(),
  }),
});

// ✅ PROCESSAR PAGAMENTO COM CARTÃO DE CRÉDITO
export const processCreditCardPayment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      });
    }

    console.log('🔄 Processando pagamento com cartão de crédito...');
    
    const validation = creditCardPaymentSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.log('❌ Dados de entrada inválidos:', validation.error.format());
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { orderId, creditCard, holderInfo, installments } = validation.data;

    // ✅ VALIDAÇÃO ROBUSTA DE CPF/CNPJ
    if (!validateDocument(holderInfo.cpfCnpj)) {
      return res.status(400).json({
        error: 'CPF/CNPJ inválido',
        message: 'O número de CPF/CNPJ fornecido não é válido',
        code: 'INVALID_DOCUMENT'
      });
    }

    // Buscar o pedido com verificações de segurança
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
      return res.status(404).json({ 
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // Verificar ownership do pedido
    if (order.userId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Acesso negado ao pedido',
        code: 'ACCESS_DENIED'
      });
    }

    // Verificar se o pedido já foi processado
    if (order.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Pedido não está pendente (status atual: ${order.status})`,
        code: 'INVALID_ORDER_STATUS'
      });
    }

    // ✅ CRIAR TOKEN DE CARTÃO COM VALIDAÇÕES
    const cardToken = await mercadoPagoService.createCardToken({
      card_number: creditCard.number.replace(/\s/g, ''),
      security_code: creditCard.ccv,
      expiration_month: Number(creditCard.expiryMonth),
      expiration_year: Number(creditCard.expiryYear),
      cardholder: {
        name: creditCard.holderName,
        identification: {
          type: holderInfo.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
          number: holderInfo.cpfCnpj.replace(/\D/g, '')
        }
      }
    });

    // ✅ PREPARAR DADOS DO PAGADOR COM VALIDAÇÕES
    const [firstName, ...lastNameParts] = holderInfo.name.split(' ');
    const lastName = lastNameParts.join(' ') || 'Cliente';

    // ✅ CRIAR PAGAMENTO COM DADOS OTIMIZADOS
    const payment = await mercadoPagoService.createPayment({
      transaction_amount: Number(order.total),
      token: cardToken,
      description: `Pedido #${order.id} - Kimono Store`,
      installments: installments || 1,
      payment_method_id: undefined, // Será detectado automaticamente pelo token
      payer: {
        email: order.user?.email || holderInfo.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: holderInfo.cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
          number: holderInfo.cpfCnpj.replace(/\D/g, '')
        },
        phone: {
          area_code: holderInfo.phone.slice(0, 2),
          number: holderInfo.phone.slice(2)
        },
        address: {
          zip_code: holderInfo.postalCode,
          street_number: String(holderInfo.addressNumber)
        }
      },
      external_reference: String(order.id),
      notification_url: `${process.env.API_URL || 'http://localhost:4000'}/api/mercadopago/webhook`,
      metadata: {
        order_id: String(order.id)
      }
    });

    // ✅ ATUALIZAR PEDIDO COM INFORMAÇÕES DO PAGAMENTO
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentId: String(payment.id),
        paymentMethod: 'CREDIT_CARD',
        status: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status) as OrderStatus,
        updatedAt: new Date()
      }
    });

    console.log('✅ Pagamento com cartão processado:', {
      orderId,
      paymentId: payment.id,
      status: payment.status,
      installments: installments || 1
    });

    return res.status(201).json({
      success: true,
      message: 'Pagamento processado com sucesso',
      data: {
        orderId: updatedOrder.id,
        paymentId: payment.id,
        status: payment.status,
        orderStatus: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status),
        installments: installments || 1,
        authorizationCode: (payment as any).authorization_code
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no pagamento com cartão:', error);
    
    // ✅ TRATAMENTO DE ERRO ESPECÍFICO
    let errorMessage = 'Erro no processamento do pagamento';
    let errorCode = 'PAYMENT_ERROR';
    
    if (error.message.includes('Erro MP:')) {
      errorMessage = error.message.replace('Erro MP: ', '');
      errorCode = 'MERCADOPAGO_ERROR';
    } else if (error.message.includes('Token:')) {
      errorMessage = 'Dados do cartão inválidos';
      errorCode = 'INVALID_CARD';
    }

    return res.status(400).json({
      error: errorMessage,
      code: errorCode,
      message: 'Verifique os dados do cartão e tente novamente'
    });
  }
};

// ✅ PROCESSAR PAGAMENTO VIA PIX
export const processPixPayment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      });
    }

    console.log('🔄 Processando pagamento PIX...');
    
    const validation = pixPaymentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validation.error.format(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { orderId, cpfCnpj } = validation.data;

    // Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) {
      return res.status(404).json({ 
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({ 
        error: 'Este pedido não está pendente de pagamento',
        code: 'INVALID_ORDER_STATUS'
      });
    }

    // ✅ VALIDAR CPF/CNPJ SE FORNECIDO
    if (cpfCnpj && !validateDocument(cpfCnpj)) {
      return res.status(400).json({
        error: 'CPF/CNPJ inválido',
        code: 'INVALID_DOCUMENT'
      });
    }

    // ✅ PREPARAR DADOS DO PIX
    const [firstName, ...lastNameParts] = (order.user?.name || '').split(' ');
    const lastName = lastNameParts.join(' ') || '';

    // ✅ CRIAR PAGAMENTO PIX
    const payment = await mercadoPagoService.createPixPayment({
      transaction_amount: Number(order.total),
      description: `Pedido #${order.id} - Kimono Store (PIX)`,
      payment_method_id: 'pix',
      payer: {
        email: order.user?.email || '',
        first_name: firstName,
        last_name: lastName,
        identification: cpfCnpj ? {
          type: cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
          number: cpfCnpj.replace(/\D/g, '')
        } : undefined,
      },
      external_reference: String(order.id),
      notification_url: `${process.env.API_URL || 'http://localhost:4000'}/api/mercadopago/webhook`
    });

    // ✅ ATUALIZAR PEDIDO
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentId: String(payment.id),
        paymentMethod: 'PIX',
        status: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status) as OrderStatus,
        updatedAt: new Date()
      }
    });

    // ✅ OBTER INFORMAÇÕES DO QR CODE
    const pixInfo = await mercadoPagoService.getPixInfo(String(payment.id));

    console.log('✅ PIX processado com sucesso:', {
      orderId,
      paymentId: payment.id,
      status: payment.status,
      hasQrCode: !!pixInfo.qrCode
    });

    return res.status(201).json({
      success: true,
      message: 'PIX gerado com sucesso',
      data: {
        orderId: updatedOrder.id,
        paymentId: payment.id,
        status: payment.status,
        orderStatus: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status),
        pixInfo: {
          qrCode: pixInfo.qrCode,
          qrCodeBase64: pixInfo.qrCodeBase64,
          expirationDate: (payment as any).date_of_expiration
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no pagamento PIX:', error);
    
    return res.status(400).json({
      error: error.message.includes('Erro PIX:') ? 
        error.message.replace('Erro PIX: ', '') : 
        'Erro ao gerar PIX',
      code: 'PIX_ERROR',
      message: 'Tente novamente ou escolha outro método de pagamento'
    });
  }
};

// ✅ VERIFICAR STATUS DE PAGAMENTO
export const checkPaymentStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      });
    }

    const { orderId } = req.params;

    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({ 
        error: 'ID do pedido inválido',
        code: 'INVALID_ORDER_ID'
      });
    }

    // Buscar o pedido
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { user: true }
    });

    if (!order) {
      return res.status(404).json({ 
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }

    if (!order.paymentId) {
      return res.status(400).json({ 
        error: 'Pagamento não encontrado para este pedido',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    // ✅ CONSULTAR STATUS NO MERCADO PAGO
    try {
      const payments = await mercadoPagoService.getPaymentsByExternalReference(String(order.id));
      
      if (payments.length === 0) {
        return res.status(404).json({ 
          error: 'Pagamento não encontrado no Mercado Pago',
          code: 'PAYMENT_NOT_FOUND_MP'
        });
      }

      const latestPayment = payments[0]; // Primeiro é o mais recente
      const orderStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(latestPayment.status);

      // ✅ ATUALIZAR STATUS LOCAL SE NECESSÁRIO
      if (order.status !== orderStatus) {
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            status: orderStatus,
            updatedAt: new Date()
          }
        });

        // ✅ PROCESSAR APROVAÇÃO DE PAGAMENTO (se mudou para PAID)
        if (orderStatus === 'PAID' && order.status !== 'PAID') {
          console.log('🎉 Pagamento aprovado via checkPaymentStatus - pedido:', order.id);
          
          // ✅ REDUZIR ESTOQUE AUTOMATICAMENTE
          try {
            await reduceStockOnPaymentApproved(order.id);
            console.log(`📦 Estoque reduzido automaticamente via checkPaymentStatus para o pedido ${order.id}`);
          } catch (stockError) {
            console.error(`❌ Erro ao reduzir estoque via checkPaymentStatus do pedido ${order.id}:`, stockError);
          }
          
          // ✅ ATUALIZAR USO DO CUPOM
          try {
            await updateCouponUsage(order.id);
          } catch (couponError) {
            console.error(`❌ Erro ao atualizar uso do cupom para o pedido ${order.id}:`, couponError);
          }
        }
      }

      console.log('✅ Status consultado:', {
        orderId,
        paymentId: latestPayment.id,
        status: latestPayment.status
      });

      return res.json({
        success: true,
        data: {
          orderId: order.id,
          paymentId: latestPayment.id,
          paymentStatus: latestPayment.status,
          orderStatus: orderStatus,
          lastUpdate: latestPayment.date_last_updated
        }
      });

    } catch (mpError) {
      console.error('❌ Erro ao consultar Mercado Pago:', mpError);
      
      // Retornar status local como fallback
      return res.json({
        success: true,
        data: {
          orderId: order.id,
          paymentId: order.paymentId,
          paymentStatus: 'unknown',
          orderStatus: order.status,
          lastUpdate: order.updatedAt,
          warning: 'Status local - erro ao consultar Mercado Pago'
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Erro ao verificar status:', error);
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      message: 'Tente novamente em alguns instantes'
    });
  }
};

// ✅ WEBHOOK DO MERCADO PAGO COM SEGURANÇA APRIMORADA
export const mercadoPagoWebhook = async (req: Request, res: Response) => {
  try {
    // ✅ CONFIGURAR HEADERS PARA NGROK
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    console.log('🔔 =================================');
    console.log('🔔 WEBHOOK RECEBIDO DO MERCADO PAGO');
    console.log('🔔 =================================');
    console.log('📨 Body:', JSON.stringify(req.body, null, 2));
    console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📨 Query:', JSON.stringify(req.query, null, 2));
    
    // ✅ VALIDAÇÃO DE ASSINATURA OBRIGATÓRIA
    console.log('🔒 Iniciando validação de assinatura...');
    if (!validateWebhookSignature(req)) {
      console.log('❌ FALHA NA VALIDAÇÃO DE ASSINATURA');
      return res.status(401).json({ 
        error: 'Assinatura inválida',
        code: 'INVALID_SIGNATURE'
      });
    }
    console.log('✅ ASSINATURA VÁLIDA');

    const validation = webhookSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.log('❌ Dados de webhook inválidos:', validation.error);
      return res.status(400).json({ 
        error: 'Dados de webhook inválidos',
        code: 'INVALID_WEBHOOK_DATA'
      });
    }

    const { type, action, data } = validation.data;

    // ✅ PROCESSAR APENAS WEBHOOKS DE PAGAMENTO
    if (type !== 'payment') {
      console.log('ℹ️ Webhook ignorado (não é de pagamento):', type);
      return res.status(200).json({ 
        message: 'Webhook ignorado - tipo não suportado',
        type 
      });
    }

    const paymentId = data.id;
    console.log('🔄 Processando webhook de pagamento:', { paymentId, action });

    // ✅ BUSCAR PAGAMENTO NO MERCADO PAGO
    const payment = await mercadoPagoService.getPaymentStatus(paymentId);
    
    if (!payment.external_reference) {
      console.log('⚠️ Pagamento sem referência externa:', paymentId);
      return res.status(200).json({ 
        message: 'Pagamento sem referência externa' 
      });
    }

    const orderId = Number(payment.external_reference);
    
    // ✅ BUSCAR PEDIDO LOCAL
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) {
      console.log('⚠️ Pedido não encontrado:', orderId);
      return res.status(200).json({ 
        message: 'Pedido não encontrado localmente' 
      });
    }

    const newStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status);
    
    // ✅ ATUALIZAR STATUS APENAS SE NECESSÁRIO
    if (order.status !== newStatus) {
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: newStatus,
          updatedAt: new Date()
        }
      });

              console.log('✅ Status do pedido atualizado:', {
          orderId,
          oldStatus: order.status,
          newStatus,
          paymentStatus: payment.status
        });

        // ✅ PROCESSAR APROVAÇÃO DE PAGAMENTO
        if (newStatus === 'PAID' && order.status !== 'PAID') {
          console.log('🎉 Pagamento aprovado via webhook - pedido:', orderId);
          
          // ✅ REDUZIR ESTOQUE AUTOMATICAMENTE
          try {
            await reduceStockOnPaymentApproved(orderId);
            console.log(`📦 Estoque reduzido automaticamente via webhook para o pedido ${orderId}`);
          } catch (stockError) {
            console.error(`❌ Erro ao reduzir estoque via webhook do pedido ${orderId}:`, stockError);
          }
          
          // ✅ ATUALIZAR USO DO CUPOM
          try {
            await updateCouponUsage(orderId);
          } catch (couponError) {
            console.error(`❌ Erro ao atualizar uso do cupom para o pedido ${orderId}:`, couponError);
          }
          
          // TODO: Enviar email de confirmação
          // TODO: Gerar nota fiscal
        }
    } else {
      console.log('ℹ️ Status já atualizado:', { orderId, status: newStatus });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Webhook processado com sucesso',
      orderId,
      newStatus
    });

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error);
    
    // ✅ RETORNAR 200 PARA EVITAR REENVIO DO WEBHOOK
    return res.status(200).json({
      error: 'Erro interno no processamento',
      message: 'Webhook será ignorado'
    });
  }
};

// ✅ ENDPOINT ESPECÍFICO: BUSCAR QR CODE PIX DE PEDIDO EXISTENTE
export const getPixQrCode = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      });
    }

    const { orderId } = req.params;

    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({ 
        error: 'ID do pedido inválido',
        code: 'INVALID_ORDER_ID'
      });
    }

    console.log('🔍 Buscando QR Code PIX para pedido:', orderId);

    // ✅ BUSCAR PEDIDO
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      include: { user: true }
    });

    if (!order) {
      return res.status(404).json({ 
        error: 'Pedido não encontrado',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.userId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        code: 'ACCESS_DENIED'
      });
    }

    if (!order.paymentId) {
      return res.status(400).json({ 
        error: 'Pagamento não encontrado para este pedido',
        code: 'PAYMENT_NOT_FOUND'
      });
    }

    if (order.paymentMethod !== 'PIX') {
      return res.status(400).json({ 
        error: 'Este pedido não é um pagamento PIX',
        code: 'NOT_PIX_PAYMENT'
      });
    }

    // ✅ BUSCAR INFORMAÇÕES DO PIX NO MERCADO PAGO
    try {
      const pixInfo = await mercadoPagoService.getPixInfo(order.paymentId);
      const paymentStatus = await mercadoPagoService.getPaymentStatus(order.paymentId);

      console.log('✅ QR Code PIX obtido:', {
        orderId,
        paymentId: order.paymentId,
        hasQrCode: !!pixInfo.qrCode,
        hasQrCodeBase64: !!pixInfo.qrCodeBase64,
        paymentStatus: paymentStatus.status
      });

      return res.status(200).json({
        success: true,
        message: 'QR Code PIX obtido com sucesso',
        data: {
          orderId: order.id,
          paymentId: order.paymentId,
          status: paymentStatus.status,
          orderStatus: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(paymentStatus.status),
          pixInfo: {
            qrCode: pixInfo.qrCode,
            qrCodeBase64: pixInfo.qrCodeBase64,
            expirationDate: (paymentStatus as any).date_of_expiration
          }
        }
      });

    } catch (error: any) {
      console.error('❌ Erro ao buscar QR Code PIX:', error);
      
      return res.status(400).json({
        error: 'Erro ao obter QR Code PIX',
        code: 'PIX_QR_ERROR',
        message: 'Não foi possível obter o QR Code do Mercado Pago'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro ao buscar QR Code PIX:', error);
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// ✅ ENDPOINT PÚBLICO: OBTER CONFIGURAÇÕES DO MERCADO PAGO PARA O FRONTEND
export const getMercadoPagoConfig = async (req: Request, res: Response) => {
  try {
    console.log('🔧 Fornecendo configurações públicas do Mercado Pago...');
    
    return res.status(200).json({
      success: true,
      message: 'Configurações do Mercado Pago obtidas com sucesso',
      data: {
        publicKey: config.mercadopago.publicKey,
        environment: config.mercadopago.environment,
        currency: config.mercadopago.defaultCurrency,
        country: config.mercadopago.defaultCountry,
        maxInstallments: config.mercadopago.maxInstallments,
        pixExpirationMinutes: config.mercadopago.pixExpirationMinutes,
        boletoExpirationDays: config.mercadopago.boletoExpirationDays
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao obter configurações do Mercado Pago:', error);
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// ✅ NOVO ENDPOINT: PROCESSAR PIX DIRETO DO CHECKOUT
export const processCheckoutPix = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      });
    }

    console.log('🛒 Processando PIX direto do checkout...');
    console.log('📋 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    // Validar dados de entrada do checkout
    const checkoutData = req.body.orderData;
    if (!checkoutData || !checkoutData.items || !checkoutData.cpfCnpj) {
      return res.status(400).json({ 
        error: 'Dados do checkout inválidos',
        details: 'orderData, items e cpfCnpj são obrigatórios',
        code: 'VALIDATION_ERROR'
      });
    }

    const { items, cpfCnpj } = checkoutData;

    // ✅ VALIDAR CPF/CNPJ
    if (!validateDocument(cpfCnpj)) {
      return res.status(400).json({
        error: 'CPF/CNPJ inválido',
        code: 'INVALID_DOCUMENT'
      });
    }

    // ✅ 1️⃣ PRIMEIRO: CRIAR O PEDIDO COM TOTAL CORRETO (INCLUINDO FRETE)
    const productsTotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const orderTotal = checkoutData.total || productsTotal; // Usar total do frontend (inclui frete) ou calcular produtos
    
    // Calcular subtotal (produtos + frete) e desconto
    const subtotal = productsTotal + (checkoutData.shippingCost || 0);
    const discountAmount = checkoutData.couponCode ? (subtotal - orderTotal) : 0;
    
    console.log('💰 Calculando total do pedido:', {
      productsTotal,
      totalFromFrontend: checkoutData.total,
      finalTotal: orderTotal,
      shippingCost: checkoutData.shippingCost,
      subtotal,
      discountAmount,
      hasCoupon: !!checkoutData.couponCode
    });

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        total: orderTotal, // ✅ USAR TOTAL QUE INCLUI FRETE E DESCONTO
        subtotal: subtotal, // ✅ VALOR ANTES DO DESCONTO
        discountAmount: discountAmount > 0 ? discountAmount : null, // ✅ VALOR DO DESCONTO
        couponId: checkoutData.couponId || null, // ✅ ID DO CUPOM (se aplicável)
        status: 'PENDING',
        paymentMethod: 'PIX',
        customerEmail: checkoutData.email,
        customerName: (req.user as any).name || '',
        customerPhone: checkoutData.phone || '',
        customerDocument: cpfCnpj.replace(/\D/g, ''),
        shippingAddress: checkoutData.shippingMethod === 'LOCAL_PICKUP' ? 
          'RETIRADA LOCAL' : 
          (checkoutData.address ? 
            `${checkoutData.address.street}, ${checkoutData.address.number}${checkoutData.address.complement ? ', ' + checkoutData.address.complement : ''}, ${checkoutData.address.neighborhood}, ${checkoutData.address.city} - ${checkoutData.address.state}, ${checkoutData.address.zipCode}` : ''),
        shippingMethod: checkoutData.shippingMethod || 'STANDARD',
        shippingCost: checkoutData.shippingCost || 0,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: { 
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    console.log('✅ Pedido criado:', order.id);

    // ✅ 2️⃣ DEPOIS: PROCESSAR PIX
    const [firstName, ...lastNameParts] = (order.user?.name || '').split(' ');
    const lastName = lastNameParts.join(' ') || '';

    console.log('💳 Enviando para Mercado Pago:', {
      orderId: order.id,
      transaction_amount: Number(order.total),
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      hasCoupon: !!order.couponId
    });

    const payment = await mercadoPagoService.createPixPayment({
      transaction_amount: Number(order.total),
      description: `Pedido #${order.id} - Kimono Store (PIX)`,
      payment_method_id: 'pix',
      payer: {
        email: order.user?.email || '',
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
          number: cpfCnpj.replace(/\D/g, '')
        },
      },
      external_reference: String(order.id),
      notification_url: `${process.env.API_URL || 'http://localhost:4000'}/api/mercadopago/webhook`
    });

    // ✅ 3️⃣ ATUALIZAR PEDIDO COM ID DO PAGAMENTO
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: String(payment.id),
        updatedAt: new Date()
      }
    });

    // ✅ VERIFICAR STATUS DO PIX (PIX normalmente inicia como 'pending')
    const isValidPix = payment.status === 'pending' || payment.status === 'approved';
    
    if (isValidPix) {
      console.log('✅ PIX processado com sucesso:', {
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status
      });

      return res.status(201).json({
        success: true,
        message: 'PIX gerado com sucesso',
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status
      });
    } else {
      // ❌ PIX REJEITADO
      console.log('❌ PIX REJEITADO:', {
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail
      });

      return res.status(400).json({
        success: false,
        error: 'PIX não pôde ser gerado',
        code: 'PIX_REJECTED',
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        message: 'Tente novamente ou escolha outro método de pagamento'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro no checkout PIX:', error);
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Ocorreu um erro ao processar o checkout PIX'
    });
  }
};

// ✅ NOVO ENDPOINT: PROCESSAR CARTÃO DIRETO DO CHECKOUT
export const processCheckoutCard = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      });
    }

    console.log('💳 Processando cartão direto do checkout...');
    console.log('📋 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    // Validar dados de entrada do checkout
    const { orderData, cardData } = req.body;
    if (!orderData || !orderData.items || !cardData) {
      return res.status(400).json({ 
        error: 'Dados do checkout inválidos',
        details: 'orderData, items e cardData são obrigatórios',
        code: 'VALIDATION_ERROR'
      });
    }

    const { items, cpfCnpj, address } = orderData;

    // ✅ VALIDAR CPF/CNPJ
    if (!validateDocument(cpfCnpj)) {
      return res.status(400).json({
        error: 'CPF/CNPJ inválido',
        code: 'INVALID_DOCUMENT'
      });
    }

    // ✅ VALIDAR DADOS DO CARTÃO
    if (!cardData.holderName || !cardData.cardNumber || !cardData.expiryMonth || 
        !cardData.expiryYear || !cardData.cvv) {
      return res.status(400).json({
        error: 'Dados do cartão incompletos',
        code: 'INVALID_CARD_DATA'
      });
    }

    // ✅ VALIDAÇÕES ESPECÍFICAS DO MERCADO PAGO
    const cleanCardNumber = cardData.cardNumber.replace(/\s/g, '');
    const expiryYear = cardData.expiryYear.length === 2 ? `20${cardData.expiryYear}` : cardData.expiryYear;
    
    if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      return res.status(400).json({
        error: 'Número do cartão inválido',
        code: 'INVALID_CARD_NUMBER'
      });
    }

    if (Number(cardData.expiryMonth) < 1 || Number(cardData.expiryMonth) > 12) {
      return res.status(400).json({
        error: 'Mês de expiração inválido',
        code: 'INVALID_EXPIRY_MONTH'
      });
    }

    if (Number(expiryYear) < 2025 || Number(expiryYear) > 2035) {
      return res.status(400).json({
        error: 'Ano de expiração inválido',
        code: 'INVALID_EXPIRY_YEAR'
      });
    }

    // ✅ 1️⃣ PRIMEIRO: CRIAR O PEDIDO
    const productsTotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const orderTotal = orderData.total || productsTotal;
    
    // Calcular subtotal (produtos + frete) e desconto
    const subtotal = productsTotal + (orderData.shippingCost || 0);
    const discountAmount = orderData.couponCode ? (subtotal - orderTotal) : 0;
    
    console.log('💰 Cálculo de valores (Cartão):', {
      productsTotal,
      shippingCost: orderData.shippingCost || 0,
      subtotal,
      discountAmount,
      finalTotal: orderTotal,
      hasCoupon: !!orderData.couponCode
    });
    
    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        total: orderTotal, // ✅ USAR TOTAL QUE INCLUI FRETE E DESCONTO
        subtotal: subtotal, // ✅ VALOR ANTES DO DESCONTO
        discountAmount: discountAmount > 0 ? discountAmount : null, // ✅ VALOR DO DESCONTO
        couponId: orderData.couponId || null, // ✅ ID DO CUPOM (se aplicável)
        status: 'PENDING',
        paymentMethod: orderData.paymentMethod || 'CREDIT_CARD',
        customerEmail: orderData.email,
        customerName: (req.user as any).name || address.name || '',
        customerPhone: address.phone || '',
        customerDocument: cpfCnpj.replace(/\D/g, ''),
        shippingAddress: orderData.shippingMethod === 'LOCAL_PICKUP' ? 
          'RETIRADA LOCAL' : 
          (address ? 
            `${address.street}, ${address.number}${address.complement ? ', ' + address.complement : ''}, ${address.neighborhood}, ${address.city} - ${address.state}, ${address.zipCode}` : ''),
        shippingMethod: orderData.shippingMethod || 'STANDARD',
        shippingCost: orderData.shippingCost || 0,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: { 
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    console.log('✅ Pedido criado:', order.id);

    // ✅ 2️⃣ DEPOIS: PROCESSAR CARTÃO
    console.log('💳 Dados do cartão para tokenização:', {
      cardNumberLength: cleanCardNumber.length,
      hasSecurityCode: !!cardData.cvv,
      expiryMonth: cardData.expiryMonth,
      expiryYear: expiryYear,
      holderName: cardData.holderName,
      cpfCnpjLength: cpfCnpj.replace(/\D/g, '').length,
      documentType: cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ'
    });

    const cardToken = await mercadoPagoService.createCardToken({
      card_number: cleanCardNumber,
      security_code: cardData.cvv,
      expiration_month: Number(cardData.expiryMonth),
      expiration_year: Number(expiryYear),
      cardholder: {
        name: cardData.holderName,
        identification: {
          type: cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
          number: cpfCnpj.replace(/\D/g, '')
        }
      }
    });

    const [firstName, ...lastNameParts] = (address.name || cardData.holderName).split(' ');
    const lastName = lastNameParts.join(' ') || '';

    console.log('💳 Enviando para Mercado Pago (Cartão):', {
      orderId: order.id,
      transaction_amount: Number(order.total),
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      hasCoupon: !!order.couponId
    });

    const payment = await mercadoPagoService.createPayment({
      transaction_amount: Number(order.total),
      token: cardToken,
      description: `Pedido #${order.id} - Kimono Store`,
      installments: cardData.installments || 1,
      payer: {
        email: order.user?.email || orderData.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
          number: cpfCnpj.replace(/\D/g, '')
        },
        phone: {
          area_code: address.phone?.slice(0, 2) || '11',
          number: address.phone?.slice(2) || '999999999'
        },
        address: {
          zip_code: address.zipCode,
          street_number: String(address.number)
        }
      },
      external_reference: String(order.id),
      notification_url: `${process.env.API_URL || 'http://localhost:4000'}/api/mercadopago/webhook`,
      metadata: {
        order_id: String(order.id)
      }
    });

    // ✅ 3️⃣ ATUALIZAR PEDIDO COM ID DO PAGAMENTO
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: String(payment.id),
        status: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status) as OrderStatus,
        updatedAt: new Date()
      }
    });

    // ✅ VERIFICAR SE O PAGAMENTO FOI REALMENTE APROVADO
    const isApproved = payment.status === 'approved';
    
    if (isApproved) {
      console.log('✅ Cartão APROVADO com sucesso:', {
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail
      });

      // ✅ REDUZIR ESTOQUE AUTOMATICAMENTE QUANDO APROVADO
      try {
        console.log('🔍 DEBUG: Verificando se deve reduzir estoque...');
        console.log('🔍 DEBUG: payment.status =', payment.status);
        console.log('🔍 DEBUG: isApproved =', isApproved);
        console.log('🔍 DEBUG: order.id =', order.id);
        
        if (isApproved) {
          console.log('📦 CHAMANDO reduceStockOnPaymentApproved para pedido:', order.id);
          await reduceStockOnPaymentApproved(order.id);
          console.log(`📦 Estoque reduzido automaticamente para o pedido ${order.id}`);
        } else {
          console.log('⚠️ Pagamento não aprovado, estoque não será reduzido. Status:', payment.status);
        }
      } catch (stockError) {
        console.error(`❌ Erro ao reduzir estoque do pedido ${order.id}:`, stockError);
        // Não falhar o pagamento por causa do estoque
      }

      // ✅ ATUALIZAR USO DO CUPOM
      try {
        await updateCouponUsage(order.id);
      } catch (couponError) {
        console.error(`❌ Erro ao atualizar uso do cupom para o pedido ${order.id}:`, couponError);
      }

      return res.status(201).json({
        success: true,
        message: 'Pagamento aprovado com sucesso',
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status
      });
    } else {
      // ❌ PAGAMENTO REJEITADO OU PENDENTE
      console.log('❌ Cartão REJEITADO:', {
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail
      });

      // Mapear mensagens de erro específicas
      let errorMessage = 'Pagamento recusado';
      let errorCode = 'PAYMENT_REJECTED';

      if (payment.status === 'rejected') {
        const statusDetail = payment.status_detail;
        switch (statusDetail) {
          case 'cc_rejected_call_for_authorize':
            errorMessage = 'Cartão negado. Entre em contato com o banco para autorizar';
            break;
          case 'cc_rejected_insufficient_amount':
            errorMessage = 'Cartão sem limite suficiente';
            break;
          case 'cc_rejected_bad_filled_card_number':
            errorMessage = 'Número do cartão inválido';
            break;
          case 'cc_rejected_bad_filled_security_code':
            errorMessage = 'Código de segurança inválido';
            break;
          case 'cc_rejected_bad_filled_date':
            errorMessage = 'Data de vencimento inválida';
            break;
          case 'cc_rejected_high_risk':
            errorMessage = 'Pagamento recusado por segurança';
            break;
          case 'cc_rejected_blacklist':
            errorMessage = 'Cartão bloqueado para transações online';
            break;
          case 'cc_rejected_card_disabled':
            errorMessage = 'Cartão desabilitado ou cancelado';
            break;
          default:
            errorMessage = `Pagamento recusado: ${statusDetail}`;
        }
      } else if (payment.status === 'pending') {
        errorMessage = 'Pagamento pendente de aprovação';
        errorCode = 'PAYMENT_PENDING';
      }

      return res.status(400).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        message: 'Tente novamente com outro cartão ou método de pagamento'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro no checkout cartão:', error);
    
    // ✅ TRATAMENTO DE ERRO ESPECÍFICO PARA CARTÕES
    let errorMessage = 'Erro interno do servidor';
    let errorCode = 'INTERNAL_ERROR';
    
    if (error.message.includes('MP API:')) {
      errorMessage = error.message.replace('MP API: ', '');
      errorCode = 'MERCADOPAGO_ERROR';
    } else if (error.message.includes('Erro no token:')) {
      errorMessage = 'Dados do cartão inválidos. Verifique as informações e tente novamente.';
      errorCode = 'INVALID_CARD_TOKEN';
    } else if (error.message.includes('CPF/CNPJ')) {
      errorMessage = 'CPF/CNPJ inválido';
      errorCode = 'INVALID_DOCUMENT';
    }
    
    return res.status(400).json({
      error: errorMessage,
      code: errorCode,
      message: 'Verifique os dados do cartão e tente novamente'
    });
  }
};

// ✅ NOVO ENDPOINT: PROCESSAR BOLETO DIRETO DO CHECKOUT
export const processCheckoutBoleto = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado',
        code: 'UNAUTHORIZED'
      });
    }

    console.log('🏦 Processando boleto direto do checkout...');
    console.log('📋 Dados recebidos:', JSON.stringify(req.body, null, 2));
    
    // Validar dados de entrada do checkout
    const checkoutData = req.body.orderData;
    if (!checkoutData || !checkoutData.items || !checkoutData.cpfCnpj) {
      return res.status(400).json({ 
        error: 'Dados do checkout inválidos',
        details: 'orderData, items e cpfCnpj são obrigatórios',
        code: 'VALIDATION_ERROR'
      });
    }

    const { items, cpfCnpj, address } = checkoutData;

    // ✅ VALIDAR CPF/CNPJ
    if (!validateDocument(cpfCnpj)) {
      return res.status(400).json({
        error: 'CPF/CNPJ inválido',
        code: 'INVALID_DOCUMENT'
      });
    }

    // ✅ VALIDAR ENDEREÇO PARA BOLETO
    if (!address || !address.street || !address.number || !address.zipCode || 
        !address.neighborhood || !address.city || !address.state) {
      return res.status(400).json({
        error: 'Endereço incompleto para geração de boleto',
        details: 'Endereço completo é obrigatório para pagamento com boleto',
        code: 'INVALID_ADDRESS'
      });
    }

    // ✅ 1️⃣ PRIMEIRO: CRIAR O PEDIDO
    const productsTotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const orderTotal = checkoutData.total || productsTotal;
    
    // Calcular subtotal (produtos + frete) e desconto
    const subtotal = productsTotal + (checkoutData.shippingCost || 0);
    const discountAmount = checkoutData.couponCode ? (subtotal - orderTotal) : 0;
    
    console.log('💰 Cálculo de valores (Boleto):', {
      productsTotal,
      shippingCost: checkoutData.shippingCost || 0,
      subtotal,
      discountAmount,
      finalTotal: orderTotal,
      hasCoupon: !!checkoutData.couponCode
    });
    
    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        total: orderTotal, // ✅ USAR TOTAL QUE INCLUI FRETE E DESCONTO
        subtotal: subtotal, // ✅ VALOR ANTES DO DESCONTO
        discountAmount: discountAmount > 0 ? discountAmount : null, // ✅ VALOR DO DESCONTO
        couponId: checkoutData.couponId || null, // ✅ ID DO CUPOM (se aplicável)
        status: 'PENDING',
        paymentMethod: 'BOLETO',
        customerEmail: checkoutData.email,
        customerName: (req.user as any).name || '',
        customerPhone: checkoutData.phone || '',
        customerDocument: cpfCnpj.replace(/\D/g, ''),
        shippingAddress: checkoutData.shippingMethod === 'LOCAL_PICKUP' ? 
          'RETIRADA LOCAL' : 
          (checkoutData.address ? 
            `${checkoutData.address.street}, ${checkoutData.address.number}${checkoutData.address.complement ? ', ' + checkoutData.address.complement : ''}, ${checkoutData.address.neighborhood}, ${checkoutData.address.city} - ${checkoutData.address.state}, ${checkoutData.address.zipCode}` : ''),
        shippingMethod: checkoutData.shippingMethod || 'STANDARD',
        shippingCost: checkoutData.shippingCost || 0,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: { 
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    console.log('✅ Pedido criado:', order.id);

    // ✅ 2️⃣ DEPOIS: PROCESSAR BOLETO
    const userName = order.user?.name || order.customerName || 'Cliente';
    const [firstName, ...lastNameParts] = userName.split(' ');
    const lastName = lastNameParts.join(' ') || 'Sobrenome'; // Garantir que sempre tenha um sobrenome

    console.log('👤 Dados do pagador para boleto:', {
      name: userName,
      firstName,
      lastName,
      email: order.user?.email || '',
      cpfCnpj: cpfCnpj,
      address: address ? {
        zipCode: address.zipCode,
        street: address.street,
        number: address.number
      } : 'Sem endereço'
    });

    console.log('💳 Enviando para Mercado Pago (Boleto):', {
      orderId: order.id,
      transaction_amount: Number(order.total),
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      hasCoupon: !!order.couponId
    });

    const payment = await mercadoPagoService.createPayment({
      transaction_amount: Number(order.total),
      description: `Pedido #${order.id} - Kimono Store (Boleto)`,
      payment_method_id: 'bolbradesco',
      payer: {
        email: order.user?.email || '',
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: cpfCnpj.length === 11 ? 'CPF' : 'CNPJ',
          number: cpfCnpj.replace(/\D/g, '')
        },
        // Adicionar endereço completo para boleto
        address: {
          zip_code: address.zipCode.replace(/\D/g, ''),
          street_name: address.street,
          street_number: address.number,
          neighborhood: address.neighborhood,
          city: address.city,
          federal_unit: address.state
        }
      },
      additional_info: {
        payer: {
          first_name: firstName,
          last_name: lastName,
          address: {
            zip_code: address.zipCode.replace(/\D/g, ''),
            street_name: address.street,
            street_number: address.number
          }
        }
      },
      external_reference: String(order.id),
      notification_url: `${process.env.API_URL || 'http://localhost:4000'}/api/mercadopago/webhook`
    });

    // ✅ 3️⃣ ATUALIZAR PEDIDO COM ID DO PAGAMENTO
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: String(payment.id),
        status: mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status) as OrderStatus,
        updatedAt: new Date()
      }
    });

    // ✅ VERIFICAR STATUS DO BOLETO (Boleto normalmente inicia como 'pending')
    const isValidBoleto = payment.status === 'pending' || payment.status === 'approved';
    
    if (isValidBoleto) {
      console.log('✅ Boleto processado com sucesso:', {
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status
      });

      return res.status(201).json({
        success: true,
        message: 'Boleto gerado com sucesso',
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        boleto_url: payment.transaction_details?.external_resource_url || null,
        transaction_details: payment.transaction_details || null,
        payment_method_id: payment.payment_method_id
      });
    } else {
      // ❌ BOLETO REJEITADO
      console.log('❌ Boleto REJEITADO:', {
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail
      });

      return res.status(400).json({
        success: false,
        error: 'Boleto não pôde ser gerado',
        code: 'BOLETO_REJECTED',
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        message: 'Tente novamente ou escolha outro método de pagamento'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro no checkout boleto:', error);
    
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Ocorreu um erro ao processar o checkout boleto'
    });
  }
};

// ✅ ENDPOINT DE TESTE PARA VALIDAÇÃO DE TOKEN DE CARTÃO
export const testCardToken = async (req: Request, res: Response) => {
  try {
    console.log('🧪 Testando criação de token de cartão...');
    
    // ✅ DADOS DE TESTE VALIDADOS DO MERCADO PAGO
    const testCardData = {
      card_number: '5031433215406351', // Mastercard de teste
      security_code: '123',
      expiration_month: 11,
      expiration_year: 2030,
      cardholder: {
        name: 'CARLOS BORGES',
        identification: {
          type: 'CPF',
          number: '12345678901'
        }
      }
    };

    console.log('📊 Testando com dados válidos:', {
      cardNumber: '5031433215406351',
      securityCode: '123',
      expirationMonth: 11,
      expirationYear: 2030,
      holderName: 'CARLOS BORGES',
      documentType: 'CPF'
    });

    const tokenId = await mercadoPagoService.createCardToken(testCardData);
    
    console.log('✅ Token de teste criado com sucesso:', tokenId);
    
    return res.json({
      success: true,
      message: 'Token de cartão criado com sucesso',
      tokenId: tokenId,
      testData: testCardData
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de token:', error);
    
    return res.status(400).json({
      success: false,
      error: error.message,
      message: 'Falha ao criar token de teste'
    });
  }
};

// ✅ TESTE AVANÇADO: TESTAR PAGAMENTO COMPLETO COM CARTÃO
export const testFullCardPayment = async (req: Request, res: Response) => {
  try {
    console.log('🧪 TESTE COMPLETO: Criando pagamento com cartão usando dados válidos...');
    
    // ✅ DADOS DE TESTE VALIDADOS DO MERCADO PAGO
    const testCardData = {
      card_number: '4111111111111111', // Visa teste
      security_code: '123',
      expiration_month: 11,
      expiration_year: 2030,
      cardholder: {
        name: 'CARLOS BORGES',
        identification: {
          type: 'CPF',
          number: '12345678909' // CPF válido de teste do MP
        }
      }
    };

    console.log('💳 Criando token com dados de teste...');
    const token = await mercadoPagoService.createCardToken(testCardData);
    console.log('✅ Token criado:', token);

    // ✅ DADOS DE PAGAMENTO DE TESTE
    const paymentData = {
      transaction_amount: 100.00,
      token: token,
      description: 'Teste de pagamento - Kimono Store',
      installments: 1,
      payer: {
        email: 'test@kimono.com',
        first_name: 'CARLOS',
        last_name: 'BORGES',
        identification: {
          type: 'CPF',
          number: '12345678909'
        },
        phone: {
          area_code: '11',
          number: '999999999'
        },
        address: {
          zip_code: '01310-100',
          street_number: '123'
        }
      },
      external_reference: `test_${Date.now()}`,
      metadata: {
        order_id: `test_order_${Date.now()}`
      }
    };

    console.log('💳 Criando pagamento de teste...');
    const payment = await mercadoPagoService.createPayment(paymentData);
    
    console.log('✅ RESULTADO DO TESTE:', {
      payment_id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      payment_method: payment.payment_method_id,
      payment_type: payment.payment_type_id,
      transaction_amount: payment.transaction_amount,
      response_complete: payment
    });

    return res.status(200).json({
      success: true,
      message: 'Teste de pagamento completo realizado',
      test_results: {
        token_created: !!token,
        payment_id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        payment_method: payment.payment_method_id,
        approved: payment.status === 'approved'
      },
      payment_details: payment
    });

  } catch (error: any) {
    console.error('❌ Erro no teste completo:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      test_phase: error.message.includes('token') ? 'token_creation' : 'payment_creation',
      details: error
    });
  }
};

// ✅ TESTE AVANÇADO: FORÇAR APROVAÇÃO NO MERCADO PAGO
export const testApprovedPayment = async (req: Request, res: Response) => {
  try {
    console.log('🧪 TESTE ESPECÍFICO: Forçando aprovação com configurações do MP...');
    
    // ✅ CARTÃO E DADOS ESPECÍFICOS PARA APROVAÇÃO
    const testCardData = {
      card_number: '4111111111111111', // Visa teste - mais confiável
      security_code: '123',
      expiration_month: 11,
      expiration_year: 2030,
      cardholder: {
        name: 'APRO', // Nome específico para forçar aprovação
        identification: {
          type: 'CPF',
          number: '11144477735' // CPF específico de teste do MP
        }
      }
    };

    console.log('💳 Criando token com dados para aprovação...');
    const token = await mercadoPagoService.createCardToken(testCardData);
    console.log('✅ Token criado:', token);

    // ✅ DADOS DE PAGAMENTO CONFIGURADOS PARA APROVAÇÃO
    const paymentData = {
      transaction_amount: 10.00, // Valor menor para evitar limites
      token: token,
      description: 'Test Payment - APRO',
      installments: 1,
      payer: {
        email: 'test@test.com', // Email simples
        first_name: 'APRO',
        last_name: 'TEST',
        identification: {
          type: 'CPF',
          number: '11144477735'
        },
        phone: {
          area_code: '11',
          number: '987654321'
        },
        address: {
          zip_code: '01310-100',
          street_number: '123'
        }
      },
      external_reference: `test_approved_${Date.now()}`,
      metadata: {
        order_id: `approved_test_${Date.now()}`
      }
    };

    console.log('💳 Criando pagamento configurado para aprovação...');
    const payment = await mercadoPagoService.createPayment(paymentData);
    
    console.log('✅ RESULTADO DO TESTE DE APROVAÇÃO:', {
      payment_id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      payment_method: payment.payment_method_id,
      payment_type: payment.payment_type_id,
      transaction_amount: payment.transaction_amount,
      approved: payment.status === 'approved',
      description_for_user: getStatusDescription(payment.status, payment.status_detail)
    });

    return res.status(200).json({
      success: true,
      message: 'Teste de aprovação realizado',
      test_results: {
        token_created: !!token,
        payment_id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        payment_method: payment.payment_method_id,
        approved: payment.status === 'approved',
        description: getStatusDescription(payment.status, payment.status_detail)
      },
      payment_details: payment,
      integration_analysis: {
        token_creation: 'SUCCESS ✅',
        payment_submission: 'SUCCESS ✅',
        mp_response: payment.status === 'approved' ? 'APPROVED ✅' : `REJECTED: ${payment.status_detail} ❌`,
        issue_found: payment.status !== 'approved' ? 
          'Payment rejected - check payment details or use different test data' : 
          'None - integration working correctly'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de aprovação:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      test_phase: error.message.includes('token') ? 'token_creation' : 'payment_creation',
      details: error,
      troubleshooting: {
        common_issues: [
          'Rate limit exceeded (try different amounts/cards)',
          'Invalid test data (check CPF/card number)',
          'Network connectivity issues',
          'MP API temporary issues'
        ],
        solutions: [
          'Wait a few minutes and try again',
          'Use different test card numbers',
          'Verify MP test environment status',
          'Check API credentials'
        ]
      }
    });
  }
};

// ✅ FUNÇÃO AUXILIAR PARA DESCRIÇÃO DE STATUS
function getStatusDescription(status: string, statusDetail: string): string {
  const statusMap: Record<string, string> = {
    'approved': '✅ Payment approved successfully',
    'rejected': `❌ Payment rejected: ${statusDetail}`,
    'pending': `⏳ Payment pending: ${statusDetail}`,
    'in_process': `🔄 Payment in process: ${statusDetail}`,
    'authorized': `🔒 Payment authorized: ${statusDetail}`,
    'cancelled': `❌ Payment cancelled: ${statusDetail}`
  };
  
  return statusMap[status] || `❓ Unknown status: ${status} - ${statusDetail}`;
}

// ✅ DEBUG: TESTE CHECKOUT COMPLETO COM CARTÃO
export const debugCheckoutCard = async (req: Request, res: Response) => {
  try {
    console.log('🔍 INICIANDO DEBUG DO CHECKOUT COMPLETO...');
    
    // ✅ SIMULAR DADOS DE UM CHECKOUT REAL SEM DEPENDER DE PRODUTOS
    const fakeUserId = 1; // Simular usuário logado
    const orderData = {
      total: 10.00,
      cpfCnpj: '12345678909',
      email: 'test@test.com',
      address: {
        street: 'Rua Teste',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        phone: '11987654321',
        name: 'APRO TEST'
      }
    };

    const cardData = {
      number: '4111111111111111',
      holderName: 'APRO',
      expiryMonth: '11',
      expiryYear: '30',
      cvv: '123',
      installments: 1
    };

    console.log('📊 1. DADOS DO TESTE:', {
      orderTotal: orderData.total,
      cardNumber: '4111111111111111',
      holderName: 'APRO',
      cpf: '12345678909'
    });

    // ✅ 1. CRIAR PEDIDO SIMPLES SEM ITEMS
    console.log('📝 2. CRIANDO PEDIDO SIMPLES...');
    const order = await prisma.order.create({
      data: {
        userId: fakeUserId,
        total: orderData.total,
        status: 'PENDING',
        paymentMethod: 'CREDIT_CARD',
        customerEmail: orderData.email,
        customerName: orderData.address.name,
        customerPhone: orderData.address.phone,
        customerDocument: orderData.cpfCnpj.replace(/\D/g, ''),
        shippingAddress: `${orderData.address.street}, ${orderData.address.number}, ${orderData.address.neighborhood}, ${orderData.address.city} - ${orderData.address.state}, ${orderData.address.zipCode}`
      }
    });

    console.log('✅ 2. PEDIDO CRIADO:', {
      orderId: order.id,
      status: order.status,
      total: order.total
    });

    // ✅ 2. CRIAR TOKEN DO CARTÃO
    console.log('💳 3. CRIANDO TOKEN DO CARTÃO...');
    const cleanCardNumber = cardData.number.replace(/\s/g, '');
    const expiryYear = cardData.expiryYear.length === 2 ? '20' + cardData.expiryYear : cardData.expiryYear;

    const cardToken = await mercadoPagoService.createCardToken({
      card_number: cleanCardNumber,
      security_code: cardData.cvv,
      expiration_month: Number(cardData.expiryMonth),
      expiration_year: Number(expiryYear),
      cardholder: {
        name: cardData.holderName,
        identification: {
          type: 'CPF',
          number: orderData.cpfCnpj.replace(/\D/g, '')
        }
      }
    });

    console.log('✅ 3. TOKEN CRIADO:', cardToken);

    // ✅ 3. CRIAR PAGAMENTO
    console.log('💸 4. CRIANDO PAGAMENTO...');
    const payment = await mercadoPagoService.createPayment({
      transaction_amount: Number(order.total),
      token: cardToken,
      description: `TESTE Debug Pedido #${order.id}`,
      installments: cardData.installments || 1,
      payer: {
        email: orderData.email,
        first_name: 'APRO',
        last_name: 'TEST',
        identification: {
          type: 'CPF',
          number: orderData.cpfCnpj.replace(/\D/g, '')
        },
        phone: {
          area_code: '11',
          number: '987654321'
        },
        address: {
          zip_code: orderData.address.zipCode,
          street_number: orderData.address.number
        }
      },
      external_reference: String(order.id),
      notification_url: `${process.env.API_URL || 'http://localhost:4000'}/api/mercadopago/webhook`,
      metadata: {
        order_id: String(order.id)
      }
    });

    console.log('✅ 4. PAGAMENTO CRIADO:', {
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail
    });

    // ✅ 4. MAPEAR STATUS
    console.log('🗂️ 5. MAPEANDO STATUS...');
    const mappedStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status);
    console.log('📊 STATUS MAPPING:', {
      mercadoPagoStatus: payment.status,
      mappedStatus: mappedStatus,
      isApproved: payment.status === 'approved'
    });

    // ✅ 5. ATUALIZAR PEDIDO
    console.log('🔄 6. ATUALIZANDO PEDIDO...');
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: String(payment.id),
        status: mappedStatus as OrderStatus,
        updatedAt: new Date()
      }
    });

    console.log('✅ 6. PEDIDO ATUALIZADO:', {
      orderId: updatedOrder.id,
      paymentId: updatedOrder.paymentId,
      finalStatus: updatedOrder.status
    });

    // ✅ 6. AGUARDAR UM POUCO E CONSULTAR NOVAMENTE (SIMULAR WEBHOOK)
    console.log('⏳ 7. AGUARDANDO E CONSULTANDO NOVAMENTE...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const paymentStatus = await mercadoPagoService.getPaymentStatus(String(payment.id));
    console.log('🔄 NOVA CONSULTA DO PAGAMENTO:', {
      paymentId: paymentStatus.id,
      status: paymentStatus.status,
      statusDetail: paymentStatus.status_detail
    });

    // ✅ 7. CONSULTAR PEDIDO FINAL
    console.log('📋 8. CONSULTANDO ESTADO FINAL...');
    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id }
    });

    console.log('🎯 RESULTADO FINAL:', {
      orderId: finalOrder?.id,
      status: finalOrder?.status,
      paymentMethod: finalOrder?.paymentMethod,
      paymentId: finalOrder?.paymentId,
      total: finalOrder?.total,
      createdAt: finalOrder?.createdAt,
      updatedAt: finalOrder?.updatedAt
    });

    return res.status(200).json({
      success: true,
      debug: 'Checkout completo testado',
      results: {
        step1_order: {
          id: order.id,
          initialStatus: 'PENDING'
        },
        step2_token: {
          created: !!cardToken
        },
        step3_payment: {
          id: payment.id,
          status: payment.status,
          statusDetail: payment.status_detail
        },
        step4_mapping: {
          originalStatus: payment.status,
          mappedStatus: mappedStatus
        },
        step5_paymentStatusCheck: {
          id: paymentStatus.id,
          status: paymentStatus.status,
          statusDetail: paymentStatus.status_detail
        },
        step6_finalOrder: {
          id: finalOrder?.id,
          finalStatus: finalOrder?.status,
          paymentId: finalOrder?.paymentId
        },
        conclusion: {
          paymentWasApproved: payment.status === 'approved',
          orderStatusIsCorrect: finalOrder?.status === 'PAID' && payment.status === 'approved',
          issue: finalOrder?.status !== 'PAID' && payment.status === 'approved' ? 'STATUS_MAPPING_ISSUE' : null
        }
      }
    });

  } catch (error: any) {
    console.error('❌ ERRO NO DEBUG:', error);
    return res.status(500).json({
      error: 'Erro no debug',
      message: error.message,
      stack: error.stack
    });
  }
};

// ✅ ENDPOINT: TESTE COM DADOS ESPECÍFICOS DO USUÁRIO
export const testUserCardData = async (req: Request, res: Response) => {
  try {
    console.log('🧪 TESTANDO COM DADOS ESPECÍFICOS DO USUÁRIO...');
    
    const { 
      cardNumber, 
      holderName, 
      expiryMonth, 
      expiryYear, 
      cvv, 
      cpfCnpj,
      email = 'test@user.com',
      amount = 10.00
    } = req.body;

    if (!cardNumber || !holderName || !expiryMonth || !expiryYear || !cvv || !cpfCnpj) {
      return res.status(400).json({
        error: 'Dados obrigatórios: cardNumber, holderName, expiryMonth, expiryYear, cvv, cpfCnpj'
      });
    }

    console.log('📊 DADOS RECEBIDOS:', {
      cardNumber: cardNumber.replace(/\d(?=\d{4})/g, '*'),
      holderName,
      expiryMonth,
      expiryYear,
      cvv: '***',
      cpfCnpj: cpfCnpj.replace(/\d(?=\d{4})/g, '*'),
      amount
    });

    // ✅ 1. CRIAR TOKEN
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    const fullYear = expiryYear.length === 2 ? '20' + expiryYear : expiryYear;

    const cardToken = await mercadoPagoService.createCardToken({
      card_number: cleanCardNumber,
      security_code: cvv,
      expiration_month: Number(expiryMonth),
      expiration_year: Number(fullYear),
      cardholder: {
        name: holderName.toUpperCase(),
        identification: {
          type: cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
          number: cpfCnpj.replace(/\D/g, '')
        }
      }
    });

    console.log('✅ TOKEN CRIADO:', cardToken);

    // ✅ 2. CRIAR PAGAMENTO
    const [firstName, ...lastNameParts] = holderName.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    const payment = await mercadoPagoService.createPayment({
      transaction_amount: Number(amount),
      token: cardToken,
      description: `TESTE Usuário - ${Date.now()}`,
      installments: 1,
      payer: {
        email: email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
          number: cpfCnpj.replace(/\D/g, '')
        },
        phone: {
          area_code: '11',
          number: '987654321'
        },
        address: {
          zip_code: '01310-100',
          street_number: '123'
        }
      },
      external_reference: `user_test_${Date.now()}`,
      notification_url: `${process.env.API_URL || 'http://localhost:4000'}/api/mercadopago/webhook`,
      metadata: {
        order_id: `user_test_${Date.now()}`
      }
    });

    console.log('✅ RESULTADO:', {
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      authCode: (payment as any).authorization_code
    });

    return res.status(200).json({
      success: true,
      test: 'Dados específicos do usuário',
      results: {
        token: {
          created: !!cardToken
        },
        payment: {
          id: payment.id,
          status: payment.status,
          statusDetail: payment.status_detail,
          authorizationCode: (payment as any).authorization_code,
          isApproved: payment.status === 'approved',
          netAmount: (payment as any).transaction_details?.net_received_amount
        },
        analysis: {
          cardNumberLength: cleanCardNumber.length,
          documentType: cpfCnpj.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ',
          documentLength: cpfCnpj.replace(/\D/g, '').length,
          holderNameLength: holderName.length,
          amountValue: amount
        }
      }
    });

  } catch (error: any) {
    console.error('❌ ERRO NO TESTE:', error);
    return res.status(500).json({
      error: 'Erro no teste com dados do usuário',
      message: error.message,
      details: error.cause || error.response?.data
    });
  }
}; 

// ✅ TESTE PÚBLICO: REDUÇÃO DE ESTOQUE (SEM AUTENTICAÇÃO)
export const testStockReduction = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({
        error: 'ID do pedido inválido'
      });
    }

    console.log(`🧪 TESTE: Reduzindo estoque do pedido ${orderId}...`);
    
    const result = await reduceStockOnPaymentApproved(Number(orderId));
    
    return res.json({
      success: true,
      message: 'Teste de redução de estoque realizado',
      orderId: Number(orderId),
      result
    });

  } catch (error: any) {
    console.error('❌ Erro no teste de redução de estoque:', error);
    return res.status(500).json({
      error: 'Erro ao testar redução de estoque',
      message: error.message
    });
  }
};

// ✅ TESTE PÚBLICO: VERIFICAR DADOS DO PEDIDO (SEM AUTENTICAÇÃO)
export const testOrderData = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({
        error: 'ID do pedido inválido'
      });
    }

    console.log(`🧪 TESTE: Verificando dados do pedido ${orderId}...`);
    
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
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
      return res.status(404).json({
        error: 'Pedido não encontrado'
      });
    }
    
    return res.json({
      success: true,
      message: 'Dados do pedido',
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        itemsCount: order.items.length,
        items: order.items.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          currentStock: item.product.stock,
          variantId: item.productVariantId,
          variantStock: item.productVariant?.stock
        }))
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar dados do pedido:', error);
    return res.status(500).json({
      error: 'Erro ao verificar pedido',
      message: error.message
    });
  }
};

// ✅ TESTE REAL: CHECKOUT COM PRODUTO QUE TEM ESTOQUE
export const testRealCheckout = async (req: Request, res: Response) => {
  try {
    console.log('🧪 TESTE REAL: Checkout com produto que tem estoque...');
    
    // ✅ 1. VERIFICAR ESTOQUE ANTES
    const productBefore = await prisma.product.findUnique({
      where: { id: 24 }, // RASH GUARD VERDE E AMARELA que tem stock: 3
      select: { id: true, name: true, stock: true, price: true }
    });

    if (!productBefore) {
      return res.status(400).json({
        error: 'Produto não encontrado'
      });
    }

    console.log('📦 ESTOQUE ANTES:', {
      productId: productBefore.id,
      name: productBefore.name,
      stockBefore: productBefore.stock
    });

    if (productBefore.stock <= 0) {
      return res.status(400).json({
        error: 'Produto sem estoque para teste',
        stock: productBefore.stock
      });
    }

    // ✅ 2. CRIAR PEDIDO COM PRODUTO REAL
    const fakeUserId = 1;
    const orderData = {
      total: Number(productBefore.price),
      cpfCnpj: '12345678909',
      email: 'test@test.com',
      address: {
        street: 'Rua Teste',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        phone: '11987654321',
        name: 'APRO TEST'
      }
    };

    console.log('🛒 2. CRIANDO PEDIDO COM PRODUTO REAL...');
    const order = await prisma.order.create({
      data: {
        userId: fakeUserId,
        customerName: orderData.address.name,
        customerEmail: orderData.email,
        total: orderData.total,
        status: 'PENDING',
        paymentMethod: 'CREDIT_CARD',
        shippingAddress: JSON.stringify(orderData.address),
        items: {
          create: [
            {
              productId: productBefore.id,
              quantity: 1,
              price: Number(productBefore.price)
            }
          ]
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, stock: true }
            }
          }
        }
      }
    });

    console.log('✅ PEDIDO CRIADO:', {
      orderId: order.id,
      items: order.items.map(item => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        currentStock: item.product.stock
      }))
    });

    // ✅ 3. CRIAR TOKEN DE CARTÃO
    const cardData = {
      number: '4111111111111111',
      holderName: 'APRO',
      expiryMonth: '11',
      expiryYear: '2030',
      cvv: '123',
      cpfCnpj: '12345678909'
    };

    console.log('💳 3. CRIANDO TOKEN DE CARTÃO...');
    const token = await mercadoPagoService.createCardToken({
      card_number: cardData.number,
      security_code: cardData.cvv,
      expiration_month: Number(cardData.expiryMonth),
      expiration_year: Number(cardData.expiryYear),
      cardholder: {
        name: cardData.holderName,
        identification: {
          type: 'CPF',
          number: cardData.cpfCnpj.replace(/\D/g, '')
        }
      }
    });

    // ✅ 4. PROCESSAR PAGAMENTO
    console.log('💰 4. PROCESSANDO PAGAMENTO...');
    const payment = await mercadoPagoService.createPayment({
      transaction_amount: Number(order.total),
      token: token,
      description: `Teste Real - Pedido #${order.id}`,
      installments: 1,
      payer: {
        email: orderData.email,
        first_name: 'APRO',
        last_name: 'TEST',
        identification: {
          type: 'CPF',
          number: cardData.cpfCnpj.replace(/\D/g, '')
        },
        phone: {
          area_code: '11',
          number: '987654321'
        },
        address: {
          zip_code: '01310-100',
          street_number: '123'
        }
      },
      external_reference: String(order.id),
      metadata: {
        order_id: String(order.id)
      }
    });

    // ✅ 5. MAPEAR STATUS E ATUALIZAR PEDIDO
    const mappedStatus = mercadoPagoService.mapMercadoPagoStatusToOrderStatus(payment.status);
    
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: String(payment.id),
        status: mappedStatus as OrderStatus,
        updatedAt: new Date()
      }
    });

    console.log('✅ STATUS ATUALIZADO:', {
      orderId: order.id,
      paymentStatus: payment.status,
      mappedStatus: mappedStatus,
      isApproved: payment.status === 'approved'
    });

    // ✅ REDUZIR ESTOQUE AUTOMATICAMENTE SE APROVADO (SIMULANDO O FLUXO REAL)
    if (payment.status === 'approved') {
      console.log('🎉 PAGAMENTO APROVADO - Reduzindo estoque automaticamente...');
      try {
        await reduceStockOnPaymentApproved(order.id);
        console.log(`📦 Estoque reduzido automaticamente para o pedido ${order.id}`);
      } catch (stockError) {
        console.error(`❌ Erro ao reduzir estoque do pedido ${order.id}:`, stockError);
      }
    }

    // ✅ 6. VERIFICAR SE ESTOQUE FOI REDUZIDO AUTOMATICAMENTE
    const productAfter = await prisma.product.findUnique({
      where: { id: 24 },
      select: { id: true, name: true, stock: true }
    });

    console.log('📦 ESTOQUE DEPOIS:', {
      productId: productAfter?.id,
      name: productAfter?.name,
      stockAfter: productAfter?.stock,
      stockReduced: (productBefore.stock - (productAfter?.stock || 0))
    });

    return res.json({
      success: true,
      message: 'Teste real de checkout realizado',
      results: {
        order: {
          id: order.id,
          status: mappedStatus,
          total: order.total
        },
        payment: {
          id: payment.id,
          status: payment.status,
          approved: payment.status === 'approved'
        },
        stock: {
          productId: productBefore.id,
          productName: productBefore.name,
          stockBefore: productBefore.stock,
          stockAfter: productAfter?.stock,
          stockReduced: (productBefore.stock - (productAfter?.stock || 0)),
          automaticReductionWorked: payment.status === 'approved' && productAfter && productAfter.stock < productBefore.stock
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro no teste real:', error);
    return res.status(500).json({
      error: 'Erro no teste real',
      message: error.message
    });
  }
};