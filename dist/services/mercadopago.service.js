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
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
// Classe principal do serviço Mercado Pago
class MercadoPagoService {
    constructor() {
        this.apiUrl = config_1.default.mercadopago.apiUrl;
        this.accessToken = config_1.default.mercadopago.accessToken;
        this.publicKey = config_1.default.mercadopago.publicKey;
        // Mapeamento de status do Mercado Pago para status de pedido
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
    // Headers para requisições
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `${Date.now()}-${Math.random()}`
        };
    }
    // Mapear status do Mercado Pago para status de pedido
    mapMercadoPagoStatusToOrderStatus(mercadoPagoStatus) {
        return this.statusMapping[mercadoPagoStatus] || 'PENDING';
    }
    // Criar token de cartão
    createCardToken(cardData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(`${this.apiUrl}/v1/card_tokens`, cardData, {
                    headers: {
                        'Authorization': `Bearer ${this.publicKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                return response.data.id;
            }
            catch (error) {
                console.error('Erro ao criar token de cartão no Mercado Pago:', error);
                throw error;
            }
        });
    }
    // Criar um pagamento
    createPayment(paymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                console.log('Enviando requisição para criar pagamento no Mercado Pago:', {
                    url: `${this.apiUrl}/v1/payments`,
                    data: paymentData
                });
                const response = yield axios_1.default.post(`${this.apiUrl}/v1/payments`, paymentData, { headers: this.getHeaders() });
                console.log('Resposta completa da API Mercado Pago:', response.data);
                // Para PIX, verificar se há informações específicas
                if (paymentData.payment_method_id === 'pix') {
                    console.log('Detalhes do PIX na resposta:');
                    console.log('- point_of_interaction:', response.data.point_of_interaction);
                    console.log('- qr_code:', (_b = (_a = response.data.point_of_interaction) === null || _a === void 0 ? void 0 : _a.transaction_data) === null || _b === void 0 ? void 0 : _b.qr_code);
                    console.log('- qr_code_base64:', (_d = (_c = response.data.point_of_interaction) === null || _c === void 0 ? void 0 : _c.transaction_data) === null || _d === void 0 ? void 0 : _d.qr_code_base64);
                }
                // Para Cartão de Crédito, exibir informações específicas
                if (paymentData.payment_method_id.includes('credit')) {
                    console.log('Detalhes do pagamento com Cartão de Crédito:');
                    console.log('- status:', response.data.status);
                    console.log('- status_detail:', response.data.status_detail);
                    console.log('- card:', response.data.card);
                    console.log('- authorization_code:', response.data.authorization_code);
                }
                return response.data;
            }
            catch (error) {
                console.error('Erro ao criar pagamento no Mercado Pago:', error);
                // Log detalhado para erros de cartão de crédito
                if ((_e = error.response) === null || _e === void 0 ? void 0 : _e.data) {
                    console.error('Detalhes do erro de pagamento:');
                    console.error('- Status:', error.response.status);
                    console.error('- Mensagem:', error.response.data.message || error.message);
                    console.error('- Código:', error.response.data.error);
                    console.error('- Causa:', error.response.data.cause);
                    // Tratar mensagens de erro específicas
                    if (error.response.data.cause) {
                        error.response.data.cause.forEach((cause) => {
                            console.error(`- Erro ${cause.code}: ${cause.description}`);
                        });
                    }
                }
                throw error;
            }
        });
    }
    // Criar uma preferência de pagamento (para múltiplos métodos)
    createPreference(preferenceData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Criando preferência de pagamento no Mercado Pago:', preferenceData);
                const response = yield axios_1.default.post(`${this.apiUrl}/checkout/preferences`, preferenceData, { headers: this.getHeaders() });
                console.log('Preferência criada:', response.data);
                return response.data;
            }
            catch (error) {
                console.error('Erro ao criar preferência de pagamento no Mercado Pago:', error);
                throw error;
            }
        });
    }
    // Criar pagamento PIX
    createPixPayment(pixData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Criando pagamento PIX no Mercado Pago:', pixData);
                const response = yield axios_1.default.post(`${this.apiUrl}/v1/payments`, pixData, { headers: this.getHeaders() });
                console.log('PIX criado:', response.data);
                return response.data;
            }
            catch (error) {
                console.error('Erro ao criar pagamento PIX no Mercado Pago:', error);
                throw error;
            }
        });
    }
    // Consultar status de um pagamento
    getPaymentStatus(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.apiUrl}/v1/payments/${paymentId}`, { headers: this.getHeaders() });
                return response.data;
            }
            catch (error) {
                console.error('Erro ao consultar status do pagamento:', error);
                throw error;
            }
        });
    }
    // Buscar pagamentos por referência externa (ID do pedido)
    getPaymentsByExternalReference(externalReference) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.apiUrl}/v1/payments/search?external_reference=${externalReference}`, { headers: this.getHeaders() });
                if (response.data.results && response.data.results.length > 0) {
                    return response.data.results;
                }
                return [];
            }
            catch (error) {
                console.error('Erro ao buscar pagamentos por referência externa:', error);
                throw error;
            }
        });
    }
    // Processar webhook do Mercado Pago
    processWebhook(data) {
        try {
            console.log('Processando webhook do Mercado Pago:', data);
            // Verificar se o webhook é de pagamento
            if (data && data.type === 'payment' && data.data && data.data.id) {
                return {
                    action: data.action || 'payment.updated',
                    payment: {
                        id: data.data.id,
                        status: 'pending' // Status será atualizado pela consulta do pagamento
                    },
                    status: 'PENDING'
                };
            }
            throw new Error('Dados de webhook inválidos');
        }
        catch (error) {
            console.error('Erro ao processar webhook:', error);
            throw error;
        }
    }
    // Obter informações de PIX
    getPixInfo(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const payment = yield this.getPaymentStatus(paymentId);
                return {
                    qrCode: ((_b = (_a = payment.point_of_interaction) === null || _a === void 0 ? void 0 : _a.transaction_data) === null || _b === void 0 ? void 0 : _b.qr_code) || '',
                    qrCodeBase64: ((_d = (_c = payment.point_of_interaction) === null || _c === void 0 ? void 0 : _c.transaction_data) === null || _d === void 0 ? void 0 : _d.qr_code_base64) || ''
                };
            }
            catch (error) {
                console.error('Erro ao obter informações do PIX:', error);
                throw error;
            }
        });
    }
    // Obter métodos de pagamento disponíveis
    getPaymentMethods() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.apiUrl}/v1/payment_methods`, { headers: this.getHeaders() });
                return response.data;
            }
            catch (error) {
                console.error('Erro ao obter métodos de pagamento:', error);
                throw error;
            }
        });
    }
    // Refund de pagamento
    refundPayment(paymentId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const refundData = amount ? { amount } : {};
                const response = yield axios_1.default.post(`${this.apiUrl}/v1/payments/${paymentId}/refunds`, refundData, { headers: this.getHeaders() });
                return response.data;
            }
            catch (error) {
                console.error('Erro ao processar refund:', error);
                throw error;
            }
        });
    }
    // Cancelar pagamento
    cancelPayment(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.put(`${this.apiUrl}/v1/payments/${paymentId}`, { status: 'cancelled' }, { headers: this.getHeaders() });
                return response.data;
            }
            catch (error) {
                console.error('Erro ao cancelar pagamento:', error);
                throw error;
            }
        });
    }
}
// Exportar uma instância única do serviço
const mercadoPagoService = new MercadoPagoService();
exports.default = mercadoPagoService;
