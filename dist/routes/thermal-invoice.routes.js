"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const thermal_invoice_controller_1 = require("../controllers/thermal-invoice.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Middleware para verificar autenticação em todas as rotas
router.use(auth_1.auth);
// GET /api/thermal-invoices/generate/:orderId - Gerar nota fiscal térmica
router.get('/generate/:orderId', thermal_invoice_controller_1.generateThermalInvoice);
// POST /api/thermal-invoices/batch - Gerar múltiplas notas fiscais térmicas
router.post('/batch', thermal_invoice_controller_1.generateBatchThermalInvoices);
exports.default = router;
