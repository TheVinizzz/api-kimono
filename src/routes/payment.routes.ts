import express from 'express';
import { 
  processCardPayment,
  processAuthenticatedPix,
  processAuthenticatedBoleto,
  processGuestCardPayment,
  processGuestPixPayment,
  processGuestBoletoPayment,
  generatePaymentLink,
  checkPaymentStatus,
  asaasWebhook
} from '../controllers/payment.controller';
import { authRequired } from '../middleware/auth';

const router = express.Router();

// ============================================
// ROTAS PARA USUÁRIOS AUTENTICADOS (OBRIGATÓRIO)
// ============================================

// Pagamentos com cartão (requer autenticação RIGOROSA)
router.post('/card', authRequired, processCardPayment);
router.post('/credit-card', authRequired, processCardPayment);
router.post('/debit-card', authRequired, processCardPayment);

// ✅ PIX e Boleto para usuários autenticados
router.post('/pix', authRequired, processAuthenticatedPix);
router.post('/boleto', authRequired, processAuthenticatedBoleto);

// Outras funcionalidades para usuários autenticados
router.post('/generate-link', authRequired, generatePaymentLink);
router.get('/status/:orderId', authRequired, checkPaymentStatus);

// ============================================
// ROTAS PARA CONVIDADOS (TEMPORÁRIAS - DEPRECATED)
// ============================================
// NOTA: Estas rotas serão removidas em versões futuras
// O frontend deve migrar para usar apenas rotas autenticadas

router.post('/guest/card', processGuestCardPayment);
router.post('/guest/pix', processGuestPixPayment);
router.post('/guest/boleto', processGuestBoletoPayment);
router.post('/guest/link', generatePaymentLink);
router.get('/guest/status/:orderId', checkPaymentStatus);

// ============================================
// WEBHOOKS (SEM AUTENTICAÇÃO)
// ============================================

router.post('/webhook', asaasWebhook);

export default router; 