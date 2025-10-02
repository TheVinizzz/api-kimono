"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const correiosController = __importStar(require("../controllers/correios.controller"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Rotas privadas (requerem autenticação de admin)
router.post('/gerar-rastreio/:orderId', auth_1.auth, auth_1.isAdmin, correiosController.gerarCodigoRastreio);
router.post('/processar-pedidos', auth_1.auth, auth_1.isAdmin, correiosController.processarPedidosPagos);
router.get('/testar-conexao', auth_1.auth, auth_1.isAdmin, correiosController.testarConexao);
router.get('/status-integracao', auth_1.auth, auth_1.isAdmin, correiosController.verificarStatusIntegracao);
router.get('/historico-job', auth_1.auth, auth_1.isAdmin, correiosController.obterHistoricoJob);
// Rotas públicas
router.get('/status', correiosController.statusPublico);
router.get('/rastrear/:codigoRastreio', correiosController.rastrearObjeto);
exports.default = router;
