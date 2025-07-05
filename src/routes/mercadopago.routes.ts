import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  processCreditCardPayment,
  processPixPayment,
  checkPaymentStatus,
  mercadoPagoWebhook,
  processCheckoutPix,
  getPixQrCode,
  processCheckoutCard,
  processCheckoutBoleto,
  testCardToken,
  testFullCardPayment,
  testApprovedPayment,
  debugCheckoutCard,
  testUserCardData,
  testStockReduction,
  testOrderData,
  testRealCheckout
} from '../controllers/mercadopago.controller';

const router = Router();

// Rotas protegidas (requer autenticação)
router.post('/credit-card', auth, processCreditCardPayment);
router.post('/pix', auth, processPixPayment);
router.post('/checkout-pix', auth, processCheckoutPix);
router.post('/checkout-card', auth, processCheckoutCard);
router.post('/checkout-boleto', auth, processCheckoutBoleto);
router.get('/pix-qr/:orderId', auth, getPixQrCode);
router.get('/status/:orderId', auth, checkPaymentStatus);

// Webhook do Mercado Pago (não requer autenticação)
router.post('/webhook', mercadoPagoWebhook);

// ✅ ENDPOINT DE TESTE PARA TOKEN DE CARTÃO
router.get('/test-card-token', testCardToken);
router.get('/test-full-payment', testFullCardPayment);
router.get('/test-approved-payment', testApprovedPayment);
router.get('/debug-checkout-card', debugCheckoutCard);
router.post('/test-user-card', testUserCardData);
router.post('/test-stock-reduction/:orderId', testStockReduction);
router.get('/test-order-data/:orderId', testOrderData);
router.get('/test-real-checkout', testRealCheckout);

export default router; 