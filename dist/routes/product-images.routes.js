"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const product_images_controller_1 = require("../controllers/product-images.controller");
const router = (0, express_1.Router)();
// Configuração do multer
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Apenas arquivos de imagem são permitidos'));
        }
    },
});
// Rotas para imagens de produtos
router.post('/:productId/upload', auth_1.auth, upload.array('images', 10), product_images_controller_1.uploadProductImages);
router.get('/:productId', product_images_controller_1.getProductImages);
router.put('/:productId/main/:imageId', auth_1.auth, product_images_controller_1.setMainImage);
router.put('/:productId/reorder', auth_1.auth, product_images_controller_1.reorderImages);
router.delete('/:imageId', auth_1.auth, product_images_controller_1.deleteImage);
// Rota para corrigir múltiplas imagens principais
router.post('/:productId/fix-main', auth_1.auth, product_images_controller_1.ProductImagesController.fixMultipleMainImages);
exports.default = router;
