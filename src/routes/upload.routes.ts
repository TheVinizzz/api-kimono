import { Router } from 'express';
import { UploadController, uploadSingle, uploadMultiple } from '../controllers/upload.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Middleware de autenticação para todas as rotas de upload
router.use(auth);

// Upload de imagem de produto (single)
router.post(
  '/product',
  uploadSingle,
  UploadController.uploadProductImage
);

// Upload de imagem de categoria (single)
router.post(
  '/category',
  uploadSingle,
  UploadController.uploadCategoryImage
);

// Upload múltiplo de imagens
router.post(
  '/multiple',
  uploadMultiple,
  UploadController.uploadMultipleImages
);

// Deletar arquivo
router.delete('/file/:fileName', UploadController.deleteFile);

// Listar arquivos
router.get('/files', UploadController.listFiles);

// Gerar URL de upload pré-assinada
router.post('/generate-url', UploadController.generateUploadUrl);

export default router; 