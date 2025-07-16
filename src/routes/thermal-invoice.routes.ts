import { Router } from 'express';
import { 
  generateThermalInvoice,
  generateBatchThermalInvoices
} from '../controllers/thermal-invoice.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Middleware para verificar autenticação em todas as rotas
router.use(auth);

// GET /api/thermal-invoices/generate/:orderId - Gerar nota fiscal térmica
router.get('/generate/:orderId', generateThermalInvoice);

// POST /api/thermal-invoices/batch - Gerar múltiplas notas fiscais térmicas
router.post('/batch', generateBatchThermalInvoices);

export default router; 