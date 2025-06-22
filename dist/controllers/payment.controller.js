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
exports.asaasWebhook = exports.checkPaymentStatus = exports.generatePaymentLink = exports.processDebitCardPayment = exports.processCreditCardPayment = void 0;
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../config/prisma"));
const asaas_service_1 = __importDefault(require("../services/asaas.service"));
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
    remoteIp: zod_1.z.string().optional(),
});
// Schema para validação de pagamento via boleto/pix
const boletoPixPaymentSchema = zod_1.z.object({
    orderId: zod_1.z.number().int().positive(),
    billingType: zod_1.z.enum(['BOLETO', 'PIX']),
    cpfCnpj: zod_1.z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido').optional(),
});
// Schema para validação de pagamento com cartão de débito
const debitCardPaymentSchema = zod_1.z.object({
    orderId: zod_1.z.number().int().positive(),
    debitCard: zod_1.z.object({
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
    remoteIp: zod_1.z.string().optional(),
});
// Schema para webhook
const webhookSchema = zod_1.z.object({
    event: zod_1.z.string(),
    payment: zod_1.z.object({
        id: zod_1.z.string(),
        status: zod_1.z.string(),
        externalReference: zod_1.z.string().optional(),
    }),
});
// Processar pagamento com cartão de crédito
const processCreditCardPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
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
        const { orderId, creditCard, holderInfo, remoteIp } = validation.data;
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
        // Buscar ou criar cliente no Asaas
        let customer;
        // Se o pedido pertence a um usuário autenticado
        if (order.userId && order.user) {
            customer = yield asaas_service_1.default.findCustomerByEmail(order.user.email);
            if (!customer) {
                customer = yield asaas_service_1.default.createCustomer({
                    name: order.user.name || holderInfo.name || 'Cliente',
                    email: order.user.email,
                    cpfCnpj: holderInfo.cpfCnpj,
                    phone: holderInfo.phone,
                    postalCode: holderInfo.postalCode,
                    addressNumber: holderInfo.addressNumber,
                    complement: holderInfo.addressComplement,
                });
            }
        }
        else {
            // Se for uma compra de convidado, usar as informações do titular
            customer = yield asaas_service_1.default.createCustomer({
                name: holderInfo.name,
                email: holderInfo.email,
                cpfCnpj: holderInfo.cpfCnpj,
                phone: holderInfo.phone,
                postalCode: holderInfo.postalCode,
                addressNumber: holderInfo.addressNumber,
                complement: holderInfo.addressComplement,
            });
        }
        // Criar pagamento no Asaas
        const payment = yield asaas_service_1.default.createPayment({
            customer: customer.id,
            billingType: 'CREDIT_CARD',
            value: Number(order.total),
            dueDate: new Date().toISOString().split('T')[0], // Data atual
            description: `Pedido #${order.id}`,
            externalReference: String(order.id),
            creditCard: {
                holderName: creditCard.holderName,
                number: creditCard.number,
                expiryMonth: creditCard.expiryMonth,
                expiryYear: creditCard.expiryYear,
                ccv: creditCard.ccv,
            },
            creditCardHolderInfo: {
                name: holderInfo.name,
                email: holderInfo.email,
                cpfCnpj: holderInfo.cpfCnpj,
                postalCode: holderInfo.postalCode,
                addressNumber: holderInfo.addressNumber,
                addressComplement: holderInfo.addressComplement,
                phone: holderInfo.phone,
            },
            remoteIp,
        });
        // Atualizar o pedido com as informações de pagamento
        yield prisma_1.default.order.update({
            where: { id: orderId },
            data: {
                status: asaas_service_1.default.mapAsaasStatusToOrderStatus(payment.status),
            }
        });
        return res.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                value: payment.value,
                orderStatus: asaas_service_1.default.mapAsaasStatusToOrderStatus(payment.status),
            }
        });
    }
    catch (error) {
        console.error('Erro ao processar pagamento com cartão:', error);
        // Verificar se é um erro de resposta da API
        if (((_c = (_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errors) === null || _c === void 0 ? void 0 : _c.length) > 0) {
            const apiError = error.response.data.errors[0];
            let errorMessage = apiError.description || 'Erro ao processar pagamento';
            let statusCode = 400;
            // Mapear códigos de erro específicos do cartão de crédito
            switch (apiError.code) {
                case 'invalid_credit_card':
                    errorMessage = 'Cartão inválido ou não autorizado pela operadora';
                    break;
                case 'expired_card':
                    errorMessage = 'Cartão expirado';
                    break;
                case 'insufficient_funds':
                    errorMessage = 'Saldo insuficiente no cartão';
                    break;
                case 'blocked_credit_card':
                    errorMessage = 'Cartão bloqueado';
                    break;
                case 'canceled_credit_card':
                    errorMessage = 'Cartão cancelado';
                    break;
                case 'unauthorized_credit_card':
                    errorMessage = 'Transação não autorizada. Contate o emissor do cartão.';
                    break;
                default:
                    if (apiError.description.includes('cartão')) {
                        errorMessage = `Erro no cartão: ${apiError.description}`;
                    }
                    else {
                        errorMessage = apiError.description;
                    }
            }
            return res.status(statusCode).json({
                error: errorMessage,
                code: apiError.code,
                details: error.response.data
            });
        }
        return res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
});
exports.processCreditCardPayment = processCreditCardPayment;
// Processar pagamento com cartão de débito
const processDebitCardPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
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
        const { orderId, debitCard, holderInfo, remoteIp } = validation.data;
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
        // Buscar ou criar cliente no Asaas
        let customer;
        // Se o pedido pertence a um usuário autenticado
        if (order.userId && order.user) {
            customer = yield asaas_service_1.default.findCustomerByEmail(order.user.email);
            if (!customer) {
                customer = yield asaas_service_1.default.createCustomer({
                    name: order.user.name || holderInfo.name || 'Cliente',
                    email: order.user.email,
                    cpfCnpj: holderInfo.cpfCnpj,
                    phone: holderInfo.phone,
                    postalCode: holderInfo.postalCode,
                    addressNumber: holderInfo.addressNumber,
                    complement: holderInfo.addressComplement,
                });
            }
        }
        else {
            // Se for uma compra de convidado, usar as informações do titular
            customer = yield asaas_service_1.default.createCustomer({
                name: holderInfo.name,
                email: holderInfo.email,
                cpfCnpj: holderInfo.cpfCnpj,
                phone: holderInfo.phone,
                postalCode: holderInfo.postalCode,
                addressNumber: holderInfo.addressNumber,
                complement: holderInfo.addressComplement,
            });
        }
        // Criar pagamento no Asaas
        const payment = yield asaas_service_1.default.createPayment({
            customer: customer.id,
            billingType: 'DEBIT_CARD',
            value: Number(order.total),
            dueDate: new Date().toISOString().split('T')[0], // Data atual
            description: `Pedido #${order.id}`,
            externalReference: String(order.id),
            creditCard: {
                holderName: debitCard.holderName,
                number: debitCard.number,
                expiryMonth: debitCard.expiryMonth,
                expiryYear: debitCard.expiryYear,
                ccv: debitCard.ccv,
            },
            creditCardHolderInfo: {
                name: holderInfo.name,
                email: holderInfo.email,
                cpfCnpj: holderInfo.cpfCnpj,
                postalCode: holderInfo.postalCode,
                addressNumber: holderInfo.addressNumber,
                addressComplement: holderInfo.addressComplement,
                phone: holderInfo.phone,
            },
            remoteIp,
        });
        // Atualizar o pedido com as informações de pagamento
        yield prisma_1.default.order.update({
            where: { id: orderId },
            data: {
                status: asaas_service_1.default.mapAsaasStatusToOrderStatus(payment.status),
            }
        });
        return res.json({
            success: true,
            payment: {
                id: payment.id,
                status: payment.status,
                value: payment.value,
                orderStatus: asaas_service_1.default.mapAsaasStatusToOrderStatus(payment.status),
            }
        });
    }
    catch (error) {
        console.error('Erro ao processar pagamento com cartão de débito:', error);
        // Verificar se é um erro de resposta da API
        if (((_c = (_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.errors) === null || _c === void 0 ? void 0 : _c.length) > 0) {
            const apiError = error.response.data.errors[0];
            let errorMessage = apiError.description || 'Erro ao processar pagamento';
            let statusCode = 400;
            // Mapear códigos de erro específicos do cartão
            switch (apiError.code) {
                case 'invalid_credit_card':
                    errorMessage = 'Cartão inválido ou não autorizado pela operadora';
                    break;
                case 'expired_card':
                    errorMessage = 'Cartão expirado';
                    break;
                case 'insufficient_funds':
                    errorMessage = 'Saldo insuficiente no cartão';
                    break;
                case 'blocked_credit_card':
                    errorMessage = 'Cartão bloqueado';
                    break;
                case 'canceled_credit_card':
                    errorMessage = 'Cartão cancelado';
                    break;
                case 'unauthorized_credit_card':
                    errorMessage = 'Transação não autorizada. Contate o emissor do cartão.';
                    break;
                default:
                    if (apiError.description.includes('cartão')) {
                        errorMessage = `Erro no cartão: ${apiError.description}`;
                    }
                    else {
                        errorMessage = apiError.description;
                    }
            }
            return res.status(statusCode).json({
                error: errorMessage,
                code: apiError.code,
                details: error.response.data
            });
        }
        return res.status(500).json({ error: 'Erro ao processar pagamento' });
    }
});
exports.processDebitCardPayment = processDebitCardPayment;
// Gerar link de pagamento (boleto/pix)
const generatePaymentLink = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Validar os dados de entrada com zod
        const schema = zod_1.z.object({
            orderId: zod_1.z.number().or(zod_1.z.string().transform(val => Number(val))), // Permite enviar como string ou número
            billingType: zod_1.z.enum(['BOLETO', 'PIX']),
            cpfCnpj: zod_1.z.string().optional(),
            // Campos adicionais para usuários não autenticados
            email: zod_1.z.string().email().optional(),
            name: zod_1.z.string().optional(),
        });
        const validationResult = schema.safeParse(req.body);
        if (!validationResult.success) {
            console.error('Erro de validação:', validationResult.error);
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validationResult.error.format()
            });
        }
        const { orderId: orderIdParam, billingType, cpfCnpj, email, name } = validationResult.data;
        const orderIdNum = Number(orderIdParam);
        // Validar CPF/CNPJ se fornecido
        if (cpfCnpj) {
            if (!(0, validation_1.validateDocument)(cpfCnpj)) {
                return res.status(400).json({
                    error: 'CPF/CNPJ inválido',
                    message: 'O número de CPF/CNPJ fornecido não é válido'
                });
            }
        }
        // Verificar se o pedido existe
        const order = yield prisma_1.default.order.findUnique({
            where: {
                id: orderIdNum
            }
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Verificação de permissão - pular para rotas guest
        const isGuestRoute = req.path.includes('/guest/');
        if (!isGuestRoute && req.user) {
            // Para usuários autenticados, verificar se o pedido pertence ao usuário
            if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ error: 'Você não tem permissão para acessar este pedido' });
            }
        }
        // Se for rota de guest e não tiver os campos obrigatórios, retornar erro
        if (isGuestRoute && (!email || !name || !cpfCnpj)) {
            return res.status(400).json({
                error: 'Dados incompletos',
                message: 'Nome, email e CPF/CNPJ são obrigatórios para pagamentos sem login'
            });
        }
        // IMPORTANTE: Verificar se já existe um pagamento para este pedido
        try {
            const existingPayments = yield asaas_service_1.default.getPaymentsByExternalReference(String(order.id));
            // Filtrar pagamentos pelo tipo de cobrança (boleto ou pix)
            const filteredPayments = existingPayments
                .filter(p => p.billingType === billingType)
                .filter(p => !['CANCELLED', 'REFUNDED'].includes(p.status)); // Ignorar cancelados/estornados
            // Se já existe um pagamento deste tipo para o pedido, retornar ele em vez de criar um novo
            if (filteredPayments.length > 0) {
                console.log(`Pagamento existente encontrado para pedido #${order.id}, tipo ${billingType}`);
                const existingPayment = filteredPayments[0]; // Pegar o mais recente
                const responsePayment = {
                    id: existingPayment.id,
                    status: existingPayment.status,
                    value: existingPayment.value,
                    dueDate: existingPayment.dueDate,
                    bankSlipUrl: existingPayment.bankSlipUrl,
                    invoiceUrl: existingPayment.invoiceUrl,
                    orderStatus: asaas_service_1.default.mapAsaasStatusToOrderStatus(existingPayment.status),
                };
                // Para pagamentos PIX, buscar os dados do QR code
                if (billingType === 'PIX') {
                    try {
                        const pixInfo = yield asaas_service_1.default.getPixInfo(existingPayment.id);
                        // Adicionar as informações do PIX à resposta
                        Object.assign(responsePayment, {
                            pixQrCode: pixInfo.payload,
                            pixCodeQrCode: pixInfo.payload,
                            pixEncodedImage: pixInfo.encodedImage,
                            pixCodeBase64: pixInfo.encodedImage
                        });
                    }
                    catch (pixError) {
                        console.error('Erro ao buscar dados do PIX existente:', pixError);
                    }
                }
                return res.json({
                    success: true,
                    payment: responsePayment,
                    message: 'Pagamento existente recuperado com sucesso.'
                });
            }
        }
        catch (error) {
            console.error('Erro ao verificar pagamentos existentes:', error);
            // Continue normalmente se falhar esta verificação
        }
        // Buscar dados do cliente ou criar um novo
        let customer;
        try {
            // Se o usuário estiver autenticado, buscar por ele
            if (req.user) {
                // Buscar usuário para obter dados atualizados
                const user = yield prisma_1.default.user.findUnique({
                    where: { id: req.user.id }
                });
                if (!user) {
                    return res.status(404).json({ error: 'Usuário não encontrado' });
                }
                // Buscar cliente no Asaas pelo e-mail
                const existingCustomer = yield asaas_service_1.default.findCustomerByEmail(user.email);
                if (existingCustomer) {
                    // Atualizar dados do cliente se necessário
                    customer = existingCustomer;
                }
                else {
                    // Criar novo cliente no Asaas
                    customer = yield asaas_service_1.default.createCustomer({
                        name: user.name || 'Cliente',
                        email: user.email,
                        cpfCnpj: cpfCnpj || '', // Usar o valor passado ou string vazia
                        // Outros campos conforme necessário
                    });
                }
            }
            else {
                // Para usuários não autenticados (guest), usar os dados da requisição
                // Buscar cliente no Asaas pelo e-mail
                const existingCustomer = yield asaas_service_1.default.findCustomerByEmail(email);
                if (existingCustomer) {
                    // Atualizar dados do cliente se necessário
                    customer = existingCustomer;
                }
                else {
                    // Criar novo cliente no Asaas
                    customer = yield asaas_service_1.default.createCustomer({
                        name: name,
                        email: email,
                        cpfCnpj: cpfCnpj || '',
                        // Outros campos conforme necessário
                    });
                }
            }
        }
        catch (error) {
            console.error('Erro ao criar ou buscar cliente no Asaas:', error);
            return res.status(500).json({
                error: 'Erro ao processar cliente',
                details: ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message
            });
        }
        // Criar pagamento no Asaas
        try {
            const payment = yield asaas_service_1.default.createPayment({
                customer: customer.id,
                billingType,
                value: Number(order.total), // O order.total já contém o desconto aplicado quando for PIX
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 dias a partir de hoje
                description: `Pedido #${order.id}`,
                externalReference: String(order.id),
            });
            // Log da resposta da API para debug
            console.log('Resposta da API Asaas para criação de pagamento:', JSON.stringify(payment, null, 2));
            // Estruturar a resposta inicial
            const responsePayment = {
                id: payment.id,
                status: payment.status,
                value: payment.value,
                dueDate: payment.dueDate,
                bankSlipUrl: payment.bankSlipUrl,
                invoiceUrl: payment.invoiceUrl,
                orderStatus: asaas_service_1.default.mapAsaasStatusToOrderStatus(payment.status),
            };
            // Para pagamentos PIX, buscar os dados do QR code em uma chamada separada
            if (billingType === 'PIX') {
                try {
                    const pixInfo = yield asaas_service_1.default.getPixInfo(payment.id);
                    console.log('Informações do PIX obtidas:', pixInfo);
                    // Adicionar as informações do PIX à resposta
                    Object.assign(responsePayment, {
                        pixQrCode: pixInfo.payload,
                        pixCodeQrCode: pixInfo.payload,
                        pixEncodedImage: pixInfo.encodedImage,
                        pixCodeBase64: pixInfo.encodedImage
                    });
                }
                catch (pixError) {
                    console.error('Erro ao buscar dados do PIX:', pixError);
                    // Continuar mesmo se falhar ao buscar os dados do PIX
                }
            }
            return res.json({
                success: true,
                payment: responsePayment
            });
        }
        catch (error) {
            console.error('Erro ao gerar link de pagamento:', error);
            return res.status(500).json({
                error: 'Erro ao gerar link de pagamento',
                details: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message
            });
        }
    }
    catch (error) {
        console.error('Erro ao gerar link de pagamento:', error);
        return res.status(500).json({
            error: 'Erro ao gerar link de pagamento',
            message: error.message
        });
    }
});
exports.generatePaymentLink = generatePaymentLink;
// Verificar status do pagamento
const checkPaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const orderIdNum = Number(orderId);
        if (isNaN(orderIdNum)) {
            return res.status(400).json({ error: 'ID de pedido inválido' });
        }
        // Buscar o pedido
        const order = yield prisma_1.default.order.findUnique({
            where: { id: orderIdNum },
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Se usuário estiver autenticado, verificar se é o dono do pedido ou admin
        if (req.user && order.userId !== null) {
            if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
                return res.status(403).json({ error: 'Acesso negado' });
            }
        }
        try {
            // Verificar se existe um pagamento no Asaas para este pedido 
            // usando o externalReference que é o ID do pedido
            const payments = yield asaas_service_1.default.getPaymentsByExternalReference(String(order.id));
            if (!payments || payments.length === 0) {
                // Se não encontrar pagamentos, retorna apenas o status do pedido
                return res.json({
                    orderId: order.id,
                    status: order.status,
                });
            }
            // Pegar o pagamento mais recente
            const latestPayment = payments[0];
            console.log('Status de pagamento do Asaas:', latestPayment);
            // Mapear o status do Asaas para o status do pedido
            const orderStatus = asaas_service_1.default.mapAsaasStatusToOrderStatus(latestPayment.status);
            // Se o status mudou, atualizar no banco de dados
            if (orderStatus !== order.status) {
                yield prisma_1.default.order.update({
                    where: { id: orderIdNum },
                    data: {
                        status: orderStatus,
                    }
                });
            }
            return res.json({
                orderId: order.id,
                status: orderStatus,
                paymentStatus: latestPayment.status,
                paymentInfo: {
                    id: latestPayment.id,
                    value: latestPayment.value,
                    dueDate: latestPayment.dueDate,
                    bankSlipUrl: latestPayment.bankSlipUrl,
                    invoiceUrl: latestPayment.invoiceUrl
                }
            });
        }
        catch (error) {
            console.error('Erro ao verificar status de pagamento no Asaas:', error);
            // Em caso de erro, retorna o status atual do pedido
            return res.json({
                orderId: order.id,
                status: order.status,
                error: 'Não foi possível obter atualizações do status de pagamento'
            });
        }
    }
    catch (error) {
        console.error('Erro ao verificar status do pedido:', error);
        return res.status(500).json({ error: 'Erro ao verificar status do pedido' });
    }
});
exports.checkPaymentStatus = checkPaymentStatus;
// Webhook para receber notificações do Asaas
const asaasWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validation = webhookSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }
        const { event, payment } = validation.data;
        // Ignorar eventos que não são de pagamento
        if (!event.startsWith('PAYMENT_')) {
            return res.json({ received: true });
        }
        // Obter o ID do pedido a partir do externalReference
        const orderId = payment.externalReference ? Number(payment.externalReference) : null;
        if (!orderId) {
            return res.status(400).json({ error: 'Referência externa não encontrada' });
        }
        // Buscar o pedido
        const order = yield prisma_1.default.order.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            return res.status(404).json({ error: 'Pedido não encontrado' });
        }
        // Processar o webhook e obter o status mapeado
        const result = asaas_service_1.default.processWebhook(req.body);
        // Atualizar o status do pedido
        yield prisma_1.default.order.update({
            where: { id: orderId },
            data: {
                status: result.status,
            }
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Erro ao processar webhook do Asaas:', error);
        return res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});
exports.asaasWebhook = asaasWebhook;
