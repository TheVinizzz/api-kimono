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

// Logging de requisições apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Rotas de saúde primeiro (para health checks) - resposta mais rápida
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Rota raiz também para health check
app.get('/', (_req, res) => {
  res.status(200).json({ 
    message: 'Kimono API is running',
    status: 'ok'
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

// Variável para controlar shutdown
let isShuttingDown = false;

// Função para graceful shutdown mais agressiva para EasyPanel
const gracefulShutdown = (signal: string) => {
  if (isShuttingDown) {
    console.log('Shutdown já em andamento...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`Recebido sinal ${signal}. Iniciando graceful shutdown...`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        console.error('Erro durante o shutdown:', err);
      } else {
        console.log('Servidor fechado com sucesso');
      }
      process.exit(0);
    });
    
    // Forçar shutdown após 5 segundos (mais rápido para EasyPanel)
    setTimeout(() => {
      console.log('Forçando shutdown após timeout');
      process.exit(0);
    }, 5000);
  } else {
    process.exit(0);
  }
};

// Tratar sinais de terminação
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Em produção, não fazer shutdown por erros menores
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (process.env.NODE_ENV === 'production') {
    console.error('Continuando execução em produção...');
  } else {
    gracefulShutdown('uncaughtException');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    console.error('Continuando execução em produção...');
  } else {
    gracefulShutdown('unhandledRejection');
  }
});

// Iniciar o servidor
const PORT = Number(process.env.PORT) || Number(config.port) || 4000;

console.log(`🚀 Iniciando servidor na porta ${PORT}...`);
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Escutando em 0.0.0.0:${PORT}`);
  console.log(`💾 Memória inicial: ${JSON.stringify(process.memoryUsage())}`);
});

// Configurar timeout para keep-alive
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Middleware para detectar se EasyPanel está fazendo health checks frequentes
let healthCheckCount = 0;
app.use('/health', (_req, res, next) => {
  healthCheckCount++;
  if (healthCheckCount % 10 === 0) {
    console.log(`🩺 Health check #${healthCheckCount}`);
  }
  next();
}); 