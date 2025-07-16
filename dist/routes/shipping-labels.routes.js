"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shipping_labels_controller_1 = require("../controllers/shipping-labels.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Middleware para verificar autenticação em todas as rotas
router.use(auth_1.auth);
// GET /api/shipping-labels/pending - Listar pedidos que precisam de etiquetas
router.get('/pending', shipping_labels_controller_1.getPendingShippingLabels);
// GET /api/shipping-labels/generate/:orderId - Gerar etiqueta individual
router.get('/generate/:orderId', shipping_labels_controller_1.generateShippingLabel);
// POST /api/shipping-labels/batch - Gerar múltiplas etiquetas
router.post('/batch', shipping_labels_controller_1.generateBatchLabels);
// PUT /api/shipping-labels/mark-printed/:orderId - Marcar como impressa
router.put('/mark-printed/:orderId', shipping_labels_controller_1.markLabelAsPrinted);
// PUT /api/shipping-labels/reset-status/:orderId - Resetar status de impressão
router.put('/reset-status/:orderId', shipping_labels_controller_1.resetLabelPrintStatus);
exports.default = router;
