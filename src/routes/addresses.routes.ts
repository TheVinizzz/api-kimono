import { Router } from 'express';
import * as addressController from '../controllers/addresses.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Todas as rotas requerem autenticação
router.use(auth);

// Rotas de endereços
router.get('/', addressController.getUserAddresses);
router.get('/:id', addressController.getAddressById);
router.post('/', addressController.createAddress);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);
router.patch('/:id/default', addressController.setDefaultAddress);

export default router; 