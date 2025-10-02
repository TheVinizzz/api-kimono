import { Router } from 'express';
import { sendContactEmail } from '../controllers/contact.controller';

const router = Router();

// Rota para enviar email de contato
router.post('/contact', sendContactEmail);

export default router;
