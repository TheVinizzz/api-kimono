import { Router } from 'express';
import * as correiosController from '../controllers/correios.controller';
import { auth, isAdmin } from '../middleware/auth';

const router = Router();

// Rotas privadas (requerem autenticação de admin)
router.post('/gerar-rastreio/:orderId', auth, isAdmin, correiosController.gerarCodigoRastreio);
router.post('/processar-pedidos', auth, isAdmin, correiosController.processarPedidosPagos);
router.get('/testar-conexao', auth, isAdmin, correiosController.testarConexao);
router.get('/status-integracao', auth, isAdmin, correiosController.verificarStatusIntegracao);
router.get('/historico-job', auth, isAdmin, correiosController.obterHistoricoJob);

// Rotas públicas
router.get('/status', correiosController.statusPublico);
router.get('/rastrear/:codigoRastreio', correiosController.rastrearObjeto);

export default router; 