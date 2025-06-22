"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = __importDefault(require("../config"));
const prisma_1 = __importDefault(require("../config/prisma"));
const auth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar o header de autorização
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Acesso não autorizado' });
            return;
        }
        const token = authHeader.split(' ')[1];
        // Verificar e decodificar o token
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret);
        // Verificar se o usuário existe
        const user = yield prisma_1.default.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!user) {
            res.status(401).json({ error: 'Usuário não encontrado' });
            return;
        }
        // Adicionar informações do usuário à requisição
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        next();
    }
    catch (error) {
        console.error('Erro de autenticação:', error);
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
});
exports.auth = auth;
// Middleware para verificar se o usuário é administrador
const isAdmin = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ error: 'Acesso não autorizado' });
        return;
    }
    if (req.user.role !== 'ADMIN') {
        res.status(403).json({ error: 'Acesso restrito a administradores' });
        return;
    }
    next();
};
exports.isAdmin = isAdmin;
