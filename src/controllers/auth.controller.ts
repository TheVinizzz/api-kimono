import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import config from '../config';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email já está em uso' });
      return;
    }

    // Criptografar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Criar o usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'CUSTOMER' // Papel padrão
      }
    });

    // Gerar token JWT - use jwt.sign diretamente com os valores corretos
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      String(config.jwt.secret),
      { expiresIn: '7d' }
    );

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
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    // Buscar o usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Verificar a senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Gerar token JWT - use jwt.sign diretamente com os valores corretos
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      String(config.jwt.secret),
      { expiresIn: '7d' }
    );

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
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    // O middleware de autenticação já verificou o token
    // e anexou as informações do usuário à requisição
    if (!req.user) {
      res.status(401).json({ error: 'Não autorizado' });
      return;
    }

    // Buscar informações atualizadas do usuário
    const user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
};

// Implementação do logout
export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    // No lado do servidor, o logout é simplesmente retornar uma resposta de sucesso
    // O token JWT será invalidado no cliente (removendo-o do armazenamento)
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
};

// Rota de debug para verificar autenticação (somente para ambiente de desenvolvimento)
export const debugAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Apenas retorna informações do usuário autenticado
    const response: any = {
      user: req.user || null,
      serverTime: new Date().toISOString()
    };

    // Se houver cabeçalho de autorização, também retorna-o
    const authHeader = req.headers.authorization;
    if (authHeader) {
      response.authHeader = authHeader;
    }

    res.json(response);
  } catch (error) {
    console.error('Erro na rota de debug:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
}; 