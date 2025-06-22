import { Router } from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth';
import {
  uploadProductImages,
  getProductImages,
  setMainImage,
  reorderImages,
  deleteImage,
  ProductImagesController
} from '../controllers/product-images.controller';

const router = Router();

// Configuração do multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  },
});

// Rotas para imagens de produtos
router.post('/:productId/upload', auth, upload.array('images', 10), uploadProductImages);
router.get('/:productId', getProductImages);
router.put('/:productId/main/:imageId', auth, setMainImage);
router.put('/:productId/reorder', auth, reorderImages);
router.delete('/:imageId', auth, deleteImage);

// Rota para corrigir múltiplas imagens principais
router.post('/:productId/fix-main', auth, ProductImagesController.fixMultipleMainImages);

export default router; 