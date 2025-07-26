import { Router } from 'express';
import {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCouponToOrder,
  removeCouponFromOrder
} from '../controllers/coupons.controller';
import { auth } from '../middleware/auth';
import { isAdmin } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.post('/validate', validateCoupon);

// Rotas protegidas (requer autenticação)
router.use(auth);

// Rotas de pedidos (clientes podem aplicar/remover cupons)
router.post('/orders/:orderId/apply', applyCouponToOrder);
router.delete('/orders/:orderId/remove', removeCouponFromOrder);

// Rotas administrativas (requer admin)
router.use(isAdmin);

router.get('/', getAllCoupons);
router.get('/:id', getCouponById);
router.post('/', createCoupon);
router.put('/:id', updateCoupon);
router.delete('/:id', deleteCoupon);

export default router; 