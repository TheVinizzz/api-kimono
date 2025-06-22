"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_images_controller_1 = require("../controllers/product-images.controller");
const upload_controller_1 = require("../controllers/upload.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Middleware de autenticação para todas as rotas
router.use(auth_1.auth);
// Upload múltiplas imagens para um produto
router.post('/:productId/upload', upload_controller_1.uploadMiddleware.array('images', 10), // máximo 10 imagens
product_images_controller_1.ProductImagesController.uploadProductImages);
// Obter todas as imagens de um produto
router.get('/:productId', product_images_controller_1.ProductImagesController.getProductImages);
// Definir imagem principal
router.put('/:productId/images/:imageId/main', product_images_controller_1.ProductImagesController.setMainImage);
// Reordenar imagens
router.put('/:productId/reorder', product_images_controller_1.ProductImagesController.reorderImages);
// Deletar imagem específica
router.delete('/:productId/images/:imageId', product_images_controller_1.ProductImagesController.deleteImage);
// Corrigir múltiplas imagens principais
router.post('/:productId/fix-main', product_images_controller_1.ProductImagesController.fixMultipleMainImages);
exports.default = router;
