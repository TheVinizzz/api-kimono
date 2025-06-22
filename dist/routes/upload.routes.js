"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_controller_1 = require("../controllers/upload.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Middleware de autenticação para todas as rotas de upload
router.use(auth_1.auth);
// Upload de imagem de produto (single)
router.post('/product', upload_controller_1.uploadMiddleware.single('image'), upload_controller_1.UploadController.uploadProductImage);
// Upload de imagem de categoria (single)
router.post('/category', upload_controller_1.uploadMiddleware.single('image'), upload_controller_1.UploadController.uploadCategoryImage);
// Upload múltiplo de imagens
router.post('/multiple', upload_controller_1.uploadMiddleware.array('images', 10), // máximo 10 imagens
upload_controller_1.UploadController.uploadMultipleImages);
// Deletar arquivo
router.delete('/file/:fileName', upload_controller_1.UploadController.deleteFile);
// Listar arquivos
router.get('/files', upload_controller_1.UploadController.listFiles);
// Gerar URL de upload pré-assinada
router.post('/generate-url', upload_controller_1.UploadController.generateUploadUrl);
exports.default = router;
