import express from 'express';
import {
  authenticateAutomatically,
  generateAuthUrl,
  handleOAuthCallback,
  checkAuthStatus,
  getBlingData,
  getBlingDataAuto,
  getBlingProducts,
  getBlingCompany,
  getBlingProductById
} from '../controllers/bling-oauth.controller';

const router = express.Router();

// ===================
// AUTENTICAÇÃO OAUTH
// ===================

// Autenticação automática (sem navegador)
router.post('/auth/auto', authenticateAutomatically);

// Gerar URL de autorização
router.get('/auth/url', generateAuthUrl);

// Processar callback OAuth (trocar código por tokens)
router.post('/auth/callback', handleOAuthCallback);

// Verificar status da autenticação
router.get('/auth/status', checkAuthStatus);

// ===================
// DADOS DO BLING
// ===================

// Obter dados completos do Bling (com autenticação automática)
router.get('/data/auto', getBlingDataAuto);

// Obter dados completos do Bling
router.get('/data', getBlingData);

// Obter apenas produtos do Bling
router.get('/products', getBlingProducts);

// Obter informações da empresa
router.get('/company', getBlingCompany);

// Obter produto específico por ID
router.get('/products/:id', getBlingProductById);

export default router; 