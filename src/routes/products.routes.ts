import { Router } from 'express';
import * as productsController from '../controllers/products.controller';
import { auth, isAdmin } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.get('/', productsController.getAllProducts);
router.get('/filter', productsController.getFilteredProducts);
router.get('/:id', productsController.getProductById);

// Rotas protegidas (apenas admin)
router.post('/', auth, isAdmin, productsController.createProduct);
router.put('/:id', auth, isAdmin, productsController.updateProduct);
router.delete('/:id', auth, isAdmin, productsController.deleteProduct);

export default router; 