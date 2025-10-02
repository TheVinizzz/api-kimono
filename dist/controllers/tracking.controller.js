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
exports.trackingController = exports.TrackingController = void 0;
const tracking_service_1 = require("../services/tracking.service");
const correios_service_1 = require("../services/correios.service");
class TrackingController {
    /**
     * Inicia o serviço automático de rastreamento
     */
    startAutomaticTracking(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { intervalMinutes = 60 } = req.body;
                yield tracking_service_1.trackingService.startAutomaticTracking(intervalMinutes);
                res.json({
                    success: true,
                    message: 'Serviço automático de rastreamento iniciado',
                    interval: intervalMinutes
                });
            }
            catch (error) {
                console.error('Erro ao iniciar rastreamento automático:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor',
                    message: error.message
                });
            }
        });
    }
    /**
     * Para o serviço automático de rastreamento
     */
    stopAutomaticTracking(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                tracking_service_1.trackingService.stopAutomaticTracking();
                res.json({
                    success: true,
                    message: 'Serviço automático de rastreamento parado'
                });
            }
            catch (error) {
                console.error('Erro ao parar rastreamento automático:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor',
                    message: error.message
                });
            }
        });
    }
    /**
     * Obtém o status do job de rastreamento
     */
    getTrackingJobStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const status = tracking_service_1.trackingService.getTrackingJobStatus();
                res.json({
                    success: true,
                    job: status
                });
            }
            catch (error) {
                console.error('Erro ao obter status do job:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor',
                    message: error.message
                });
            }
        });
    }
    /**
     * Força a atualização de rastreamento para um pedido específico
     */
    forceTrackingUpdate(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const orderIdNum = parseInt(orderId);
                if (!orderIdNum || orderIdNum <= 0) {
                    res.status(400).json({
                        success: false,
                        error: 'ID do pedido inválido'
                    });
                    return;
                }
                const update = yield tracking_service_1.trackingService.forceTrackingUpdate(orderIdNum);
                if (update) {
                    res.json({
                        success: true,
                        message: 'Rastreamento atualizado com sucesso',
                        update
                    });
                }
                else {
                    res.status(404).json({
                        success: false,
                        error: 'Nenhuma atualização disponível para este pedido'
                    });
                }
            }
            catch (error) {
                console.error('Erro ao forçar atualização:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor',
                    message: error.message
                });
            }
        });
    }
    /**
     * Obtém o histórico de rastreamento de um pedido
     */
    getTrackingHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { orderId } = req.params;
                const orderIdNum = parseInt(orderId);
                if (!orderIdNum || orderIdNum <= 0) {
                    res.status(400).json({
                        success: false,
                        error: 'ID do pedido inválido'
                    });
                    return;
                }
                const history = yield tracking_service_1.trackingService.getTrackingHistory(orderIdNum);
                res.json({
                    success: true,
                    orderId: orderIdNum,
                    history,
                    count: history.length
                });
            }
            catch (error) {
                console.error('Erro ao obter histórico:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor',
                    message: error.message
                });
            }
        });
    }
    /**
     * Rastreia um código específico diretamente na API dos Correios
     */
    trackCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { trackingCode } = req.params;
                if (!trackingCode || trackingCode.length < 13) {
                    res.status(400).json({
                        success: false,
                        error: 'Código de rastreamento inválido'
                    });
                    return;
                }
                const tracking = yield correios_service_1.correiosService.rastrearObjeto(trackingCode);
                if (tracking) {
                    res.json({
                        success: true,
                        trackingCode,
                        tracking
                    });
                }
                else {
                    res.status(404).json({
                        success: false,
                        error: 'Código de rastreamento não encontrado'
                    });
                }
            }
            catch (error) {
                console.error('Erro ao rastrear código:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor',
                    message: error.message
                });
            }
        });
    }
    /**
     * Processa atualizações de rastreamento manualmente
     */
    processTrackingUpdates(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield tracking_service_1.trackingService.processTrackingUpdates();
                const status = tracking_service_1.trackingService.getTrackingJobStatus();
                res.json({
                    success: true,
                    message: 'Processamento de rastreamento executado com sucesso',
                    job: status
                });
            }
            catch (error) {
                console.error('Erro ao processar atualizações:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor',
                    message: error.message
                });
            }
        });
    }
    /**
     * Obtém estatísticas de rastreamento
     */
    getTrackingStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Aqui você pode implementar estatísticas específicas
                // Por exemplo: pedidos por status, tempo médio de entrega, etc.
                res.json({
                    success: true,
                    message: 'Estatísticas de rastreamento não implementadas ainda',
                    stats: {
                    // Implementar estatísticas aqui
                    }
                });
            }
            catch (error) {
                console.error('Erro ao obter estatísticas:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erro interno do servidor',
                    message: error.message
                });
            }
        });
    }
}
exports.TrackingController = TrackingController;
exports.trackingController = new TrackingController();
