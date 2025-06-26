"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const mercadopago_controller_1 = require("../controllers/mercadopago.controller");
const router = (0, express_1.Router)();
// Rotas protegidas (requer autenticação)
router.post('/credit-card', auth_1.auth, mercadopago_controller_1.processCreditCardPayment);
router.post('/pix', auth_1.auth, mercadopago_controller_1.processPixPayment);
router.get('/status/:orderId', auth_1.auth, mercadopago_controller_1.checkPaymentStatus);
// Webhook do Mercado Pago (não requer autenticação)
router.post('/webhook', mercadopago_controller_1.mercadoPagoWebhook);
exports.default = router;
