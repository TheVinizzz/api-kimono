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
exports.debugAuth = exports.logout = exports.getMe = exports.login = exports.register = void 0;
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
