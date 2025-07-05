import { Router } from 'express';
import { auth, isAdmin } from '../middleware/auth';
import * as correiosController from '../controllers/correios.controller';

const router = Router();

// Rotas administrativas (requerem autenticação de admin)
router.post('/gerar-rastreio/:orderId', auth, isAdmin, correiosController.gerarCodigoRastreio);
router.post('/processar-pedidos', auth, isAdmin, correiosController.processarPedidosPagos);
router.get('/testar-conexao', auth, isAdmin, correiosController.testarConexao);

// Rotas públicas
router.get('/rastrear/:codigoRastreio', correiosController.rastrearObjeto);

export default router; 