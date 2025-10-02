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
exports.debugAuth = exports.adminResetPassword = exports.validateResetToken = exports.resetPassword = exports.requestPasswordReset = exports.logout = exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../config/prisma"));
const config_1 = __importDefault(require("../config"));
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        // Validação básica
        if (!email || !password) {
            res.status(400).json({ error: 'Email e senha são obrigatórios' });
            return;
        }
        // Verificar se o usuário já existe
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(400).json({ error: 'Email já está em uso' });
            return;
        }
        // Criptografar a senha
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        // Criar o usuário
        const user = yield prisma_1.default.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'CUSTOMER' // Papel padrão
            }
        });
        // Gerar token JWT - use jwt.sign diretamente com os valores corretos
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, String(config_1.default.jwt.secret), { expiresIn: '7d' });
        // Retornar dados do usuário (exceto a senha) e o token
        res.status(201).json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });
    }
    catch (error) {
        console.error('Erro ao registrar usuário:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Validação básica
        if (!email || !password) {
            res.status(400).json({ error: 'Email e senha são obrigatórios' });
            return;
        }
        // Buscar o usuário pelo email
        const user = yield prisma_1.default.user.findUnique({
            where: { email }
        });
        if (!user) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }
        // Verificar a senha
        const isPasswordValid = yield bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }
        // Gerar token JWT - use jwt.sign diretamente com os valores corretos
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, String(config_1.default.jwt.secret), { expiresIn: '7d' });
        // Retornar dados do usuário (exceto a senha) e o token
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token
        });
    }
    catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});
exports.login = login;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // O middleware de autenticação já verificou o token
        // e anexou as informações do usuário à requisição
        if (!req.user) {
            res.status(401).json({ error: 'Não autorizado' });
            return;
        }
        // Buscar informações atualizadas do usuário
        const user = yield prisma_1.default.user.findUnique({
            where: { id: req.user.id }
        });
        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }
        // Retornar dados do usuário (exceto a senha)
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        });
    }
    catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});
exports.getMe = getMe;
// Implementação do logout
const logout = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // No lado do servidor, o logout é simplesmente retornar uma resposta de sucesso
        // O token JWT será invalidado no cliente (removendo-o do armazenamento)
        res.json({ message: 'Logout realizado com sucesso' });
    }
    catch (error) {
        console.error('Erro ao fazer logout:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});
exports.logout = logout;
// Solicitar reset de senha
const requestPasswordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email é obrigatório' });
            return;
        }
        // Verificar se o usuário existe
        const user = yield prisma_1.default.user.findUnique({
            where: { email }
        });
        if (!user) {
            // Por segurança, retornar sucesso mesmo se o usuário não existir
            res.json({ message: 'Se o email existir em nosso sistema, você receberá instruções para resetar sua senha' });
            return;
        }
        // Gerar token de reset (válido por 1 hora)
        const resetToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, type: 'password_reset' }, String(config_1.default.jwt.secret), { expiresIn: '1h' });
        // Importar o email service
        const emailService = (yield Promise.resolve().then(() => __importStar(require('../services/email.service')))).default;
        // Enviar email de reset
        const emailSent = yield emailService.sendPasswordResetEmail({
            userEmail: user.email,
            userName: user.name || 'Usuário',
            resetToken
        });
        if (emailSent) {
            res.json({ message: 'Instruções para resetar sua senha foram enviadas para seu email' });
        }
        else {
            res.status(500).json({ error: 'Erro ao enviar email. Tente novamente mais tarde.' });
        }
    }
    catch (error) {
        console.error('Erro ao solicitar reset de senha:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});
exports.requestPasswordReset = requestPasswordReset;
// Resetar senha com token
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
            return;
        }
        // Verificar e decodificar o token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, String(config_1.default.jwt.secret));
        }
        catch (error) {
            res.status(400).json({ error: 'Token inválido ou expirado' });
            return;
        }
        if (decoded.type !== 'password_reset') {
            res.status(400).json({ error: 'Token inválido' });
            return;
        }
        // Buscar o usuário
        const user = yield prisma_1.default.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }
        // Criptografar a nova senha
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, salt);
        // Atualizar a senha
        yield prisma_1.default.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Senha alterada com sucesso' });
    }
    catch (error) {
        console.error('Erro ao resetar senha:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});
exports.resetPassword = resetPassword;
// Validar token de reset de senha
const validateResetToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ error: 'Token é obrigatório' });
            return;
        }
        // Verificar e decodificar o token
        try {
            const decoded = jsonwebtoken_1.default.verify(token, String(config_1.default.jwt.secret));
            if (decoded.type !== 'password_reset') {
                res.status(400).json({ error: 'Token inválido' });
                return;
            }
            // Verificar se o usuário ainda existe
            const user = yield prisma_1.default.user.findUnique({
                where: { id: decoded.userId }
            });
            if (!user) {
                res.status(400).json({ error: 'Usuário não encontrado' });
                return;
            }
            res.json({
                valid: true,
                message: 'Token válido',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name
                }
            });
        }
        catch (error) {
            res.status(400).json({ error: 'Token inválido ou expirado' });
        }
    }
    catch (error) {
        console.error('Erro ao validar token de reset:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});
exports.validateResetToken = validateResetToken;
// Resetar senha por admin (para a funcionalidade do admin)
const adminResetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verificar se o usuário é admin
        if (!req.user || req.user.role !== 'ADMIN') {
            res.status(403).json({ error: 'Acesso restrito a administradores' });
            return;
        }
        const { userId } = req.params;
        if (!userId) {
            res.status(400).json({ error: 'ID do usuário é obrigatório' });
            return;
        }
        // Buscar o usuário
        const user = yield prisma_1.default.user.findUnique({
            where: { id: parseInt(userId) }
        });
        if (!user) {
            res.status(404).json({ error: 'Usuário não encontrado' });
            return;
        }
        // Gerar token de reset (válido por 1 hora)
        const resetToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, type: 'password_reset' }, String(config_1.default.jwt.secret), { expiresIn: '1h' });
        // Importar o email service
        const emailService = (yield Promise.resolve().then(() => __importStar(require('../services/email.service')))).default;
        // Enviar email de reset
        const emailSent = yield emailService.sendPasswordResetEmail({
            userEmail: user.email,
            userName: user.name || 'Usuário',
            resetToken
        });
        if (emailSent) {
            res.json({ message: `Email de reset de senha enviado para ${user.email}` });
        }
        else {
            res.status(500).json({ error: 'Erro ao enviar email. Tente novamente mais tarde.' });
        }
    }
    catch (error) {
        console.error('Erro ao resetar senha via admin:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});
exports.adminResetPassword = adminResetPassword;
// Rota de debug para verificar autenticação (somente para ambiente de desenvolvimento)
const debugAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Apenas retorna informações do usuário autenticado
        const response = {
            user: req.user || null,
            serverTime: new Date().toISOString()
        };
        // Se houver cabeçalho de autorização, também retorna-o
        const authHeader = req.headers.authorization;
        if (authHeader) {
            response.authHeader = authHeader;
        }
        res.json(response);
    }
    catch (error) {
        console.error('Erro na rota de debug:', error);
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});
exports.debugAuth = debugAuth;
