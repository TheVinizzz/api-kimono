"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoice_controller_1 = require("../controllers/invoice.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Middleware para verificar autenticação em todas as rotas
router.use(auth_1.auth);
// GET /api/invoices - Listar notas fiscais
router.get('/', invoice_controller_1.getInvoicesList);
// GET /api/invoices/generate/:orderId - Gerar nota fiscal
router.get('/generate/:orderId', invoice_controller_1.generateInvoice);
exports.default = router;
