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
exports.mercadoPagoWebhook = exports.checkPaymentStatus = exports.processPixPayment = exports.processCreditCardPayment = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../config/prisma"));
const mercadopago_service_1 = __importDefault(require("../services/mercadopago.service"));
const validation_1 = require("../utils/validation");
// Schema para validação de pagamento com cartão de crédito
const creditCardPaymentSchema = zod_1.z.object({
    orderId: zod_1.z.number().int().positive(),
    creditCard: zod_1.z.object({
        holderName: zod_1.z.string().min(1, 'Nome do titular é obrigatório'),
        number: zod_1.z.string().min(13, 'Número do cartão inválido').max(19, 'Número do cartão inválido'),
        expiryMonth: zod_1.z.string().min(1, 'Mês de expiração é obrigatório').max(2, 'Mês de expiração inválido'),
        expiryYear: zod_1.z.string().min(2, 'Ano de expiração é obrigatório').max(4, 'Ano de expiração inválido'),
        ccv: zod_1.z.string().min(3, 'CCV inválido').max(4, 'CCV inválido'),
    }),
    holderInfo: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Nome é obrigatório'),
        email: zod_1.z.string().email('Email inválido'),
        cpfCnpj: zod_1.z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido'),
        postalCode: zod_1.z.string().min(8, 'CEP inválido').max(9, 'CEP inválido'),
        addressNumber: zod_1.z.string().min(1, 'Número do endereço é obrigatório'),
        addressComplement: zod_1.z.string().optional(),
        phone: zod_1.z.string().min(10, 'Telefone inválido').max(11, 'Telefone inválido'),
    }),
    installments: zod_1.z.number().int().min(1).max(12).optional(),
});
// Schema para validação de pagamento via PIX
const pixPaymentSchema = zod_1.z.object({
    orderId: zod_1.z.number().int().positive(),
    cpfCnpj: zod_1.z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido').optional(),
});
// Schema para webhook
const webhookSchema = zod_1.z.object({
    type: zod_1.z.string(),
    action: zod_1.z.string(),
    data: zod_1.z.object({
        id: zod_1.z.string(),
    }),
});
// Processar pagamento com cartão de crédito
const processCreditCardPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
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
        if (!(0, validation_1.validateDocument)(holderInfo.cpfCnpj)) {
            return res.status(400).json({
                error: 'CPF/CNPJ inválido',
                message: 'O número de CPF/CNPJ fornecido não é válido'
            });
        }
        // Buscar o pedido
        const order = yield prisma_1.default.order.findUnique({
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
        const cardToken = yield mercadopago_service_1.default.createCardToken({
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
        const payment = yield mercadopago_service_1.default.createPayment({
            transaction_amount: Number(order.total),
            token: cardToken,
            description: `Pedido #${order.id}`,
            installments: installments || 1,
            payment_method_id: 'visa', // Será detectado automaticamente pelo token
            payer: {
                email: ((_a = order.user) === null || _a === void 0 ? void 0 : _a.email) || holderInfo.email,
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
        yield prisma_1.default.order.update({
            where: { id: orderId },
            data: {
                status: mercadopago_service_1.default.mapMercadoPagoStatusToOrderStatus(payment.status),
            }
        });
        return res.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                status_detail: payment.status_detail,
                transaction_amount: payment.transaction_amount,
                orderStatus: mercadopago_service_1.default.mapMercadoPagoStatusToOrderStatus(payment.status),
            }
        });
    }
    catch (error) {
        console.error('Erro ao processar pagamento com cartão:', error);
        // Verificar se é um erro de resposta da API
        if (((_d = (_c = (_b = error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.cause) === null || _d === void 0 ? void 0 : _d.length) > 0) {
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
});
exports.processCreditCardPayment = processCreditCardPayment;
// Processar pagamento PIX
const processPixPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
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
        const order = yield prisma_1.default.order.findUnique({
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
        const [firstName, ...lastNameParts] = (((_a = order.user) === null || _a === void 0 ? void 0 : _a.name) || 'Cliente').split(' ');
        const lastName = lastNameParts.join(' ') || '';
        // Criar pagamento PIX no Mercado Pago
        const payment = yield mercadopago_service_1.default.createPixPayment({
            transaction_amount: Number(order.total),
            description: `Pedido #${order.id}`,
            payment_method_id: 'pix',
            payer: {
                email: ((_b = order.user) === null || _b === void 0 ? void 0 : _b.email) || '',
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
        yield prisma_1.default.order.update({
            where: { id: orderId },
            data: {
                status: mercadopago_service_1.default.mapMercadoPagoStatusToOrderStatus(payment.status),
            }
        });
        // Obter informações do PIX
        const pixInfo = yield mercadopago_service_1.default.getPixInfo(String(payment.id));
        return res.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                status_detail: payment.status_detail,
                transaction_amount: payment.transaction_amount,
                orderStatus: mercadopago_service_1.default.mapMercadoPagoStatusToOrderStatus(payment.status),
                pix: {
                    qr_code: pixInfo.qrCode,
                    qr_code_base64: pixInfo.qrCodeBase64
                }
            }
        });
    }
    catch (error) {
        console.error('Erro ao processar pagamento PIX:', error);
        if (((_e = (_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.cause) === null || _e === void 0 ? void 0 : _e.length) > 0) {
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
});
exports.processPixPayment = processPixPayment;
// Verificar status de pagamento
const checkPaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const { orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ error: 'ID do pedido é obrigatório' });
        }
        // Buscar o pedido
        const order = yield prisma_1.default.order.findUnique({
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
            const payments = yield mercadopago_service_1.default.getPaymentsByExternalReference(String(order.id));
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
            const orderStatus = mercadopago_service_1.default.mapMercadoPagoStatusToOrderStatus(latestPayment.status);
            // Atualizar o status do pedido se necessário
            if (order.status !== orderStatus) {
                yield prisma_1.default.order.update({
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
        }
        catch (error) {
            console.error('Erro ao verificar status de pagamento no Mercado Pago:', error);
            return res.status(500).json({
                error: 'Erro ao verificar status de pagamento',
                message: 'Não foi possível consultar o status do pagamento no momento'
            });
        }
    }
    catch (error) {
        console.error('Erro ao verificar status de pagamento:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.checkPaymentStatus = checkPaymentStatus;
// Webhook para receber notificações do Mercado Pago
const mercadoPagoWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Webhook recebido do Mercado Pago:', req.body);
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
        const payment = yield mercadopago_service_1.default.getPaymentStatus(data.id);
        if (!payment.external_reference) {
            console.log('Pagamento sem referência externa:', payment.id);
            return res.status(200).json({ received: true });
        }
        // Buscar o pedido pela referência externa
        const order = yield prisma_1.default.order.findUnique({
            where: { id: Number(payment.external_reference) }
        });
        if (!order) {
            console.error('Pedido não encontrado para referência:', payment.external_reference);
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Atualizar o status do pedido
        const newStatus = mercadopago_service_1.default.mapMercadoPagoStatusToOrderStatus(payment.status);
        yield prisma_1.default.order.update({
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
    }
    catch (error) {
        console.error('Erro ao processar webhook do Mercado Pago:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
});
exports.mercadoPagoWebhook = mercadoPagoWebhook;
