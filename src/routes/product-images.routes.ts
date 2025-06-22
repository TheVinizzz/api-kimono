import { Router } from 'express';
import { ProductImagesController } from '../controllers/product-images.controller';
import { uploadMiddleware } from '../controllers/upload.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Middleware de autenticação para todas as rotas
router.use(auth);

// Upload múltiplas imagens para um produto
router.post(
  '/:productId/upload',
  uploadMiddleware.array('images', 10) as any, // máximo 10 imagens
  ProductImagesController.uploadProductImages
);

// Obter todas as imagens de um produto
router.get('/:productId', ProductImagesController.getProductImages);

// Definir imagem principal
router.put('/:productId/images/:imageId/main', ProductImagesController.setMainImage);

// Reordenar imagens
router.put('/:productId/reorder', ProductImagesController.reorderImages);

// Deletar imagem específica
router.delete('/:productId/images/:imageId', ProductImagesController.deleteImage);

// Corrigir múltiplas imagens principais
router.post('/:productId/fix-main', ProductImagesController.fixMultipleMainImages);

export default router; 