"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shipping_controller_1 = require("../controllers/shipping.controller");
const router = (0, express_1.Router)();
/**
 * POST /shipping/calculate
 * Calcula frete para um produto (método simplificado)
 * Body: { cepDestino, peso?, valor, cepOrigem? }
 */
router.post('/calculate', shipping_controller_1.calculateProductShipping);
/**
 * POST /shipping/calculate-detailed
 * Calcula frete com parâmetros detalhados
 * Body: { cepOrigem, cepDestino, peso, formato, comprimento, altura, largura, ... }
 */
router.post('/calculate-detailed', shipping_controller_1.calculateDetailedShipping);
/**
 * GET /shipping/validate-cep/:cep
 * Valida se um CEP está no formato correto
 */
router.get('/validate-cep/:cep', shipping_controller_1.validateCEP);
exports.default = router;
