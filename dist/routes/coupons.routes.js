"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupons_controller_1 = require("../controllers/coupons.controller");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Rotas públicas
router.post('/validate', coupons_controller_1.validateCoupon);
// Rotas protegidas (requer autenticação)
router.use(auth_1.auth);
// Rotas de pedidos (clientes podem aplicar/remover cupons)
router.post('/orders/:orderId/apply', coupons_controller_1.applyCouponToOrder);
router.delete('/orders/:orderId/remove', coupons_controller_1.removeCouponFromOrder);
// Rotas administrativas (requer admin)
router.use(auth_2.isAdmin);
router.get('/', coupons_controller_1.getAllCoupons);
router.get('/:id', coupons_controller_1.getCouponById);
router.post('/', coupons_controller_1.createCoupon);
router.put('/:id', coupons_controller_1.updateCoupon);
router.delete('/:id', coupons_controller_1.deactivateCoupon);
exports.default = router;
