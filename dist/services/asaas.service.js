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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
// Classe principal do serviço Asaas
class AsaasService {
    constructor() {
        this.apiUrl = config_1.default.asaas.apiUrl;
        this.apiKey = config_1.default.asaas.apiKey;
        this.walletId = config_1.default.asaas.walletId;
    }
    // Headers padrão para as requisições
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'User-Agent': 'ShoppingApp',
            'access_token': this.apiKey
        };
    }
    // Criar um cliente no Asaas
    createCustomer(customerData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(`${this.apiUrl}/v3/customers`, customerData, { headers: this.getHeaders() });
                return response.data;
            }
            catch (error) {
                console.error('Erro ao criar cliente no Asaas:', error);
                throw error;
            }
        });
    }
    // Buscar cliente por e-mail
    findCustomerByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.apiUrl}/v3/customers?email=${email}`, { headers: this.getHeaders() });
                if (response.data.data && response.data.data.length > 0) {
                    return response.data.data[0];
                }
                return null;
            }
            catch (error) {
                console.error('Erro ao buscar cliente no Asaas:', error);
                throw error;
            }
        });
    }
    // Atualizar dados de um cliente
    updateCustomer(customerId, customerData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.put(`${this.apiUrl}/v3/customers/${customerId}`, customerData, { headers: this.getHeaders() });
                return response.data;
            }
            catch (error) {
                console.error('Erro ao atualizar cliente no Asaas:', error);
                throw error;
            }
        });
    }
    // Criar um pagamento
    createPayment(paymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            try {
                // Remover o walletId do objeto de dados e enviá-lo como parâmetro de consulta
                const _j = Object.assign(Object.assign({}, paymentData), { walletId: this.walletId }), { walletId } = _j, paymentDataWithoutWallet = __rest(_j, ["walletId"]);
                console.log('Enviando requisição para criar pagamento:', {
                    url: `${this.apiUrl}/v3/payments?wallet=${this.walletId}`,
                    data: paymentDataWithoutWallet
                });
                const response = yield axios_1.default.post(`${this.apiUrl}/v3/payments?wallet=${this.walletId}`, paymentDataWithoutWallet, { headers: this.getHeaders() });
                console.log('Resposta completa da API Asaas:', response.data);
                // Para PIX, verificar se há informações específicas
                if (paymentDataWithoutWallet.billingType === 'PIX') {
                    console.log('Detalhes do PIX na resposta:');
                    console.log('- pix:', response.data.pix);
                    console.log('- pixQrCode:', response.data.pixQrCode);
                    console.log('- pixCodeQrCode:', response.data.pixCodeQrCode);
                    console.log('- pixEncodedImage:', response.data.pixEncodedImage);
                    console.log('- pixCodeBase64:', response.data.pixCodeBase64);
                }
                // Para Cartão de Crédito, exibir informações específicas
                if (paymentDataWithoutWallet.billingType === 'CREDIT_CARD') {
                    console.log('Detalhes do pagamento com Cartão de Crédito:');
                    console.log('- status:', response.data.status);
                    console.log('- creditCardId:', response.data.creditCardId);
                    console.log('- creditCardBrand:', response.data.creditCardBrand);
                    console.log('- creditCardToken:', response.data.creditCardToken);
                    console.log('- lastFourDigits:', (_a = response.data.creditCard) === null || _a === void 0 ? void 0 : _a.lastFourDigits);
                    console.log('- transactionReceiptUrl:', response.data.transactionReceiptUrl);
                }
                return response.data;
            }
            catch (error) {
                console.error('Erro ao criar pagamento no Asaas:', error);
                // Log detalhado para erros de cartão de crédito
                if (paymentData.billingType === 'CREDIT_CARD' && ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data)) {
                    console.error('Detalhes do erro de pagamento com cartão:');
                    console.error('- Status:', error.response.status);
                    console.error('- Mensagem:', ((_d = (_c = error.response.data.errors) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.description) || error.message);
                    console.error('- Código:', (_f = (_e = error.response.data.errors) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.code);
                    // Tratar mensagens de erro específicas de cartão
                    const errorCode = (_h = (_g = error.response.data.errors) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.code;
                    if (errorCode) {
                        switch (errorCode) {
                            case 'invalid_credit_card':
                                console.error('Cartão inválido ou não autorizado pela operadora');
                                break;
                            case 'expired_card':
                                console.error('Cartão expirado');
                                break;
                            case 'insufficient_funds':
                                console.error('Saldo insuficiente');
                                break;
                            default:
                                console.error('Erro desconhecido no processamento do cartão');
                        }
                    }
                }
                throw error;
            }
        });
    }
    // Criar um link de pagamento
    createPaymentLink(paymentLinkData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Remover o walletId do objeto de dados e enviá-lo como parâmetro de consulta
                const _a = Object.assign(Object.assign({}, paymentLinkData), { walletId: this.walletId }), { walletId } = _a, linkDataWithoutWallet = __rest(_a, ["walletId"]);
                const response = yield axios_1.default.post(`${this.apiUrl}/v3/paymentLinks?wallet=${this.walletId}`, linkDataWithoutWallet, { headers: this.getHeaders() });
                return response.data;
            }
            catch (error) {
                console.error('Erro ao criar link de pagamento no Asaas:', error);
                throw error;
            }
        });
    }
    // Buscar dados do PIX de um pagamento
    getPixInfo(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Buscando dados do PIX para o pagamento ${paymentId}`);
                const response = yield axios_1.default.get(`${this.apiUrl}/v3/payments/${paymentId}/pixQrCode`, { headers: this.getHeaders() });
                console.log('Dados do PIX recebidos:', response.data);
                return response.data;
            }
            catch (error) {
                console.error('Erro ao buscar dados do PIX:', error);
                throw error;
            }
        });
    }
    // Consultar status de um pagamento
    getPaymentStatus(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.apiUrl}/v3/payments/${paymentId}`, { headers: this.getHeaders() });
                return response.data;
            }
            catch (error) {
                console.error('Erro ao consultar status do pagamento no Asaas:', error);
                throw error;
            }
        });
    }
    // Buscar pagamentos por referência externa (ID do pedido)
    getPaymentsByExternalReference(externalReference) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Buscando pagamentos com referência externa: ${externalReference}`);
                const response = yield axios_1.default.get(`${this.apiUrl}/v3/payments?externalReference=${externalReference}`, { headers: this.getHeaders() });
                console.log(`Encontrados ${response.data.data.length} pagamentos para a referência ${externalReference}`);
                // Retorna a lista de pagamentos encontrados
                return response.data.data || [];
            }
            catch (error) {
                console.error('Erro ao buscar pagamentos por referência externa:', error);
                throw error;
            }
        });
    }
    // Processar webhook do Asaas
    processWebhook(data) {
        // Processar notificações de pagamento do Asaas
        const event = data.event;
        const payment = data.payment;
        return {
            event,
            payment,
            status: this.mapAsaasStatusToOrderStatus(payment.status)
        };
    }
    // Mapear status do Asaas para status do pedido
    mapAsaasStatusToOrderStatus(asaasStatus) {
        switch (asaasStatus) {
            case 'CONFIRMED':
            case 'RECEIVED':
            case 'RECEIVED_IN_CASH':
                return 'PAID';
            case 'PENDING':
                return 'PENDING';
            case 'OVERDUE':
            case 'REFUNDED':
            case 'REFUND_REQUESTED':
            case 'CHARGEBACK_REQUESTED':
            case 'CHARGEBACK_DISPUTE':
            case 'AWAITING_CHARGEBACK_REVERSAL':
                return 'CANCELED';
            default:
                return 'PENDING';
        }
    }
}
exports.default = new AsaasService();
