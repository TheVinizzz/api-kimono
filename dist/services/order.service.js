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
exports.orderService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const correios_service_1 = require("./correios.service");
const email_service_1 = __importDefault(require("./email.service"));
class OrderService {
    // Criar pedido para usuário autenticado
    createOrder(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📦 Criando pedido para usuário autenticado:', {
                    userId: orderData.userId,
                    email: orderData.email,
                    total: orderData.total,
                    paymentMethod: orderData.paymentMethod,
                    paymentStatus: orderData.paymentStatus
                });
                // ✅ DEFINIR STATUS DO PEDIDO BASEADO NO STATUS DO PAGAMENTO
                let orderStatus = 'PENDING';
                if (orderData.paymentStatus === 'PAID') {
                    orderStatus = 'PAID';
                }
                else if (orderData.paymentStatus === 'PENDING') {
                    orderStatus = 'PENDING';
                }
                const order = yield prisma_1.default.order.create({
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
                                productId: item.productId || item.id,
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
            }
            catch (error) {
                console.error('❌ Erro ao criar pedido:', error);
                throw new Error('Erro ao criar pedido no banco de dados');
            }
        });
    }
    // Criar pedido para usuário convidado
    createGuestOrder(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('📦 Criando pedido para usuário convidado:', {
                    email: orderData.email,
                    total: orderData.total,
                    paymentMethod: orderData.paymentMethod,
                    paymentStatus: orderData.paymentStatus
                });
                // ✅ DEFINIR STATUS DO PEDIDO BASEADO NO STATUS DO PAGAMENTO
                let orderStatus = 'PENDING';
                if (orderData.paymentStatus === 'PAID') {
                    orderStatus = 'PAID';
                }
                else if (orderData.paymentStatus === 'PENDING') {
                    orderStatus = 'PENDING';
                }
                const order = yield prisma_1.default.order.create({
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
                                productId: item.productId || item.id,
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
            }
            catch (error) {
                console.error('❌ Erro ao criar pedido guest:', error);
                console.error('📋 Dados do pedido que causaram erro:', JSON.stringify(orderData, null, 2));
                throw new Error(`Erro ao criar pedido guest no banco de dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
            }
        });
    }
    // Buscar pedido por ID
    getOrderById(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield prisma_1.default.order.findUnique({
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
            }
            catch (error) {
                console.error('❌ Erro ao buscar pedido:', error);
                throw new Error('Erro ao buscar pedido no banco de dados');
            }
        });
    }
    // Buscar pedido por Payment ID
    getOrderByPaymentId(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield prisma_1.default.order.findFirst({
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
            }
            catch (error) {
                console.error('❌ Erro ao buscar pedido por payment ID:', error);
                throw new Error('Erro ao buscar pedido no banco de dados');
            }
        });
    }
    // Atualizar status do pedido
    updateOrderStatus(orderId, status, paymentStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔄 Atualizando status do pedido:', {
                    orderId,
                    status,
                    paymentStatus
                });
                const updateData = { status };
                if (paymentStatus) {
                    updateData.paymentStatus = paymentStatus;
                }
                const order = yield prisma_1.default.order.update({
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
            }
            catch (error) {
                console.error('❌ Erro ao atualizar status do pedido:', error);
                throw new Error('Erro ao atualizar pedido no banco de dados');
            }
        });
    }
    // Atualizar status do pagamento
    updatePaymentStatus(paymentId, paymentStatus, orderStatus) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('💳 Atualizando status do pagamento:', {
                    paymentId,
                    paymentStatus,
                    orderStatus
                });
                const updateData = { paymentStatus };
                if (orderStatus) {
                    updateData.status = orderStatus;
                }
                const order = yield prisma_1.default.order.updateMany({
                    where: { paymentId },
                    data: updateData
                });
                if (order.count > 0) {
                    // Buscar o pedido atualizado
                    const updatedOrder = yield this.getOrderByPaymentId(paymentId);
                    console.log('✅ Status do pagamento atualizado:', {
                        paymentId,
                        newPaymentStatus: paymentStatus,
                        orderStatus: updatedOrder === null || updatedOrder === void 0 ? void 0 : updatedOrder.status
                    });
                    return updatedOrder;
                }
                return null;
            }
            catch (error) {
                console.error('❌ Erro ao atualizar status do pagamento:', error);
                throw new Error('Erro ao atualizar status do pagamento');
            }
        });
    }
    // Listar pedidos do usuário
    getUserOrders(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, limit = 10, offset = 0) {
            try {
                const orders = yield prisma_1.default.order.findMany({
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
            }
            catch (error) {
                console.error('❌ Erro ao listar pedidos do usuário:', error);
                throw new Error('Erro ao buscar pedidos do usuário');
            }
        });
    }
    // Buscar pedidos por email (para guests)
    getOrdersByEmail(email_1) {
        return __awaiter(this, arguments, void 0, function* (email, limit = 10, offset = 0) {
            try {
                const orders = yield prisma_1.default.order.findMany({
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
            }
            catch (error) {
                console.error('❌ Erro ao buscar pedidos por email:', error);
                throw new Error('Erro ao buscar pedidos por email');
            }
        });
    }
    // Gerar código de rastreio dos Correios para um pedido pago
    gerarCodigoRastreio(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log(`📮 Gerando código de rastreio para pedido ${orderId}...`);
                // Buscar pedido completo com itens
                const order = yield prisma_1.default.order.findUnique({
                    where: { id: orderId },
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                });
                if (!order) {
                    console.error('❌ Pedido não encontrado:', orderId);
                    return null;
                }
                // Verificar se pedido está pago
                if (order.status !== 'PAID' && order.paymentStatus !== 'PAID') {
                    console.log('⚠️ Pedido ainda não foi pago, aguardando confirmação de pagamento');
                    return null;
                }
                // Verificar se já possui código de rastreio
                if (order.trackingNumber && order.trackingNumber !== 'Não disponível') {
                    console.log('✅ Pedido já possui código de rastreio:', order.trackingNumber);
                    return order.trackingNumber;
                }
                // Validar configuração dos Correios
                if (!correios_service_1.correiosService.validateConfig()) {
                    console.error('❌ Configuração dos Correios incompleta');
                    return null;
                }
                // Extrair dados do endereço com tratamento robusto
                let logradouro = '';
                let numero = '';
                let complemento = '';
                let bairro = '';
                let cidade = '';
                let uf = '';
                let cep = '';
                // Tentar extrair do formato padrão primeiro
                try {
                    if (order.shippingAddress) {
                        const enderecoPartes = order.shippingAddress.split(', ');
                        if (enderecoPartes.length >= 4) {
                            // Formato padrão: "Rua X, 123, Bairro, Cidade - UF, CEP"
                            const [logradouroNumero, bairroParte, cidadeUFParte, cepParte] = enderecoPartes;
                            // Extrair logradouro e número
                            const logradouroMatch = logradouroNumero.match(/(.*?)(?:\s*,\s*(\d+.*)|$)/);
                            if (logradouroMatch) {
                                logradouro = logradouroMatch[1] || '';
                                numero = logradouroMatch[2] || '';
                            }
                            bairro = bairroParte || '';
                            // Extrair cidade e UF
                            const cidadeUFMatch = cidadeUFParte ? cidadeUFParte.match(/(.*?)\s*-\s*([A-Z]{2})/) : null;
                            if (cidadeUFMatch) {
                                cidade = cidadeUFMatch[1] || '';
                                uf = cidadeUFMatch[2] || '';
                            }
                            else {
                                cidade = cidadeUFParte || '';
                            }
                            // Limpar CEP
                            cep = cepParte ? cepParte.replace(/\D/g, '') : '';
                        }
                    }
                }
                catch (parseError) {
                    console.error('⚠️ Erro ao fazer parse do endereço:', parseError);
                }
                // Verificar se temos os campos mínimos necessários
                if (!logradouro || !numero || !bairro || !cidade || !uf || !cep) {
                    console.log('⚠️ Endereço incompleto, tentando extrair de campos individuais...');
                    // Tentar usar campos individuais se disponíveis (se existirem no futuro)
                    // Nota: Atualmente o modelo Order não possui esses campos separados
                    // Poderia ser implementado no futuro para melhorar a robustez
                    // Como fallback, usar endereço de entrega completo se disponível
                    if (order.shippingAddress) {
                        console.log('⚠️ Usando endereço completo como fallback');
                        logradouro = logradouro || 'Endereço não especificado';
                        numero = numero || 'S/N';
                        bairro = bairro || 'Centro';
                        cidade = cidade || 'Cidade não especificada';
                        uf = uf || 'SP'; // Fallback para SP
                        cep = cep || '00000000'; // Fallback inválido, provavelmente falhará
                    }
                }
                // Validar dados mínimos para envio
                if (!logradouro || !cidade || !uf || !cep || cep.length !== 8) {
                    console.error('❌ Dados de endereço insuficientes para gerar etiqueta:', {
                        logradouro: !!logradouro,
                        cidade: !!cidade,
                        uf: !!uf,
                        cep: cep,
                        cepValido: cep.length === 8
                    });
                    return null;
                }
                // Calcular peso total dos itens (estimativa de 400g por item como padrão para kimono)
                const pesoTotal = ((_a = order.items) === null || _a === void 0 ? void 0 : _a.reduce((total, item) => {
                    var _a;
                    // Usar peso do produto se disponível, senão usar padrão
                    const pesoProduto = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.weightGrams) || 400;
                    return total + (item.quantity * pesoProduto);
                }, 0)) || 400; // Peso padrão se não houver itens
                // Preparar dados para prepostagem
                const dadosPrepostagem = {
                    orderId: order.id,
                    destinatario: {
                        nome: order.customerName || 'Cliente',
                        documento: order.customerDocument || '',
                        telefone: order.customerPhone ? order.customerPhone.replace(/\D/g, '') : undefined,
                        email: order.customerEmail || undefined,
                        endereco: {
                            logradouro: logradouro,
                            numero: numero || 'S/N',
                            complemento: complemento || '',
                            bairro: bairro || 'Centro', // Usar "Centro" como fallback
                            cidade: cidade,
                            uf: uf,
                            cep: cep
                        }
                    },
                    servico: '03298', // PAC como padrão (mais econômico)
                    peso: pesoTotal,
                    valor: Number(order.total),
                    observacao: `Pedido #${order.id} - Kimono Store`
                };
                // Criar prepostagem nos Correios com retry
                let resultado;
                let tentativas = 0;
                const maxTentativas = 3;
                while (tentativas < maxTentativas) {
                    tentativas++;
                    try {
                        resultado = yield correios_service_1.correiosService.criarPrepostagemPedido(dadosPrepostagem);
                        if (resultado && !resultado.erro) {
                            break; // Sucesso, sair do loop
                        }
                        else {
                            console.error(`❌ Tentativa ${tentativas}/${maxTentativas} falhou:`, (resultado === null || resultado === void 0 ? void 0 : resultado.mensagem) || 'Erro desconhecido');
                            if (tentativas < maxTentativas) {
                                // Aguardar antes de tentar novamente (backoff exponencial)
                                const tempoEspera = Math.pow(2, tentativas) * 1000; // 2s, 4s, 8s...
                                console.log(`⏳ Aguardando ${tempoEspera / 1000}s antes da próxima tentativa...`);
                                yield new Promise(resolve => setTimeout(resolve, tempoEspera));
                            }
                        }
                    }
                    catch (retryError) {
                        console.error(`❌ Erro na tentativa ${tentativas}/${maxTentativas}:`, retryError);
                        if (tentativas < maxTentativas) {
                            const tempoEspera = Math.pow(2, tentativas) * 1000;
                            console.log(`⏳ Aguardando ${tempoEspera / 1000}s antes da próxima tentativa...`);
                            yield new Promise(resolve => setTimeout(resolve, tempoEspera));
                        }
                    }
                }
                if (!resultado || resultado.erro || !resultado.codigoObjeto) {
                    console.error('❌ Todas as tentativas falharam ao criar prepostagem:', (resultado === null || resultado === void 0 ? void 0 : resultado.mensagem) || 'Erro desconhecido');
                    return null;
                }
                // Atualizar pedido com código de rastreio
                yield prisma_1.default.order.update({
                    where: { id: orderId },
                    data: {
                        trackingNumber: resultado.codigoObjeto,
                        shippingCarrier: 'Correios',
                        status: 'PROCESSING' // Mover para processamento
                    }
                });
                console.log('✅ Código de rastreio gerado com sucesso:', resultado.codigoObjeto);
                // Enviar email de notificação com o código de rastreio
                try {
                    if (order.customerEmail) {
                        // Calcular estimativa de entrega (7 dias úteis a partir de hoje)
                        const dataEstimada = new Date();
                        dataEstimada.setDate(dataEstimada.getDate() + 7); // +7 dias
                        const estimatedDelivery = dataEstimada.toLocaleDateString('pt-BR');
                        yield email_service_1.default.sendTrackingCodeNotification({
                            orderId: order.id,
                            customerName: order.customerName || 'Cliente',
                            customerEmail: order.customerEmail,
                            trackingNumber: resultado.codigoObjeto,
                            shippingCarrier: 'Correios',
                            estimatedDelivery: estimatedDelivery
                        });
                        console.log(`📧 Email com código de rastreio enviado para ${order.customerEmail}`);
                    }
                }
                catch (emailError) {
                    // Não falhar o processo por causa do email
                    console.error('⚠️ Erro ao enviar email com código de rastreio:', emailError);
                }
                return resultado.codigoObjeto;
            }
            catch (error) {
                console.error('❌ Erro ao gerar código de rastreio:', error);
                return null;
            }
        });
    }
    // Processar pedidos pagos sem código de rastreio
    processarPedidosPagos() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔄 Processando pedidos pagos sem código de rastreio...');
                // Buscar pedidos pagos sem código de rastreio
                const pedidosSemRastreio = yield prisma_1.default.order.findMany({
                    where: {
                        OR: [
                            { status: 'PAID' },
                            { paymentStatus: 'PAID' }
                        ],
                        AND: [
                            {
                                OR: [
                                    { trackingNumber: null },
                                    { trackingNumber: '' },
                                    { trackingNumber: 'Não disponível' },
                                    { trackingNumber: 'Ainda não disponível' }
                                ]
                            }
                        ]
                    },
                    take: 10 // Processar máximo 10 por vez
                });
                console.log(`📊 Encontrados ${pedidosSemRastreio.length} pedidos para processar`);
                for (const pedido of pedidosSemRastreio) {
                    yield this.gerarCodigoRastreio(pedido.id);
                    // Aguarda 2 segundos entre cada chamada para não sobrecarregar a API
                    yield new Promise(resolve => setTimeout(resolve, 2000));
                }
                console.log('✅ Processamento de pedidos pagos concluído');
            }
            catch (error) {
                console.error('❌ Erro ao processar pedidos pagos:', error);
            }
        });
    }
    // Contar pedidos pagos aguardando código de rastreio
    contarPedidosPagosAguardandoRastreio() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const count = yield prisma_1.default.order.count({
                    where: {
                        OR: [
                            { status: 'PAID' },
                            { paymentStatus: 'PAID' }
                        ],
                        AND: [
                            {
                                OR: [
                                    { trackingNumber: null },
                                    { trackingNumber: '' },
                                    { trackingNumber: 'Não disponível' },
                                    { trackingNumber: 'Ainda não disponível' }
                                ]
                            }
                        ]
                    }
                });
                return count;
            }
            catch (error) {
                console.error('❌ Erro ao contar pedidos pagos sem código de rastreio:', error);
                return 0;
            }
        });
    }
}
// Exportar uma instância única do serviço
exports.orderService = new OrderService();
exports.default = exports.orderService;
