"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment.controller");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Rotas que requerem autenticação
router.post('/credit-card', auth_1.auth, payment_controller_1.processCreditCardPayment);
router.post('/generate-link', auth_1.auth, payment_controller_1.generatePaymentLink);
router.get('/status/:orderId', auth_1.auth, payment_controller_1.checkPaymentStatus);
// Webhook do Asaas (não requer autenticação)
router.post('/webhook', payment_controller_1.asaasWebhook);
exports.default = router;
