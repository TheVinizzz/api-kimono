"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tracking_controller_1 = require("../controllers/tracking.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Tracking
 *   description: Gerenciamento de rastreamento de pedidos
 */
/**
 * @swagger
 * /api/tracking/job/start:
 *   post:
 *     summary: Inicia o serviço automático de rastreamento
 *     tags: [Tracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               intervalMinutes:
 *                 type: number
 *                 default: 60
 *                 description: Intervalo em minutos entre verificações
 *     responses:
 *       200:
 *         description: Serviço iniciado com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/job/start', auth_1.auth, tracking_controller_1.trackingController.startAutomaticTracking);
/**
 * @swagger
 * /api/tracking/job/stop:
 *   post:
 *     summary: Para o serviço automático de rastreamento
 *     tags: [Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Serviço parado com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/job/stop', auth_1.auth, tracking_controller_1.trackingController.stopAutomaticTracking);
/**
 * @swagger
 * /api/tracking/job/status:
 *   get:
 *     summary: Obtém o status do job de rastreamento
 *     tags: [Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status do job obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 job:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [running, stopped, error]
 *                     lastRun:
 *                       type: string
 *                       format: date-time
 *                     nextRun:
 *                       type: string
 *                       format: date-time
 *                     ordersProcessed:
 *                       type: number
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/job/status', auth_1.auth, tracking_controller_1.trackingController.getTrackingJobStatus);
/**
 * @swagger
 * /api/tracking/job/process:
 *   post:
 *     summary: Executa processamento manual de rastreamento
 *     tags: [Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Processamento executado com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/job/process', auth_1.auth, tracking_controller_1.trackingController.processTrackingUpdates);
/**
 * @swagger
 * /api/tracking/order/{orderId}/update:
 *   post:
 *     summary: Força atualização de rastreamento para um pedido específico
 *     tags: [Tracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do pedido
 *     responses:
 *       200:
 *         description: Rastreamento atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 update:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: number
 *                     trackingNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                     location:
 *                       type: string
 *                     description:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     isDelivered:
 *                       type: boolean
 *                     hasNewEvents:
 *                       type: boolean
 *       400:
 *         description: ID do pedido inválido
 *       404:
 *         description: Nenhuma atualização disponível
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/order/:orderId/update', auth_1.auth, tracking_controller_1.trackingController.forceTrackingUpdate);
/**
 * @swagger
 * /api/tracking/order/{orderId}/history:
 *   get:
 *     summary: Obtém histórico de rastreamento de um pedido
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do pedido
 *     responses:
 *       200:
 *         description: Histórico obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 orderId:
 *                   type: number
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       status:
 *                         type: string
 *                       location:
 *                         type: string
 *                       description:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       formattedDate:
 *                         type: string
 *                       formattedTime:
 *                         type: string
 *                 count:
 *                   type: number
 *       400:
 *         description: ID do pedido inválido
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/order/:orderId/history', tracking_controller_1.trackingController.getTrackingHistory);
/**
 * @swagger
 * /api/tracking/code/{trackingCode}:
 *   get:
 *     summary: Rastreia um código específico diretamente na API dos Correios
 *     tags: [Tracking]
 *     parameters:
 *       - in: path
 *         name: trackingCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de rastreamento dos Correios
 *         example: "AM699556402BR"
 *     responses:
 *       200:
 *         description: Rastreamento obtido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 trackingCode:
 *                   type: string
 *                 tracking:
 *                   type: object
 *                   properties:
 *                     codigo:
 *                       type: string
 *                     eventos:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           data:
 *                             type: string
 *                           hora:
 *                             type: string
 *                           local:
 *                             type: string
 *                           codigo:
 *                             type: string
 *                           descricao:
 *                             type: string
 *                           detalhe:
 *                             type: string
 *       400:
 *         description: Código de rastreamento inválido
 *       404:
 *         description: Código não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/code/:trackingCode', tracking_controller_1.trackingController.trackCode);
/**
 * @swagger
 * /api/tracking/stats:
 *   get:
 *     summary: Obtém estatísticas de rastreamento
 *     tags: [Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/stats', auth_1.auth, tracking_controller_1.trackingController.getTrackingStats);
exports.default = router;
