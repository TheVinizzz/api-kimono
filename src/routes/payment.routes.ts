import express from 'express';
import { 
  processCreditCardPayment,
  processDebitCardPayment,
  generatePaymentLink,
  checkPaymentStatus,
  asaasWebhook
} from '../controllers/payment.controller';
import { auth } from '../middleware/auth';

const router = express.Router();

// Rotas que requerem autenticação
router.post('/credit-card', auth, processCreditCardPayment);
router.post('/debit-card', auth, processDebitCardPayment);
router.post('/generate-link', auth, generatePaymentLink);
router.get('/status/:orderId', auth, checkPaymentStatus);

// Webhook do Asaas (não requer autenticação)
router.post('/webhook', asaasWebhook);

// Rotas para usuários não autenticados (guest)
router.post('/guest/link', generatePaymentLink);
router.get('/guest/status/:orderId', checkPaymentStatus);

export default router; 