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
exports.trackingService = exports.TrackingService = void 0;
const client_1 = require("@prisma/client");
const correios_service_1 = require("./correios.service");
const websocket_service_1 = require("./websocket.service");
const prisma = new client_1.PrismaClient();
const correiosService = new correios_service_1.CorreiosService();
class TrackingService {
    constructor() {
        this.trackingJob = null;
        this.isRunning = false;
        this.intervalId = null;
    }
    static getInstance() {
        if (!TrackingService.instance) {
            TrackingService.instance = new TrackingService();
        }
        return TrackingService.instance;
    }
    /**
     * Inicia o serviço automático de rastreamento
     */
    startAutomaticTracking() {
        return __awaiter(this, arguments, void 0, function* (intervalMinutes = 60) {
            if (this.isRunning) {
                console.log('⚠️ Serviço de rastreamento já está em execução');
                return;
            }
            console.log(`🚀 Iniciando serviço automático de rastreamento (intervalo: ${intervalMinutes} minutos)`);
            this.isRunning = true;
            this.trackingJob = {
                id: `tracking-job-${Date.now()}`,
                status: 'running',
                lastRun: undefined,
                nextRun: new Date(Date.now() + intervalMinutes * 60 * 1000),
                ordersProcessed: 0,
                errors: []
            };
            // Executar primeira verificação imediatamente
            yield this.processTrackingUpdates();
            // Configurar execução periódica
            this.intervalId = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                yield this.processTrackingUpdates();
            }), intervalMinutes * 60 * 1000);
            console.log('✅ Serviço automático de rastreamento iniciado com sucesso');
        });
    }
    /**
     * Para o serviço automático de rastreamento
     */
    stopAutomaticTracking() {
        if (!this.isRunning) {
            console.log('⚠️ Serviço de rastreamento não está em execução');
            return;
        }
        console.log('🛑 Parando serviço automático de rastreamento...');
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.trackingJob) {
            this.trackingJob.status = 'stopped';
        }
        console.log('✅ Serviço automático de rastreamento parado');
    }
    /**
     * Processa atualizações de rastreamento para todos os pedidos pendentes
     */
    processTrackingUpdates() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.trackingJob) {
                console.error('❌ Job de rastreamento não está configurado');
                return;
            }
            try {
                console.log('🔄 Processando atualizações de rastreamento...');
                this.trackingJob.lastRun = new Date();
                this.trackingJob.ordersProcessed = 0;
                this.trackingJob.errors = [];
                // Buscar pedidos que têm código de rastreamento mas ainda não foram entregues
                const pedidosPendentes = yield prisma.order.findMany({
                    where: {
                        trackingNumber: {
                            not: null
                        },
                        NOT: {
                            trackingNumber: ''
                        },
                        status: {
                            notIn: ['DELIVERED', 'CANCELED']
                        }
                    },
                    select: {
                        id: true,
                        trackingNumber: true,
                        status: true,
                        customerEmail: true,
                        customerName: true
                    }
                });
                console.log(`📦 Encontrados ${pedidosPendentes.length} pedidos para verificar`);
                if (pedidosPendentes.length === 0) {
                    console.log('✅ Nenhum pedido pendente para rastreamento');
                    return;
                }
                // Extrair códigos de rastreamento únicos
                const codigosRastreio = pedidosPendentes
                    .map(p => p.trackingNumber)
                    .filter((codigo, index, array) => array.indexOf(codigo) === index);
                // Rastrear todos os códigos de uma vez
                const resultadosRastreamento = yield correiosService.rastrearMultiplosObjetos(codigosRastreio);
                // Processar cada pedido
                for (const pedido of pedidosPendentes) {
                    try {
                        const rastreamento = resultadosRastreamento[pedido.trackingNumber];
                        if (rastreamento && rastreamento.eventos && rastreamento.eventos.length > 0) {
                            const update = yield this.processOrderTracking(pedido.id, pedido.trackingNumber, rastreamento.eventos);
                            if (update.hasNewEvents) {
                                // Enviar notificação via WebSocket
                                websocket_service_1.webSocketService.notifyOrderUpdated({
                                    id: pedido.id,
                                    status: update.status,
                                    trackingUpdate: update
                                });
                                console.log(`📨 Atualização enviada para pedido ${pedido.id}: ${update.status}`);
                            }
                        }
                        this.trackingJob.ordersProcessed++;
                    }
                    catch (error) {
                        const errorMsg = `Erro ao processar pedido ${pedido.id}: ${error.message}`;
                        console.error(`❌ ${errorMsg}`);
                        this.trackingJob.errors.push(errorMsg);
                    }
                }
                this.trackingJob.nextRun = new Date(Date.now() + 60 * 60 * 1000); // Próxima execução em 1 hora
                console.log(`✅ Processamento concluído: ${this.trackingJob.ordersProcessed} pedidos processados, ${this.trackingJob.errors.length} erros`);
            }
            catch (error) {
                console.error('❌ Erro no processamento de rastreamento:', error.message);
                this.trackingJob.status = 'error';
                this.trackingJob.errors.push(`Erro geral: ${error.message}`);
            }
        });
    }
    /**
     * Processa o rastreamento de um pedido específico
     */
    processOrderTracking(orderId, trackingNumber, eventos) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Buscar último evento registrado no banco
                const ultimoEvento = yield prisma.shipmentUpdate.findFirst({
                    where: { orderId },
                    orderBy: { timestamp: 'desc' }
                });
                // Ordenar eventos por data/hora (mais recente primeiro)
                const eventosOrdenados = eventos.sort((a, b) => {
                    const dataHoraA = new Date(`${a.data} ${a.hora}`);
                    const dataHoraB = new Date(`${b.data} ${b.hora}`);
                    return dataHoraB.getTime() - dataHoraA.getTime();
                });
                const eventoMaisRecente = eventosOrdenados[0];
                const dataHoraEvento = new Date(`${eventoMaisRecente.data} ${eventoMaisRecente.hora}`);
                let hasNewEvents = false;
                let isDelivered = false;
                // Verificar se há novos eventos
                if (!ultimoEvento || dataHoraEvento > ultimoEvento.timestamp) {
                    hasNewEvents = true;
                    // Salvar novos eventos no banco
                    for (const evento of eventosOrdenados) {
                        const dataHora = new Date(`${evento.data} ${evento.hora}`);
                        // Verificar se este evento já existe
                        const eventoExiste = yield prisma.shipmentUpdate.findFirst({
                            where: {
                                orderId,
                                timestamp: dataHora,
                                description: evento.descricao
                            }
                        });
                        if (!eventoExiste) {
                            yield prisma.shipmentUpdate.create({
                                data: {
                                    orderId,
                                    status: evento.codigo,
                                    location: evento.local,
                                    description: evento.descricao,
                                    timestamp: dataHora
                                }
                            });
                        }
                    }
                    // Determinar se o pedido foi entregue
                    isDelivered = this.isDeliveredStatus(eventoMaisRecente.codigo, eventoMaisRecente.descricao);
                    // Atualizar status do pedido se necessário
                    const novoStatus = this.mapCorreiosStatusToOrderStatus(eventoMaisRecente.codigo, eventoMaisRecente.descricao);
                    yield prisma.order.update({
                        where: { id: orderId },
                        data: {
                            status: novoStatus,
                            currentLocation: eventoMaisRecente.local,
                            updatedAt: new Date()
                        }
                    });
                    console.log(`📋 Pedido ${orderId} atualizado: ${novoStatus} - ${eventoMaisRecente.descricao}`);
                }
                return {
                    orderId,
                    trackingNumber,
                    status: eventoMaisRecente.descricao,
                    location: eventoMaisRecente.local,
                    description: eventoMaisRecente.descricao,
                    timestamp: dataHoraEvento,
                    isDelivered,
                    hasNewEvents
                };
            }
            catch (error) {
                console.error(`❌ Erro ao processar rastreamento do pedido ${orderId}:`, error.message);
                throw error;
            }
        });
    }
    /**
     * Mapeia códigos dos Correios para status do pedido
     */
    mapCorreiosStatusToOrderStatus(codigo, descricao) {
        const descricaoLower = descricao.toLowerCase();
        if (descricaoLower.includes('entregue') || codigo === 'BDE' || codigo === 'BDI') {
            return 'DELIVERED';
        }
        if (descricaoLower.includes('saiu para entrega') || descricaoLower.includes('out for delivery')) {
            return 'OUT_FOR_DELIVERY';
        }
        if (descricaoLower.includes('em trânsito') || descricaoLower.includes('em transito') ||
            descricaoLower.includes('encaminhado') || codigo === 'DO' || codigo === 'RO') {
            return 'IN_TRANSIT';
        }
        if (descricaoLower.includes('postado') || descricaoLower.includes('postagem') || codigo === 'PO') {
            return 'SHIPPED';
        }
        return 'PROCESSING';
    }
    /**
     * Verifica se o status indica entrega
     */
    isDeliveredStatus(codigo, descricao) {
        const descricaoLower = descricao.toLowerCase();
        return descricaoLower.includes('entregue') || codigo === 'BDE' || codigo === 'BDI';
    }
    /**
     * Obtém o status atual do job de rastreamento
     */
    getTrackingJobStatus() {
        return this.trackingJob;
    }
    /**
     * Força a atualização de um pedido específico
     */
    forceTrackingUpdate(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pedido = yield prisma.order.findUnique({
                    where: { id: orderId },
                    select: {
                        id: true,
                        trackingNumber: true,
                        status: true
                    }
                });
                if (!pedido || !pedido.trackingNumber) {
                    throw new Error('Pedido não encontrado ou sem código de rastreamento');
                }
                console.log(`🔍 Forçando atualização do pedido ${orderId}`);
                const rastreamento = yield correiosService.rastrearObjeto(pedido.trackingNumber);
                if (rastreamento && rastreamento.eventos && rastreamento.eventos.length > 0) {
                    const update = yield this.processOrderTracking(orderId, pedido.trackingNumber, rastreamento.eventos);
                    // Enviar notificação via WebSocket
                    websocket_service_1.webSocketService.notifyOrderUpdated({
                        id: orderId,
                        status: update.status,
                        trackingUpdate: update
                    });
                    return update;
                }
                return null;
            }
            catch (error) {
                console.error(`❌ Erro ao forçar atualização do pedido ${orderId}:`, error.message);
                throw error;
            }
        });
    }
    /**
     * Obtém histórico de rastreamento de um pedido
     */
    getTrackingHistory(orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const eventos = yield prisma.shipmentUpdate.findMany({
                    where: { orderId },
                    orderBy: { timestamp: 'desc' }
                });
                return eventos.map(evento => ({
                    id: evento.id,
                    status: evento.status,
                    location: evento.location,
                    description: evento.description,
                    timestamp: evento.timestamp,
                    formattedDate: evento.timestamp.toLocaleDateString('pt-BR'),
                    formattedTime: evento.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                }));
            }
            catch (error) {
                console.error(`❌ Erro ao buscar histórico do pedido ${orderId}:`, error.message);
                throw error;
            }
        });
    }
}
exports.TrackingService = TrackingService;
exports.trackingService = TrackingService.getInstance();
