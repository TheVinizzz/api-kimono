import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import prisma from '../config/prisma';

// Extendendo a interface Request para incluir o usuário
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

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  }
}

export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Verificar o header de autorização
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Acesso não autorizado' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, config.jwt.secret as string) as {
      userId: number;
      email: string;
      role: string;
    };

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error('Erro de autenticação:', error);
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// Middleware para verificar se o usuário é administrador
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
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

// Middleware específico para pagamentos - AUTENTICAÇÃO OBRIGATÓRIA
export const authRequired = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Verificar o header de autorização
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ TENTATIVA DE PAGAMENTO SEM TOKEN:', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      
      res.status(401).json({ 
        error: 'ACESSO_NEGADO',
        message: 'Token de autenticação obrigatório para pagamentos',
        code: 'AUTH_TOKEN_REQUIRED'
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, config.jwt.secret as string) as {
      userId: number;
      email: string;
      role: string;
    };

    // Verificar se o usuário existe no banco
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true }
    });

    if (!user) {
      console.error('❌ TENTATIVA DE PAGAMENTO COM USUÁRIO INEXISTENTE:', {
        userId: decoded.userId,
        email: decoded.email,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      res.status(401).json({ 
        error: 'USUARIO_INVALIDO',
        message: 'Usuário não encontrado. Faça login novamente.',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    // Adicionar informações do usuário à requisição
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    console.log('✅ Usuário autenticado para pagamento:', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    next();
  } catch (error) {
    console.error('❌ ERRO DE AUTENTICAÇÃO EM PAGAMENTO:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.status(401).json({ 
      error: 'TOKEN_INVALIDO',
      message: 'Token inválido ou expirado',
      code: 'INVALID_TOKEN'
    });
  }
}; 