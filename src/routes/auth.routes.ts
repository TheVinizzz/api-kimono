import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Rotas de debug (apenas para ambiente de desenvolvimento)
router.get('/debug', authController.debugAuth);

// Rotas protegidas
router.get('/me', auth, authController.getMe);

export default router; 