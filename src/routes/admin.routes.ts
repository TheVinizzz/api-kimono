import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { auth, isAdmin } from '../middleware/auth';

const router = Router();

// Todas as rotas são protegidas por auth e isAdmin
router.use(auth, isAdmin);

// Estatísticas do dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Usuários
router.get('/users', adminController.getAllUsers);

export default router; 