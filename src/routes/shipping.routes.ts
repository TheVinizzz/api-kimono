import { Router } from 'express';
import { 
  calculateProductShipping, 
  calculateDetailedShipping, 
  validateCEP 
} from '../controllers/shipping.controller';

const router = Router();

/**
 * POST /shipping/calculate
 * Calcula frete para um produto (método simplificado)
 * Body: { cepDestino, peso?, valor, cepOrigem? }
 */
router.post('/calculate', calculateProductShipping);

/**
 * POST /shipping/calculate-detailed
 * Calcula frete com parâmetros detalhados
 * Body: { cepOrigem, cepDestino, peso, formato, comprimento, altura, largura, ... }
 */
router.post('/calculate-detailed', calculateDetailedShipping);

/**
 * GET /shipping/validate-cep/:cep
 * Valida se um CEP está no formato correto
 */
router.get('/validate-cep/:cep', validateCEP);

export default router; 