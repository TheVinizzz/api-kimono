import { Router } from 'express';
import { 
  getPendingShippingLabels,
  generateShippingLabel,
  markLabelAsPrinted,
  generateBatchLabels,
  resetLabelPrintStatus
} from '../controllers/shipping-labels.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Middleware para verificar autenticação em todas as rotas
router.use(auth);

// GET /api/shipping-labels/pending - Listar pedidos que precisam de etiquetas
router.get('/pending', getPendingShippingLabels);

// GET /api/shipping-labels/generate/:orderId - Gerar etiqueta individual
router.get('/generate/:orderId', generateShippingLabel);

// POST /api/shipping-labels/batch - Gerar múltiplas etiquetas
router.post('/batch', generateBatchLabels);

// PUT /api/shipping-labels/mark-printed/:orderId - Marcar como impressa
router.put('/mark-printed/:orderId', markLabelAsPrinted);

// PUT /api/shipping-labels/reset-status/:orderId - Resetar status de impressão
router.put('/reset-status/:orderId', resetLabelPrintStatus);

export default router; 