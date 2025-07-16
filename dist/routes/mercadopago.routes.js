"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const mercadopago_controller_1 = require("../controllers/mercadopago.controller");
const router = (0, express_1.Router)();
// Rotas protegidas (requer autenticação)
router.post('/credit-card', auth_1.auth, mercadopago_controller_1.processCreditCardPayment);
router.post('/pix', auth_1.auth, mercadopago_controller_1.processPixPayment);
router.post('/checkout-pix', auth_1.auth, mercadopago_controller_1.processCheckoutPix);
router.post('/checkout-card', auth_1.auth, mercadopago_controller_1.processCheckoutCard);
router.post('/checkout-boleto', auth_1.auth, mercadopago_controller_1.processCheckoutBoleto);
router.get('/pix-qr/:orderId', auth_1.auth, mercadopago_controller_1.getPixQrCode);
router.get('/status/:orderId', auth_1.auth, mercadopago_controller_1.checkPaymentStatus);
// Webhook do Mercado Pago (não requer autenticação)
router.post('/webhook', mercadopago_controller_1.mercadoPagoWebhook);
// ✅ ENDPOINT DE TESTE PARA TOKEN DE CARTÃO
router.get('/test-card-token', mercadopago_controller_1.testCardToken);
router.get('/test-full-payment', mercadopago_controller_1.testFullCardPayment);
router.get('/test-approved-payment', mercadopago_controller_1.testApprovedPayment);
router.get('/debug-checkout-card', mercadopago_controller_1.debugCheckoutCard);
router.post('/test-user-card', mercadopago_controller_1.testUserCardData);
router.post('/test-stock-reduction/:orderId', mercadopago_controller_1.testStockReduction);
router.get('/test-order-data/:orderId', mercadopago_controller_1.testOrderData);
router.get('/test-real-checkout', mercadopago_controller_1.testRealCheckout);
exports.default = router;
