import { Router } from 'express';
import { auth, isAdmin } from '../middleware/auth';
import {
  getShippingSettings,
  updateShippingSettings,
  getSetting
} from '../controllers/settings.controller';

const router = Router();

// Rotas protegidas - apenas admin
router.get('/shipping', auth, isAdmin, getShippingSettings);
router.put('/shipping', auth, isAdmin, updateShippingSettings);
router.get('/:key', auth, isAdmin, getSetting);

export default router; 