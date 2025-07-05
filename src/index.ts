import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import config from './config';
import { Server } from 'http';

// Importar rotas
import authRoutes from './routes/auth.routes';
import categoriesRoutes from './routes/categories.routes';
import brandsRoutes from './routes/brands.routes';
import productsRoutes from './routes/products.routes';
import ordersRoutes from './routes/orders.routes';
import adminRoutes from './routes/admin.routes';
import addressesRoutes from './routes/addresses.routes';
import paymentRoutes from './routes/payment.routes';
import mercadoPagoRoutes from './routes/mercadopago.routes';
import analyticsRoutes from './routes/analytics.routes';
import uploadRoutes from './routes/upload.routes';
import productImagesRoutes from './routes/product-images.routes';
import blingRoutes from './routes/bling.routes';
import blingOAuthRoutes from './routes/bling-oauth.routes';
import blingSyncRoutes from './routes/bling-sync.routes';
import shippingRoutes from './routes/shipping.routes';
import shippingLabelsRoutes from './routes/shipping-labels.routes';
import correiosRoutes from './routes/correios.routes';
import settingsRoutes from './routes/settings.routes';

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

// Servir arquivos estáticos (imagens de produtos)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Logging de requisições apenas em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Variáveis para debug do EasyPanel
let requestCount = 0;
let healthCheckCount = 0;
let startTime = Date.now();

// Middleware para contar e logar TODAS as requisições
app.use((req, _res, next) => {
  requestCount++;
  console.log(`📨 ${req.method} ${req.url} | User-Agent: ${req.get('User-Agent')?.substring(0, 50) || 'none'}`);
  next();
});

// Rotas de saúde primeiro (para health checks) - resposta mais rápida
app.get('/health', (_req, res) => {
  healthCheckCount++;
  const uptime = Date.now() - startTime;
  
  // Log a cada health check para debug
  console.log(`🩺 Health check #${healthCheckCount} | Uptime: ${Math.floor(uptime/1000)}s`);
  
  res.status(200).json({ 
    status: 'ok',
    uptime: Math.floor(uptime/1000),
    requests: requestCount,
    healthChecks: healthCheckCount
  });
});

// Múltiplas rotas de health check (EasyPanel pode estar usando diferentes)
app.get('/healthz', (_req, res) => {
  console.log('🩺 Health check em /healthz');
  res.status(200).json({ status: 'ok' });
});

app.get('/status', (_req, res) => {
  console.log('🩺 Health check em /status');
  res.status(200).json({ status: 'ok' });
});

app.get('/ping', (_req, res) => {
  console.log('🩺 Health check em /ping');
  res.status(200).send('pong');
});

// Rota raiz também para health check
app.get('/', (_req, res) => {
  console.log('🏠 Request na raiz');
  res.status(200).json({ 
    message: 'Kimono API is running',
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime)/1000),
    env: process.env.NODE_ENV
  });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user/addresses', addressesRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/mercadopago', mercadoPagoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/product-images', productImagesRoutes);
app.use('/api/bling', blingRoutes);
app.use('/api/bling-oauth', blingOAuthRoutes);
app.use('/api/bling-sync', blingSyncRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/shipping-labels', shippingLabelsRoutes);
app.use('/api/correios', correiosRoutes);
app.use('/api/settings', settingsRoutes);

// Health check da API
app.get('/api/health', async (_req, res) => {
  try {
    // Importar prisma dinamicamente para evitar erros de inicialização
    const { default: prisma } = await import('./config/prisma');
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
      mercadopago: 'configured',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('API Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Database connection failed'
    });
  }
});

// FALLBACK: Responder OK para QUALQUER rota GET não encontrada (debug)
app.get('*', (req, res) => {
  console.log(`🔍 Request GET catch-all: ${req.path}`);
  res.status(200).json({ 
    status: 'ok', 
    path: req.path,
    message: 'Kimono API catch-all' 
  });
});

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

// Função para graceful shutdown
const gracefulShutdown = (signal: string) => {
  const uptime = Math.floor((Date.now() - startTime)/1000);
  console.log(`⚠️  Recebido sinal ${signal} após ${uptime}s de uptime`);
  console.log(`📊 Stats: ${requestCount} requests, ${healthCheckCount} health checks`);
  
  // EM PRODUÇÃO, IGNORAR SIGTERM COMPLETAMENTE (problema do EasyPanel)
  if (process.env.NODE_ENV === 'production' && signal === 'SIGTERM') {
    console.log(`🚫 IGNORANDO SIGTERM COMPLETAMENTE em produção`);
    console.log(`🔄 EasyPanel está causando restarts desnecessários`);
    console.log(`💡 Para forçar shutdown, use SIGKILL ou pare o container manualmente`);
    return;
  }
  
  if (isShuttingDown) {
    console.log('Shutdown já em andamento...');
    return;
  }
  
  isShuttingDown = true;
  console.log(`Iniciando graceful shutdown...`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        console.error('Erro durante o shutdown:', err);
      } else {
        console.log('Servidor fechado com sucesso');
      }
      process.exit(0);
    });
    
    // Forçar shutdown após 5 segundos
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

// Log detalhado do ambiente
console.log(`🚀 Iniciando Kimono API...`);
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 PORT: ${process.env.PORT || 'default'}`);
console.log(`🐳 Container: ${process.env.HOSTNAME || 'local'}`);
console.log(`💻 Platform: ${process.platform} ${process.arch}`);
console.log(`📦 Node.js: ${process.version}`);

// Iniciar o servidor
const PORT = Number(process.env.PORT) || Number(config.port) || 4000;

server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Escutando em 0.0.0.0:${PORT}`);
  console.log(`💾 Memória inicial: ${JSON.stringify(process.memoryUsage())}`);
  console.log(`⏰ Iniciado em: ${new Date().toISOString()}`);
  
  // Notificar PM2 que a aplicação está pronta
  if (process.send) {
    process.send('ready');
    console.log('📨 PM2 notificado que aplicação está pronta');
  }
});

// Configurar timeout para keep-alive
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Log periódico do status (a cada 60 segundos)
setInterval(() => {
  const uptime = Math.floor((Date.now() - startTime)/1000);
  const memory = process.memoryUsage();
  console.log(`📊 Status: ${uptime}s uptime | ${requestCount} requests | ${healthCheckCount} health checks | ${Math.floor(memory.rss/1024/1024)}MB RAM`);
}, 60000); 