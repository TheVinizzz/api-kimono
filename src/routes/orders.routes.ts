import { Router } from 'express';
import * as ordersController from '../controllers/orders.controller';
import { auth, isAdmin } from '../middleware/auth';

const router = Router();

// Rotas de usuário autenticado
router.get('/user', auth, ordersController.getUserOrders);
router.get('/:id', auth, ordersController.getOrderById);
router.get('/:id/tracking', auth, ordersController.getOrderTracking);
router.post('/', auth, ordersController.createOrder);

// Rotas para convidados (sem autenticação)
router.post('/guest', ordersController.createGuestOrder);
router.get('/guest/:id', ordersController.getGuestOrderById);
router.get('/guest/:id/status', ordersController.checkGuestOrderPaymentStatus);

// Rotas de administrador
router.get('/', auth, isAdmin, ordersController.getAllOrders);
router.put('/:id/status', auth, isAdmin, ordersController.updateOrderStatus);
router.put('/:id/tracking', auth, isAdmin, ordersController.updateTrackingInfo);
router.post('/:id/shipment-updates', auth, isAdmin, ordersController.addShipmentUpdate);
router.patch('/admin/status', auth, isAdmin, ordersController.adminUpdateOrderStatus);

// ✅ NOVA ROTA: Cancelar pedidos expirados e restaurar estoque
router.post('/admin/cancel-expired', auth, isAdmin, ordersController.cancelExpiredOrders);


// ✅ NOVA ROTA: Consultar informações de estoque em tempo real
router.get('/stock-info', ordersController.getStockInfo); // Rota pública para consulta de estoque

export default router; 