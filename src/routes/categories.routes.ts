import { Router } from 'express';
import * as categoriesController from '../controllers/categories.controller';
import { auth, isAdmin } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.get('/', categoriesController.getAllCategories);
router.get('/:id', categoriesController.getCategoryById);

// Rotas de administrador
router.post('/', auth, isAdmin, categoriesController.createCategory);
router.put('/:id', auth, isAdmin, categoriesController.updateCategory);
router.delete('/:id', auth, isAdmin, categoriesController.deleteCategory);

export default router; 