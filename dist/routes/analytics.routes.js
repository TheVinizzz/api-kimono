"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// IMPORTANTE: Rota pública para rastrear visitas do frontend DEVE vir ANTES dos middlewares de auth
// para que possa ser acessada sem autenticação
router.post('/track', analytics_controller_1.trackPageVisit);
// A partir daqui, todas as rotas requerem autenticação e permissão de admin
router.use(auth_1.auth);
router.use(auth_1.isAdmin);
// Rotas para obter estatísticas que requerem autenticação
router.get('/', analytics_controller_1.getAnalytics);
router.get('/visits/:id', analytics_controller_1.getVisitDetails);
router.get('/export', analytics_controller_1.exportVisits);
exports.default = router;
