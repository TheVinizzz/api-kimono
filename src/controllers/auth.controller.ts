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

// Solicitar reset de senha
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email é obrigatório' });
      return;
    }

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Por segurança, retornar sucesso mesmo se o usuário não existir
      res.json({ message: 'Se o email existir em nosso sistema, você receberá instruções para resetar sua senha' });
      return;
    }

    // Gerar token de reset (válido por 1 hora)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      String(config.jwt.secret),
      { expiresIn: '1h' }
    );

    // Importar o email service
    const emailService = (await import('../services/email.service')).default;

    // Enviar email de reset
    const emailSent = await emailService.sendPasswordResetEmail({
      userEmail: user.email,
      userName: user.name || 'Usuário',
      resetToken
    });

    if (emailSent) {
      res.json({ message: 'Instruções para resetar sua senha foram enviadas para seu email' });
    } else {
      res.status(500).json({ error: 'Erro ao enviar email. Tente novamente mais tarde.' });
    }
  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
};

// Resetar senha com token
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
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
    let decoded: any;
    try {
      decoded = jwt.verify(token, String(config.jwt.secret));
    } catch (error) {
      res.status(400).json({ error: 'Token inválido ou expirado' });
      return;
    }

    if (decoded.type !== 'password_reset') {
      res.status(400).json({ error: 'Token inválido' });
      return;
    }

    // Buscar o usuário
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Criptografar a nova senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Atualizar a senha
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
};

// Validar token de reset de senha
export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token é obrigatório' });
      return;
    }

    // Verificar e decodificar o token
    try {
      const decoded = jwt.verify(token, String(config.jwt.secret)) as any;
      
      if (decoded.type !== 'password_reset') {
        res.status(400).json({ error: 'Token inválido' });
        return;
      }

      // Verificar se o usuário ainda existe
      const user = await prisma.user.findUnique({
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
    } catch (error) {
      res.status(400).json({ error: 'Token inválido ou expirado' });
    }
  } catch (error) {
    console.error('Erro ao validar token de reset:', error);
    res.status(500).json({ error: 'Erro ao processar a solicitação' });
  }
};

// Resetar senha por admin (para a funcionalidade do admin)
export const adminResetPassword = async (req: Request, res: Response): Promise<void> => {
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
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Gerar token de reset (válido por 1 hora)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password_reset' },
      String(config.jwt.secret),
      { expiresIn: '1h' }
    );

    // Importar o email service
    const emailService = (await import('../services/email.service')).default;

    // Enviar email de reset
    const emailSent = await emailService.sendPasswordResetEmail({
      userEmail: user.email,
      userName: user.name || 'Usuário',
      resetToken
    });

    if (emailSent) {
      res.json({ message: `Email de reset de senha enviado para ${user.email}` });
    } else {
      res.status(500).json({ error: 'Erro ao enviar email. Tente novamente mais tarde.' });
    }
  } catch (error) {
    console.error('Erro ao resetar senha via admin:', error);
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