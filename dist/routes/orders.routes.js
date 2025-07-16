"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ordersController = __importStar(require("../controllers/orders.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Rotas de usuário autenticado
router.get('/user', auth_1.auth, ordersController.getUserOrders);
router.get('/:id', auth_1.auth, ordersController.getOrderById);
router.get('/:id/tracking', auth_1.auth, ordersController.getOrderTracking);
router.post('/', auth_1.auth, ordersController.createOrder);
// Rotas para convidados (sem autenticação)
router.post('/guest', ordersController.createGuestOrder);
router.get('/guest/:id', ordersController.getGuestOrderById);
router.get('/guest/:id/status', ordersController.checkGuestOrderPaymentStatus);
// Rotas de administrador
router.get('/', auth_1.auth, auth_1.isAdmin, ordersController.getAllOrders);
router.put('/:id/status', auth_1.auth, auth_1.isAdmin, ordersController.updateOrderStatus);
router.put('/:id/tracking', auth_1.auth, auth_1.isAdmin, ordersController.updateTrackingInfo);
router.post('/:id/shipment-updates', auth_1.auth, auth_1.isAdmin, ordersController.addShipmentUpdate);
router.patch('/admin/status', auth_1.auth, auth_1.isAdmin, ordersController.adminUpdateOrderStatus);
// ✅ NOVA ROTA: Cancelar pedidos expirados e restaurar estoque
router.post('/admin/cancel-expired', auth_1.auth, auth_1.isAdmin, ordersController.cancelExpiredOrders);
// ✅ NOVA ROTA: Testar redução de estoque
router.post('/admin/test-reduce-stock/:orderId', auth_1.auth, auth_1.isAdmin, ordersController.testReduceStock);
// ✅ NOVA ROTA: Consultar informações de estoque em tempo real
router.get('/stock-info', ordersController.getStockInfo); // Rota pública para consulta de estoque
exports.default = router;
