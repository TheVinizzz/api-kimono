import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config';
import { Server } from 'http';

// Importar rotas
import authRoutes from './routes/auth.routes';
import categoriesRoutes from './routes/categories.routes';
import productsRoutes from './routes/products.routes';
import ordersRoutes from './routes/orders.routes';
import adminRoutes from './routes/admin.routes';
import addressesRoutes from './routes/addresses.routes';
import paymentRoutes from './routes/payment.routes';
import analyticsRoutes from './routes/analytics.routes';
import uploadRoutes from './routes/upload.routes';
import productImagesRoutes from './routes/product-images.routes';

// Inicializar o app
const app = express();
let server: Server;

// Configuração CORS unificada e permissiva
app.use(cors({
  origin: '*', // Permitir qualquer origem
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Api-Key', 'Origin', 'Accept', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Pagination'],
  credentials: false,
  maxAge: 86400, // 24 horas em segundos
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Outros middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging de requisições
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Middleware de analytics para rastrear visitas (com tratamento de erro)
app.use(async (req, res, next) => {
  try {
    // Importar dynamicamente para evitar problemas de inicialização
    const { trackPageVisit } = await import('./middleware/analytics.middleware');
    await trackPageVisit(req, res, next);
  } catch (error) {
    console.warn('Erro no analytics middleware:', error);
    next(); // Continuar mesmo se analytics falhar
  }
});

// Rotas de saúde primeiro (para health checks)
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Rota raiz também para health check
app.get('/', (_req, res) => {
  res.status(200).json({ 
    message: 'Kimono API is running',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user/addresses', addressesRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/product-images', productImagesRoutes);

// Middleware para rotas não encontradas
app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware para tratamento de erros
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
};

app.use(errorHandler);

// Função para graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`Recebido sinal ${signal}. Iniciando graceful shutdown...`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        console.error('Erro durante o shutdown:', err);
        process.exit(1);
      }
      console.log('Servidor fechado com sucesso');
      process.exit(0);
    });
    
    // Forçar shutdown após 30 segundos
    setTimeout(() => {
      console.error('Forçando shutdown após timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

// Tratar sinais de terminação
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Tratar exceções não capturadas
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Em produção, não fazer graceful shutdown imediatamente
  if (process.env.NODE_ENV === 'production') {
    console.error('Continuando execução em produção...');
  } else {
    gracefulShutdown('uncaughtException');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Em produção, não fazer graceful shutdown imediatamente
  if (process.env.NODE_ENV === 'production') {
    console.error('Continuando execução em produção...');
  } else {
    gracefulShutdown('unhandledRejection');
  }
});

// Iniciar o servidor
const PORT = Number(process.env.PORT) || Number(config.port) || 4000;
server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`URL da API: http://localhost:${PORT}`);
  console.log(`Memória inicial: ${JSON.stringify(process.memoryUsage())}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Configurar timeout para keep-alive
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000; 