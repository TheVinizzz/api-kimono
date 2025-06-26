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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentBlingService = void 0;
/**
 * Serviço para integração de pagamentos com Bling
 * Combina gateway de pagamento (Asaas) com ERP (Bling)
 *
 * ESTRATÉGIA RECOMENDADA:
 * 1. Gateway de Pagamento (Asaas/PagSeguro/Stripe) → Processa pagamento
 * 2. Bling ERP → Registra movimentação financeira e controla estoque
 * 3. Sincronização automática entre os sistemas
 */
class PaymentBlingService {
    constructor() {
        // this.blingService = new BlingService();
        // this.asaasService = new AsaasService();
    }
    /**
     * Processa pagamento completo: Gateway + Bling
     */
    processPayment(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔄 Processando pagamento para pedido ${orderData.orderId}`);
                // 1. Criar cobrança no gateway de pagamento (Asaas)
                const payment = yield this.createPaymentCharge(orderData);
                // 2. Criar pedido no Bling
                const blingOrder = yield this.createBlingOrder(orderData, payment);
                // 3. Criar conta a receber no Bling
                const blingAccount = yield this.createBlingReceivableAccount(orderData, payment);
                return {
                    success: true,
                    payment: {
                        id: payment.id,
                        status: payment.status,
                        pixQrCode: payment.pixQrCode,
                        boletoUrl: payment.boletoUrl,
                        invoiceUrl: payment.invoiceUrl
                    },
                    bling: {
                        orderId: blingOrder.data.id,
                        orderNumber: blingOrder.data.numero,
                        accountId: blingAccount.data.id
                    }
                };
            }
            catch (error) {
                console.error('❌ Erro no processamento de pagamento:', error);
                throw error;
            }
        });
    }
    /**
     * Criar cobrança no gateway de pagamento
     */
    createPaymentCharge(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            const paymentData = Object.assign(Object.assign({ customer: orderData.customerId, billingType: orderData.paymentMethod, value: orderData.amount, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), description: `Pedido #${orderData.orderId}`, externalReference: orderData.orderId.toString() }, (orderData.paymentMethod === 'PIX' && {
                pixAddressKey: process.env.ASAAS_PIX_KEY
            })), (orderData.paymentMethod === 'CREDIT_CARD' && {
                creditCard: {
                // Dados do cartão serão passados pelo frontend
                }
            }));
            return yield this.asaasService.createPayment(paymentData);
        });
    }
    /**
     * Criar pedido no Bling
     */
    createBlingOrder(orderData, payment) {
        return __awaiter(this, void 0, void 0, function* () {
            // Buscar dados do cliente
            const customer = yield this.getCustomerData(orderData.customerId);
            // Mapear itens do pedido
            const items = yield Promise.all(orderData.items.map((item) => __awaiter(this, void 0, void 0, function* () {
                const product = yield this.getProductData(item.productId);
                return {
                    produto: {
                        id: product.blingId, // ID do produto no Bling
                        codigo: product.code,
                        nome: product.name
                    },
                    quantidade: item.quantity,
                    valor: item.price
                };
            })));
            const blingOrderData = {
                numero: orderData.orderId.toString(),
                data: new Date().toISOString().split('T')[0],
                situacao: 'em_aberto', // Aguardando pagamento
                cliente: {
                    nome: customer.name,
                    email: customer.email,
                    documento: customer.document,
                    telefone: customer.phone,
                    endereco: {
                        endereco: customer.address.street,
                        numero: customer.address.number,
                        bairro: customer.address.neighborhood,
                        cep: customer.address.zipcode,
                        municipio: customer.address.city,
                        uf: customer.address.state
                    }
                },
                itens: items,
                parcelas: [{
                        dataVencimento: payment.dueDate,
                        valor: orderData.amount,
                        formaPagamento: {
                            id: this.mapPaymentMethodToBling(orderData.paymentMethod)
                        }
                    }],
                observacoes: `Pagamento via ${orderData.paymentMethod} - ID: ${payment.id}`
            };
            return yield this.blingService.createOrder(blingOrderData);
        });
    }
    /**
     * Criar conta a receber no Bling
     */
    createBlingReceivableAccount(orderData, payment) {
        return __awaiter(this, void 0, void 0, function* () {
            const accountData = {
                descricao: `Venda #${orderData.orderId}`,
                valor: orderData.amount,
                dataVencimento: payment.dueDate,
                situacao: 'em_aberto',
                formaPagamento: {
                    id: this.mapPaymentMethodToBling(orderData.paymentMethod)
                },
                categoria: {
                    id: 1 // Categoria "Vendas" (configurar no Bling)
                },
                contato: {
                    id: orderData.customerId // Assumindo que o ID é o mesmo
                },
                observacoes: `Referente ao pedido #${orderData.orderId} - Gateway: ${payment.id}`
            };
            // Usar endpoint de contas a receber do Bling
            return yield this.blingService.makeRequest({
                method: 'POST',
                url: '/Api/v3/contas/receber',
                data: accountData
            });
        });
    }
    /**
     * Confirmar pagamento (webhook do gateway)
     */
    confirmPayment(paymentId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔄 Confirmando pagamento ${paymentId} - Status: ${status}`);
                // 1. Buscar pedido relacionado
                const payment = yield this.asaasService.getPayment(paymentId);
                const orderId = payment.externalReference;
                if (status === 'RECEIVED' || status === 'CONFIRMED') {
                    // 2. Atualizar status do pedido no Bling
                    yield this.updateBlingOrderStatus(orderId, 'em_andamento');
                    // 3. Baixar conta a receber no Bling
                    yield this.receiveBlingAccount(orderId, payment);
                    // 4. Atualizar estoque (se configurado)
                    if (process.env.AUTO_UPDATE_STOCK === 'true') {
                        yield this.updateStock(orderId);
                    }
                    console.log(`✅ Pagamento ${paymentId} confirmado e registrado no Bling`);
                }
                return { success: true, orderId, status };
            }
            catch (error) {
                console.error('❌ Erro ao confirmar pagamento:', error);
                throw error;
            }
        });
    }
    /**
     * Atualizar status do pedido no Bling
     */
    updateBlingOrderStatus(orderId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            // Buscar pedido no Bling pelo número
            const orders = yield this.blingService.getOrders(1, 1);
            const blingOrder = orders.data.find((order) => order.numero === orderId);
            if (blingOrder) {
                // Usar endpoint PATCH para atualizar situação
                yield this.blingService.makeRequest({
                    method: 'PATCH',
                    url: `/Api/v3/pedidos/vendas/${blingOrder.id}/situacoes`,
                    data: { situacao: status }
                });
            }
        });
    }
    /**
     * Baixar conta a receber no Bling
     */
    receiveBlingAccount(orderId, payment) {
        return __awaiter(this, void 0, void 0, function* () {
            // Buscar conta a receber relacionada ao pedido
            const accounts = yield this.blingService.makeRequest({
                method: 'GET',
                url: '/Api/v3/contas/receber',
                params: { filtro: `pedido:${orderId}` }
            });
            if (accounts.data && accounts.data.length > 0) {
                const account = accounts.data[0];
                // Baixar a conta (marcar como paga)
                yield this.blingService.makeRequest({
                    method: 'POST',
                    url: `/Api/v3/contas/receber/${account.id}/baixar`,
                    data: {
                        valor: payment.value,
                        data: new Date().toISOString().split('T')[0],
                        formaPagamento: {
                            id: this.mapPaymentMethodToBling(payment.billingType)
                        },
                        observacoes: `Pagamento confirmado - Gateway ID: ${payment.id}`
                    }
                });
            }
        });
    }
    /**
     * Mapear método de pagamento para ID do Bling
     */
    mapPaymentMethodToBling(method) {
        const mapping = {
            'PIX': 1,
            'BOLETO': 2,
            'CREDIT_CARD': 3,
            'DEBIT_CARD': 4,
            'BANK_TRANSFER': 5
        };
        return mapping[method] || 1;
    }
    /**
     * Buscar dados do cliente
     */
    getCustomerData(customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar busca no seu banco de dados
            // Retorna dados formatados do cliente
            return {
                name: 'Nome do Cliente',
                email: 'cliente@email.com',
                document: '12345678901',
                phone: '11999999999',
                address: {
                    street: 'Rua Exemplo',
                    number: '123',
                    neighborhood: 'Centro',
                    zipcode: '01234567',
                    city: 'São Paulo',
                    state: 'SP'
                }
            };
        });
    }
    /**
     * Buscar dados do produto
     */
    getProductData(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar busca no seu banco de dados
            // Retorna dados do produto incluindo ID no Bling
            return {
                name: 'Nome do Produto',
                code: 'PROD123',
                blingId: 456 // ID do produto no Bling
            };
        });
    }
    /**
     * Atualizar estoque após venda
     */
    updateStock(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Buscar itens do pedido
                const order = yield this.getOrderData(orderId);
                for (const item of order.items) {
                    // Baixar estoque no Bling
                    yield this.blingService.updateStock({
                        produto: { id: item.blingProductId },
                        operacao: 'S', // Saída
                        quantidade: item.quantity,
                        observacoes: `Venda #${orderId}`
                    });
                }
                console.log(`✅ Estoque atualizado para pedido ${orderId}`);
            }
            catch (error) {
                console.error('❌ Erro ao atualizar estoque:', error);
            }
        });
    }
    /**
     * Buscar dados do pedido
     */
    getOrderData(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implementar busca no seu banco de dados
            return {
                items: [
                    { blingProductId: 456, quantity: 2 }
                ]
            };
        });
    }
}
exports.PaymentBlingService = PaymentBlingService;
