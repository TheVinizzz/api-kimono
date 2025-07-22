import { Router } from 'express';
import { auth, isAdmin } from '../middleware/auth';
import {
  getShippingSettings,
  updateShippingSettings,
  getSetting,
  getCompanySettings,
  updateCompanySettings
} from '../controllers/settings.controller';

const router = Router();

// Rota pública para configurações básicas da empresa
router.get('/company/public', getCompanySettings);

// Rotas protegidas - apenas admin
router.get('/shipping', auth, isAdmin, getShippingSettings);
router.put('/shipping', auth, isAdmin, updateShippingSettings);
router.get('/company', auth, isAdmin, getCompanySettings);
router.put('/company', auth, isAdmin, updateCompanySettings);
router.get('/:key', auth, isAdmin, getSetting);

export default router; 