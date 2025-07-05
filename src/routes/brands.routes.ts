import { Router } from 'express';
import * as brandsController from '../controllers/brands.controller';
import { auth, isAdmin } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.get('/', brandsController.getAllBrands);
router.get('/:id', brandsController.getBrandById);

// Rotas de administrador
router.post('/', auth, isAdmin, brandsController.createBrand);
router.put('/:id', auth, isAdmin, brandsController.updateBrand);
router.delete('/:id', auth, isAdmin, brandsController.deleteBrand);

export default router; 