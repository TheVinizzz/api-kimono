import { Router } from 'express';
import { getAnalytics, getVisitDetails, exportVisits, trackPageVisit } from '../controllers/analytics.controller';
import { auth, isAdmin } from '../middleware/auth';

const router = Router();

// IMPORTANTE: Rota pública para rastrear visitas do frontend DEVE vir ANTES dos middlewares de auth
// para que possa ser acessada sem autenticação
router.post('/track', trackPageVisit);

// A partir daqui, todas as rotas requerem autenticação e permissão de admin
router.use(auth);
router.use(isAdmin);

// Rotas para obter estatísticas que requerem autenticação
router.get('/', getAnalytics);
router.get('/visits/:id', getVisitDetails);
router.get('/export', exportVisits);

export default router; 