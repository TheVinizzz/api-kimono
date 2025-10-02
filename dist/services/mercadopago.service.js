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
const mercadopago_1 = require("mercadopago");
const config_1 = __importDefault(require("../config"));
// ===== SERVIÇO MERCADO PAGO PROFISSIONAL (2025) =====
// Implementação usando SDK oficial e melhores práticas de segurança
class MercadoPagoService {
    constructor() {
        // ✅ USAR SDK OFICIAL COM CONFIGURAÇÃO SEGURA
        this.client = new mercadopago_1.MercadoPagoConfig({
            accessToken: config_1.default.mercadopago.accessToken,
            options: {
                timeout: 15000, // 15 segundos timeout
                idempotencyKey: this.generateIdempotencyKey(),
            }
        });
        // Inicializar instâncias dos recursos
        this.payment = new mercadopago_1.Payment(this.client);
        this.preference = new mercadopago_1.Preference(this.client);
        // ✅ MAPEAMENTO COMPLETO DE STATUS (2025)
        this.statusMapping = {
            'pending': 'PENDING',
            'approved': 'PAID',
            'authorized': 'PAID',
            'in_process': 'PENDING',
            'in_mediation': 'PENDING',
            'rejected': 'CANCELED',
            'cancelled': 'CANCELED',
            'refunded': 'CANCELED',
            'charged_back': 'CANCELED'
        };
    }
    // ✅ GERAR CHAVE DE IDEMPOTÊNCIA SEGURA
    generateIdempotencyKey() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${random}`;
    }
    // ✅ MAPEAR STATUS CORRETAMENTE
    mapMercadoPagoStatusToOrderStatus(mercadoPagoStatus) {
        return this.statusMapping[mercadoPagoStatus] || 'PENDING';
    }
    // ✅ CRIAR PAGAMENTO USANDO SDK OFICIAL
    createPayment(paymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                console.log('🔄 Criando pagamento via SDK oficial do Mercado Pago...');
                console.log('📊 Dados recebidos para criação do pagamento:', {
                    transaction_amount: paymentData.transaction_amount,
                    hasToken: !!paymentData.token,
                    payment_method_id: paymentData.payment_method_id,
                    installments: paymentData.installments,
                    payer_email: paymentData.payer.email,
                    payer_name: `${paymentData.payer.first_name} ${paymentData.payer.last_name}`,
                    external_reference: paymentData.external_reference
                });
                // ✅ PREPARAR DADOS DO PAGAMENTO COM VALIDAÇÕES CORRETAS
                const paymentRequest = {
                    transaction_amount: Number(paymentData.transaction_amount),
                    description: paymentData.description || 'Pagamento e-commerce',
                    installments: paymentData.installments || 1,
                    payer: {
                        email: paymentData.payer.email,
                        first_name: paymentData.payer.first_name || 'Cliente',
                        last_name: paymentData.payer.last_name || 'Sobrenome',
                        identification: paymentData.payer.identification ? {
                            type: paymentData.payer.identification.type,
                            number: paymentData.payer.identification.number.toString()
                        } : undefined,
                        phone: paymentData.payer.phone,
                    },
                    external_reference: paymentData.external_reference,
                    notification_url: paymentData.notification_url || `${process.env.API_URL}/api/mercadopago/webhook`,
                    metadata: Object.assign(Object.assign({}, paymentData.metadata), { integration_version: '2025.1', integration_type: 'custom' }),
                    // ✅ CONFIGURAÇÕES DE SEGURANÇA
                    binary_mode: false,
                    capture: true,
                    // ✅ CONFIGURAÇÕES ADICIONAIS PARA MELHOR APROVAÇÃO
                    statement_descriptor: 'KIMONO STORE'
                };
                // Se tiver additional_info, incluir na requisição
                if (paymentData.additional_info) {
                    console.log('ℹ️ Incluindo additional_info na requisição');
                    // Garantir que additional_info.payer.address tenha apenas os campos permitidos
                    if ((_a = paymentData.additional_info.payer) === null || _a === void 0 ? void 0 : _a.address) {
                        const safeAddress = {
                            zip_code: paymentData.additional_info.payer.address.zip_code,
                            street_name: paymentData.additional_info.payer.address.street_name,
                            street_number: paymentData.additional_info.payer.address.street_number
                        };
                        paymentRequest.additional_info = Object.assign(Object.assign({}, paymentData.additional_info), { payer: Object.assign(Object.assign({}, paymentData.additional_info.payer), { address: safeAddress }) });
                    }
                    else {
                        paymentRequest.additional_info = paymentData.additional_info;
                    }
                }
                // ✅ ADICIONAR TOKEN OU PAYMENT_METHOD_ID CONFORME NECESSÁRIO
                if (paymentData.token) {
                    // Para cartões com token, NÃO incluir payment_method_id
                    paymentRequest.token = paymentData.token;
                    console.log('💳 Pagamento com token de cartão (payment_method_id será detectado automaticamente)');
                }
                else if (paymentData.payment_method_id) {
                    // Para outros métodos (PIX, boleto), incluir payment_method_id
                    paymentRequest.payment_method_id = paymentData.payment_method_id;
                    console.log('🏦 Pagamento com payment_method_id:', paymentData.payment_method_id);
                    // ✅ VERIFICAR SE É BOLETO E ADICIONAR ENDEREÇO DO PAGADOR SE NECESSÁRIO
                    if (paymentData.payment_method_id === 'bolbradesco') {
                        console.log('🧾 Verificando dados para boleto bancário...');
                        // Verificar se temos o endereço completo do pagador para boleto
                        if (!paymentData.payer.address) {
                            console.log('⚠️ ALERTA: Pagamento com boleto sem endereço do pagador!');
                        }
                        else {
                            console.log('📋 Dados de endereço para boleto:', paymentData.payer.address);
                            // Adicionar endereço básico ao payer para boleto
                            paymentRequest.payer.address = {
                                zip_code: paymentData.payer.address.zip_code,
                                street_name: paymentData.payer.address.street_name,
                                street_number: paymentData.payer.address.street_number,
                                neighborhood: paymentData.payer.address.neighborhood || "Centro",
                                city: paymentData.payer.address.city || "São Paulo",
                                federal_unit: paymentData.payer.address.federal_unit || "SP"
                            };
                        }
                        // Verificar se temos nome e sobrenome para boleto
                        if (!paymentData.payer.first_name || !paymentData.payer.last_name) {
                            console.log('⚠️ ALERTA: Pagamento com boleto sem nome ou sobrenome completos!');
                            console.log('Nome:', paymentData.payer.first_name || 'VAZIO');
                            console.log('Sobrenome:', paymentData.payer.last_name || 'VAZIO');
                            // Garantir que sempre tenha um valor
                            paymentRequest.payer.first_name = paymentData.payer.first_name || 'Cliente';
                            paymentRequest.payer.last_name = paymentData.payer.last_name || 'Sobrenome';
                            console.log('✅ Valores corrigidos para boleto:');
                            console.log('Nome:', paymentRequest.payer.first_name);
                            console.log('Sobrenome:', paymentRequest.payer.last_name);
                        }
                    }
                }
                else {
                    throw new Error('Token ou payment_method_id é obrigatório');
                }
                console.log('📝 Dados finais que serão enviados ao MP:', JSON.stringify(paymentRequest, null, 2));
                // ✅ CRIAR PAGAMENTO COM SDK
                const result = yield this.payment.create({
                    body: paymentRequest,
                    requestOptions: {
                        idempotencyKey: this.generateIdempotencyKey()
                    }
                });
                console.log('✅ Pagamento criado com sucesso:', {
                    id: result.id,
                    status: result.status,
                    status_detail: result.status_detail,
                    payment_method: result.payment_method_id,
                    payment_type: result.payment_type_id,
                    transaction_amount: result.transaction_amount,
                    transaction_details: result.transaction_details
                });
                return result;
            }
            catch (error) {
                console.error('❌ Erro ao criar pagamento:', error);
                // ✅ TRATAMENTO DE ERRO ESPECÍFICO MELHORADO
                if (error.cause) {
                    const cause = Array.isArray(error.cause) ? error.cause[0] : error.cause;
                    console.error('❌ Detalhes do erro MP:', {
                        code: cause.code,
                        description: cause.description,
                        status: error.status
                    });
                    // Tratamento específico para erro 7524 (boleto)
                    if (cause.code === 7524) {
                        console.error('❌ ERRO 7524: Este erro geralmente ocorre quando faltam informações de endereço necessárias para gerar boleto');
                        console.error('Dados do pagador:', JSON.stringify(paymentData.payer, null, 2));
                    }
                    throw new Error(`Erro MP: ${cause.code}`);
                }
                // Log mais detalhado do erro
                console.error('❌ Erro completo:', {
                    message: error.message,
                    status: error.status,
                    statusText: error.statusText,
                    response: (_b = error.response) === null || _b === void 0 ? void 0 : _b.data
                });
                throw new Error(`Erro no pagamento: ${error.message}`);
            }
        });
    }
    // ✅ CRIAR PAGAMENTO PIX OTIMIZADO
    createPixPayment(pixData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                console.log('🔄 Criando pagamento PIX via SDK...');
                const pixRequest = {
                    transaction_amount: Number(pixData.transaction_amount),
                    description: pixData.description || 'Pagamento PIX - Kimono Store',
                    payment_method_id: 'pix', // ✅ ESPECIFICAR PIX EXPLICITAMENTE
                    payer: {
                        email: pixData.payer.email,
                        first_name: pixData.payer.first_name,
                        last_name: pixData.payer.last_name,
                        identification: pixData.payer.identification,
                    },
                    external_reference: pixData.external_reference,
                    notification_url: pixData.notification_url || `${process.env.API_URL}/api/mercadopago/webhook`,
                    metadata: {
                        payment_type: 'pix',
                        integration_version: '2025.1'
                    },
                    // ✅ CONFIGURAÇÕES ESPECÍFICAS PARA PIX
                    date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
                    additional_info: {
                        items: [{
                                id: pixData.external_reference || 'pix-001',
                                title: pixData.description,
                                quantity: 1,
                                unit_price: Number(pixData.transaction_amount)
                            }]
                    }
                };
                const result = yield this.payment.create({
                    body: pixRequest,
                    requestOptions: {
                        idempotencyKey: this.generateIdempotencyKey()
                    }
                });
                console.log('✅ PIX criado com sucesso:', {
                    id: result.id,
                    status: result.status,
                    qr_code_available: !!((_b = (_a = result.point_of_interaction) === null || _a === void 0 ? void 0 : _a.transaction_data) === null || _b === void 0 ? void 0 : _b.qr_code)
                });
                return result;
            }
            catch (error) {
                console.error('❌ Erro ao criar PIX:', error);
                throw new Error(`Erro PIX: ${error.message}`);
            }
        });
    }
    // ✅ CRIAR TOKEN DE CARTÃO SEGURO
    createCardToken(cardData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log('🔄 Criando token de cartão...');
                console.log('📊 Dados do cartão (apenas estrutura):', {
                    hasCardNumber: !!cardData.card_number,
                    hasSecurityCode: !!cardData.security_code,
                    hasExpirationMonth: !!cardData.expiration_month,
                    hasExpirationYear: !!cardData.expiration_year,
                    hasCardholder: !!cardData.cardholder,
                    hasIdentification: !!((_a = cardData.cardholder) === null || _a === void 0 ? void 0 : _a.identification)
                });
                // ✅ USAR ENDPOINT DIRETO PARA TOKENS (SDK ainda não suporta)
                const response = yield fetch(`${config_1.default.mercadopago.apiUrl}/v1/card_tokens`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config_1.default.mercadopago.accessToken}`,
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': this.generateIdempotencyKey()
                    },
                    body: JSON.stringify(cardData)
                });
                console.log('📡 Status da resposta:', response.status);
                if (!response.ok) {
                    const errorBody = yield response.text();
                    console.error('❌ Erro HTTP completo:', {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorBody
                    });
                    try {
                        const errorJson = JSON.parse(errorBody);
                        if (errorJson.message) {
                            throw new Error(`MP API: ${errorJson.message}`);
                        }
                        if (errorJson.cause && errorJson.cause.length > 0) {
                            const cause = errorJson.cause[0];
                            throw new Error(`MP API: ${cause.description || cause.code}`);
                        }
                    }
                    catch (parseError) {
                        // Se não conseguir parsear, usar erro HTTP genérico
                    }
                    throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
                }
                const result = yield response.json();
                console.log('✅ Token criado com sucesso:', result.id);
                return result.id;
            }
            catch (error) {
                console.error('❌ Erro ao criar token:', error);
                // Melhor tratamento de erros
                if (error.message.includes('MP API:')) {
                    throw new Error(error.message);
                }
                throw new Error(`Erro no token: ${error.message}`);
            }
        });
    }
    // ✅ CONSULTAR PAGAMENTO USANDO SDK
    getPaymentStatus(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.payment.get({ id: paymentId });
                return result;
            }
            catch (error) {
                console.error('❌ Erro ao consultar pagamento:', error);
                throw new Error(`Erro na consulta: ${error.message}`);
            }
        });
    }
    // ✅ BUSCAR PAGAMENTOS POR REFERÊNCIA EXTERNA
    getPaymentsByExternalReference(externalReference) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.payment.search({
                    options: {
                        external_reference: externalReference,
                        sort: 'date_created',
                        criteria: 'desc',
                        range: 'date_created',
                        begin_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias atrás
                        end_date: new Date().toISOString()
                    }
                });
                return (result.results || []);
            }
            catch (error) {
                console.error('❌ Erro ao buscar pagamentos:', error);
                throw new Error(`Erro na busca: ${error.message}`);
            }
        });
    }
    // ✅ PROCESSAR WEBHOOK COM VALIDAÇÃO DE SEGURANÇA
    processWebhook(data) {
        if (!data || !data.data || !data.data.id) {
            throw new Error('Dados de webhook inválidos');
        }
        return {
            action: data.action || 'payment.updated',
            payment: {
                id: data.data.id,
                status: data.status || 'unknown'
            },
            status: this.mapMercadoPagoStatusToOrderStatus(data.status || 'pending')
        };
    }
    // ✅ OBTER INFORMAÇÕES DO PIX
    getPixInfo(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const payment = yield this.getPaymentStatus(paymentId);
                const qrCode = ((_b = (_a = payment.point_of_interaction) === null || _a === void 0 ? void 0 : _a.transaction_data) === null || _b === void 0 ? void 0 : _b.qr_code) || '';
                const qrCodeBase64 = ((_d = (_c = payment.point_of_interaction) === null || _c === void 0 ? void 0 : _c.transaction_data) === null || _d === void 0 ? void 0 : _d.qr_code_base64) || '';
                if (!qrCode && !qrCodeBase64) {
                    throw new Error('QR Code PIX não disponível');
                }
                return { qrCode, qrCodeBase64 };
            }
            catch (error) {
                console.error('❌ Erro ao obter PIX info:', error);
                throw new Error(`Erro PIX info: ${error.message}`);
            }
        });
    }
    // ✅ REEMBOLSAR PAGAMENTO
    refundPayment(paymentId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const refundData = {};
                if (amount) {
                    refundData.amount = Number(amount);
                }
                // ✅ USAR ENDPOINT DIRETO PARA REEMBOLSOS
                const result = yield fetch(`${config_1.default.mercadopago.apiUrl}/v1/payments/${paymentId}/refunds`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config_1.default.mercadopago.accessToken}`,
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': this.generateIdempotencyKey()
                    },
                    body: JSON.stringify(refundData)
                });
                if (!result.ok) {
                    throw new Error(`Erro HTTP: ${result.status}`);
                }
                return yield result.json();
            }
            catch (error) {
                console.error('❌ Erro ao reembolsar:', error);
                throw new Error(`Erro reembolso: ${error.message}`);
            }
        });
    }
    // ✅ CRIAR PREFERÊNCIA DE PAGAMENTO (CHECKOUT PRO)
    createPreference(preferenceData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // ✅ AJUSTAR DADOS DA PREFERÊNCIA PARA COMPATIBILIDADE
                const preferenceRequest = {
                    items: preferenceData.items.map(item => ({
                        id: item.id || 'default-item',
                        title: item.title,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        currency_id: item.currency_id || 'BRL'
                    })),
                    payer: preferenceData.payer,
                    payment_methods: preferenceData.payment_methods,
                    back_urls: preferenceData.back_urls,
                    auto_return: preferenceData.auto_return,
                    external_reference: preferenceData.external_reference,
                    notification_url: preferenceData.notification_url,
                    metadata: Object.assign(Object.assign({}, preferenceData.metadata), { integration_version: '2025.1' })
                };
                const result = yield this.preference.create({
                    body: preferenceRequest
                });
                return result;
            }
            catch (error) {
                console.error('❌ Erro ao criar preferência:', error);
                throw new Error(`Erro preferência: ${error.message}`);
            }
        });
    }
    // ✅ MÉTODOS COMPATIBILIDADE (REMOVIDOS NA MIGRAÇÃO)
    getPaymentMethods() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${config_1.default.mercadopago.apiUrl}/v1/payment_methods`, {
                    headers: {
                        'Authorization': `Bearer ${config_1.default.mercadopago.accessToken}`
                    }
                });
                return yield response.json();
            }
            catch (error) {
                console.error('❌ Erro ao obter métodos de pagamento:', error);
                throw new Error(`Erro métodos pagamento: ${error.message}`);
            }
        });
    }
    cancelPayment(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield fetch(`${config_1.default.mercadopago.apiUrl}/v1/payments/${paymentId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${config_1.default.mercadopago.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status: 'cancelled' })
                });
                return yield result.json();
            }
            catch (error) {
                console.error('❌ Erro ao cancelar pagamento:', error);
                throw new Error(`Erro cancelamento: ${error.message}`);
            }
        });
    }
}
// ✅ EXPORTAR INSTÂNCIA ÚNICA (SINGLETON)
exports.default = new MercadoPagoService();
