import { Router } from 'express';
import { 
  generateInvoice,
  getInvoicesList
} from '../controllers/invoice.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Middleware para verificar autenticação em todas as rotas
router.use(auth);

// GET /api/invoices - Listar notas fiscais
router.get('/', getInvoicesList);

// GET /api/invoices/generate/:orderId - Gerar nota fiscal
router.get('/generate/:orderId', generateInvoice);

export default router; 