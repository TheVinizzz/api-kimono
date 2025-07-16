"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ============================================
// ROTAS PARA USUÁRIOS AUTENTICADOS (OBRIGATÓRIO)
// ============================================
// Pagamentos com cartão (requer autenticação RIGOROSA)
router.post('/card', auth_1.authRequired, payment_controller_1.processCardPayment);
router.post('/credit-card', auth_1.authRequired, payment_controller_1.processCardPayment);
router.post('/debit-card', auth_1.authRequired, payment_controller_1.processCardPayment);
// ✅ PIX e Boleto para usuários autenticados
router.post('/pix', auth_1.authRequired, payment_controller_1.processAuthenticatedPix);
router.post('/boleto', auth_1.authRequired, payment_controller_1.processAuthenticatedBoleto);
// Outras funcionalidades para usuários autenticados
router.post('/generate-link', auth_1.authRequired, payment_controller_1.generatePaymentLink);
router.get('/status/:orderId', auth_1.authRequired, payment_controller_1.checkPaymentStatus);
// ============================================
// ROTAS PARA CONVIDADOS (TEMPORÁRIAS - DEPRECATED)
// ============================================
// NOTA: Estas rotas serão removidas em versões futuras
// O frontend deve migrar para usar apenas rotas autenticadas
router.post('/guest/card', payment_controller_1.processGuestCardPayment);
router.post('/guest/pix', payment_controller_1.processGuestPixPayment);
router.post('/guest/boleto', payment_controller_1.processGuestBoletoPayment);
router.post('/guest/link', payment_controller_1.generatePaymentLink);
router.get('/guest/status/:orderId', payment_controller_1.checkPaymentStatus);
// ============================================
// WEBHOOKS (SEM AUTENTICAÇÃO)
// ============================================
router.post('/webhook', payment_controller_1.asaasWebhook);
exports.default = router;
