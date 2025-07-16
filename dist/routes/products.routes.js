"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_controller_1 = require("../controllers/products.controller");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Rotas públicas
router.get('/', products_controller_1.getFilteredProducts);
router.get('/all', products_controller_1.getAllProducts);
router.get('/:id', products_controller_1.getProductById);
// Rotas protegidas (apenas admin)
router.post('/', auth_1.auth, auth_2.isAdmin, products_controller_1.createProduct);
router.put('/:id', auth_1.auth, auth_2.isAdmin, products_controller_1.updateProduct);
router.delete('/:id', auth_1.auth, auth_2.isAdmin, products_controller_1.deleteProduct);
// ===== NOVAS ROTAS PARA VARIAÇÕES =====
// Obter variações de um produto
router.get('/:productId/variants', products_controller_1.getProductVariants);
// Criar uma variação
router.post('/:productId/variants', auth_1.auth, auth_2.isAdmin, products_controller_1.createProductVariant);
// Criar múltiplas variações de uma vez
router.post('/:productId/variants/batch', auth_1.auth, auth_2.isAdmin, products_controller_1.createMultipleVariants);
// Atualizar uma variação
router.put('/:productId/variants/:variantId', auth_1.auth, auth_2.isAdmin, products_controller_1.updateProductVariant);
// Deletar uma variação
router.delete('/:productId/variants/:variantId', auth_1.auth, auth_2.isAdmin, products_controller_1.deleteProductVariant);
exports.default = router;
