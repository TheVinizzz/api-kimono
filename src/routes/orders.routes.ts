import { Router } from 'express';
import * as ordersController from '../controllers/orders.controller';
import { auth, isAdmin } from '../middleware/auth';

const router = Router();

// Rotas de usuário autenticado
router.get('/user', auth, ordersController.getUserOrders);
router.get('/:id', auth, ordersController.getOrderById);
router.get('/:id/tracking', auth, ordersController.getOrderTracking);
router.post('/', auth, ordersController.createOrder);

// Rota para convidados (sem autenticação)
router.post('/guest', ordersController.createGuestOrder);

// Rotas de administrador
router.get('/', auth, isAdmin, ordersController.getAllOrders);
router.put('/:id/status', auth, isAdmin, ordersController.updateOrderStatus);
router.put('/:id/tracking', auth, isAdmin, ordersController.updateTrackingInfo);
router.post('/:id/shipment-updates', auth, isAdmin, ordersController.addShipmentUpdate);
router.patch('/admin/status', auth, isAdmin, ordersController.adminUpdateOrderStatus);

export default router; 