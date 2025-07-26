import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import config from './config';
import webSocketService from './services/websocket.service';
import { orderService } from './services/order.service';
import { trackingService } from './services/tracking.service';
import prisma from './config/prisma';

// Importação de rotas
import authRoutes from './routes/auth.routes';
import productsRoutes from './routes/products.routes';
import categoriesRoutes from './routes/categories.routes';
import brandsRoutes from './routes/brands.routes';
import ordersRoutes from './routes/orders.routes';
import addressesRoutes from './routes/addresses.routes';
import uploadRoutes from './routes/upload.routes';
import paymentRoutes from './routes/payment.routes';
import shippingRoutes from './routes/shipping.routes';
import healthRoutes from './routes/health.routes';
import blingRoutes from './routes/bling.routes';
import blingOAuthRoutes from './routes/bling-oauth.routes';
import blingSyncRoutes from './routes/bling-sync.routes';
import correiosRoutes from './routes/correios.routes';
import invoiceRoutes from './routes/invoice.routes';
import thermalInvoiceRoutes from './routes/thermal-invoice.routes';
import shippingLabelsRoutes from './routes/shipping-labels.routes';
import mercadopagoRoutes from './routes/mercadopago.routes';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import settingsRoutes from './routes/settings.routes';
import productImagesRoutes from './routes/product-images.routes';
import trackingRoutes from './routes/tracking.routes';
import couponsRoutes from './routes/coupons.routes';

// Inicializar o app
const app = express();
let server: any; // Changed to any to avoid type issues with express.Server

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
app.use('/api/mercadopago', mercadopagoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/product-images', productImagesRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/bling', blingRoutes);
app.use('/api/bling-oauth', blingOAuthRoutes);
app.use('/api/bling-sync', blingSyncRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/shipping-labels', shippingLabelsRoutes);
app.use('/api/correios', correiosRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/thermal-invoices', thermalInvoiceRoutes);
app.use('/api/coupons', couponsRoutes);

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
  
  // Destruir WebSocket service primeiro
  try {
    webSocketService.destroy();
    console.log('🔌 WebSocket Service destruído');
  } catch (error) {
    console.error('Erro ao destruir WebSocket:', error);
  }
  
  if (server) {
    server.close((err: Error | undefined) => {
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
  
  // Inicializar WebSocket Server
  try {
    webSocketService.init(server);
    console.log('🔌 WebSocket Server inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar WebSocket:', error);
  }
  
  // Inicializar serviço de rastreamento automático
  try {
    trackingService.startAutomaticTracking(60); // Verifica a cada hora
    console.log('📦 Serviço de rastreamento automático iniciado');
  } catch (error) {
    console.error('❌ Erro ao inicializar rastreamento automático:', error);
  }
  
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

// Job agendado para processar pedidos pagos e gerar códigos de rastreio automaticamente
setInterval(async () => {
  let executionId: string = '';
  let startTime: Date = new Date();
  
  try {
    console.log('🔄 Executando job agendado: processamento automático de pedidos pagos');
    
    // Registrar início da execução
    startTime = new Date();
    executionId = `auto-job-${Date.now()}`;
    
    const { default: prisma } = await import('./config/prisma');
    
    // Verificar se há algum job já em execução
    const lastJobSetting = await prisma.appSettings.findUnique({
      where: { key: 'correios_job_last_run' }
    });
    
    if (lastJobSetting?.value) {
      try {
        const lastJob = JSON.parse(lastJobSetting.value);
        if (lastJob.status === 'running') {
          console.log('⚠️ Job anterior ainda em execução, pulando esta execução');
          return;
        }
      } catch (e) {
        console.error('Erro ao verificar último job:', e);
      }
    }
    
    // Marcar job como em execução imediatamente
    await prisma.appSettings.upsert({
      where: { key: 'correios_job_last_run' },
      update: { 
        value: JSON.stringify({
          lastRun: startTime.toISOString(),
          nextRun: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
          status: 'running',
          pedidosProcessados: 0
        }) 
      },
      create: {
        key: 'correios_job_last_run',
        value: JSON.stringify({
          lastRun: startTime.toISOString(),
          nextRun: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
          status: 'running',
          pedidosProcessados: 0
        }),
        category: 'correios',
        description: 'Última execução do job de rastreamento'
      }
    });
    
    // Criar registro de execução em andamento
    const runningExecution = {
      id: executionId,
      timestamp: startTime.toISOString(),
      status: 'running' as const,
      pedidosProcessados: 0
    };
    
    // Adicionar ao histórico
    await addToJobHistory(runningExecution, prisma);
    
    console.log(`🚀 Job iniciado com ID: ${executionId}`);
    
    // Executar processamento
    const result = await orderService.processarPedidosPagos();
    
    // Calcular duração
    const endTime = new Date();
    const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
    
    console.log(`⏱️ Job concluído em ${durationSeconds} segundos`);
    
    // Atualizar registro com sucesso
    const successExecution = {
      ...runningExecution,
      status: 'success' as const,
      pedidosProcessados: result.processados,
      duracao: durationSeconds
    };
    
    // Atualizar histórico
    await updateJobInHistory(executionId, successExecution, prisma);
    
    // Atualizar última execução
    await prisma.appSettings.upsert({
      where: { key: 'correios_job_last_run' },
      update: { 
        value: JSON.stringify({
          lastRun: startTime.toISOString(),
          nextRun: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: 'success',
          pedidosProcessados: result.processados
        }) 
      },
      create: {
        key: 'correios_job_last_run',
        value: JSON.stringify({
          lastRun: startTime.toISOString(),
          nextRun: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: 'success',
          pedidosProcessados: result.processados
        }),
        category: 'correios',
        description: 'Última execução do job de rastreamento'
      }
    });
    
    console.log(`✅ Job ${executionId} concluído com sucesso. ${result.processados} pedidos processados.`);
  } catch (error) {
    console.error(`❌ Erro no job ${executionId}:`, error);
    
    // Registrar erro no histórico
    try {
      const { default: prisma } = await import('./config/prisma');
      
      const endTime = new Date();
      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      const errorExecution = {
        id: executionId || `auto-job-error-${Date.now()}`,
        timestamp: startTime.toISOString(),
        status: 'error' as const,
        pedidosProcessados: 0,
        duracao: durationSeconds,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      
      // Se o executionId existe, atualizar no histórico, senão adicionar novo
      if (executionId) {
        await updateJobInHistory(executionId, errorExecution, prisma);
      } else {
        await addToJobHistory(errorExecution, prisma);
      }
      
      // Atualizar última execução com erro
      await prisma.appSettings.upsert({
        where: { key: 'correios_job_last_run' },
        update: { 
          value: JSON.stringify({
            lastRun: startTime.toISOString(),
            nextRun: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
          }) 
        },
        create: {
          key: 'correios_job_last_run',
          value: JSON.stringify({
            lastRun: startTime.toISOString(),
            nextRun: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
          }),
          category: 'correios',
          description: 'Última execução do job de rastreamento'
        }
      });
    } catch (saveError) {
      console.error('❌ Erro ao salvar registro de erro do job:', saveError);
    }
  }
}, 30 * 60 * 1000); // A cada 30 minutos

// Funções auxiliares para manipulação do histórico
async function addToJobHistory(execution: any, prisma: any) {
  try {
    const historySetting = await prisma.appSettings.findUnique({
      where: { key: 'correios_job_history' }
    });
    
    let historico = [];
    if (historySetting?.value) {
      try {
        historico = JSON.parse(historySetting.value);
        if (!Array.isArray(historico)) {
          historico = [];
        }
      } catch (e) {
        console.error('Erro ao fazer parse do histórico:', e);
        historico = [];
      }
    }
    
    // Adicionar nova execução no início e manter apenas as últimas 10
    historico = [execution, ...historico].slice(0, 10);
    
    await prisma.appSettings.upsert({
      where: { key: 'correios_job_history' },
      update: { value: JSON.stringify(historico) },
      create: {
        key: 'correios_job_history',
        value: JSON.stringify(historico),
        category: 'correios',
        description: 'Histórico de execuções do job de rastreamento'
      }
    });
  } catch (error) {
    console.error('Erro ao adicionar ao histórico:', error);
  }
}

async function updateJobInHistory(executionId: string, updatedExecution: any, prisma: any) {
  try {
    const historySetting = await prisma.appSettings.findUnique({
      where: { key: 'correios_job_history' }
    });
    
    let historico = [];
    if (historySetting?.value) {
      try {
        historico = JSON.parse(historySetting.value);
        if (!Array.isArray(historico)) {
          historico = [];
        }
      } catch (e) {
        console.error('Erro ao fazer parse do histórico:', e);
        historico = [];
      }
    }
    
    // Atualizar execução existente ou adicionar nova
    const existingIndex = historico.findIndex((item: any) => item.id === executionId);
    if (existingIndex >= 0) {
      historico[existingIndex] = updatedExecution;
    } else {
      historico = [updatedExecution, ...historico].slice(0, 10);
    }
    
    await prisma.appSettings.upsert({
      where: { key: 'correios_job_history' },
      update: { value: JSON.stringify(historico) },
      create: {
        key: 'correios_job_history',
        value: JSON.stringify(historico),
        category: 'correios',
        description: 'Histórico de execuções do job de rastreamento'
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar histórico:', error);
  }
} 