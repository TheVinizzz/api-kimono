import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  processCreditCardPayment,
  processPixPayment,
  checkPaymentStatus,
  mercadoPagoWebhook
} from '../controllers/mercadopago.controller';

const router = Router();

// Rotas protegidas (requer autenticação)
router.post('/credit-card', auth, processCreditCardPayment);
router.post('/pix', auth, processPixPayment);
router.get('/status/:orderId', auth, checkPaymentStatus);

// Webhook do Mercado Pago (não requer autenticação)
router.post('/webhook', mercadoPagoWebhook);

export default router; 