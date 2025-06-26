import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';

const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Verificar conexão com banco de dados
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      mercadopago: 'configured',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

export default router; 