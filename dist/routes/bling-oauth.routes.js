"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bling_oauth_controller_1 = require("../controllers/bling-oauth.controller");
const router = express_1.default.Router();
// ===================
// AUTENTICAÇÃO OAUTH
// ===================
// Autenticação automática (sem navegador)
router.post('/auth/auto', bling_oauth_controller_1.authenticateAutomatically);
// Gerar URL de autorização
router.get('/auth/url', bling_oauth_controller_1.generateAuthUrl);
// Processar callback OAuth (trocar código por tokens)
router.post('/auth/callback', bling_oauth_controller_1.handleOAuthCallback);
// Verificar status da autenticação
router.get('/auth/status', bling_oauth_controller_1.checkAuthStatus);
// ===================
// DADOS DO BLING
// ===================
// Obter dados completos do Bling (com autenticação automática)
router.get('/data/auto', bling_oauth_controller_1.getBlingDataAuto);
// Obter dados completos do Bling
router.get('/data', bling_oauth_controller_1.getBlingData);
// Obter apenas produtos do Bling
router.get('/products', bling_oauth_controller_1.getBlingProducts);
// Obter informações da empresa
router.get('/company', bling_oauth_controller_1.getBlingCompany);
// Obter produto específico por ID
router.get('/products/:id', bling_oauth_controller_1.getBlingProductById);
exports.default = router;
