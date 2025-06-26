import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getFilteredProducts,
  // Novas importações para variações
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getProductVariants,
  createMultipleVariants
} from '../controllers/products.controller';
import { auth } from '../middleware/auth';
import { isAdmin } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.get('/', getFilteredProducts);
router.get('/all', getAllProducts);
router.get('/:id', getProductById);

// Rotas protegidas (apenas admin)
router.post('/', auth, isAdmin, createProduct);
router.put('/:id', auth, isAdmin, updateProduct);
router.delete('/:id', auth, isAdmin, deleteProduct);

// ===== NOVAS ROTAS PARA VARIAÇÕES =====

// Obter variações de um produto
router.get('/:productId/variants', getProductVariants);

// Criar uma variação
router.post('/:productId/variants', auth, isAdmin, createProductVariant);

// Criar múltiplas variações de uma vez
router.post('/:productId/variants/batch', auth, isAdmin, createMultipleVariants);

// Atualizar uma variação
router.put('/:productId/variants/:variantId', auth, isAdmin, updateProductVariant);

// Deletar uma variação
router.delete('/:productId/variants/:variantId', auth, isAdmin, deleteProductVariant);

export default router; 