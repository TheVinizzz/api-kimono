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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("./config"));
const websocket_service_1 = __importDefault(require("./services/websocket.service"));
const order_service_1 = require("./services/order.service");
// Importar rotas
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const categories_routes_1 = __importDefault(require("./routes/categories.routes"));
const brands_routes_1 = __importDefault(require("./routes/brands.routes"));
const products_routes_1 = __importDefault(require("./routes/products.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const addresses_routes_1 = __importDefault(require("./routes/addresses.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const mercadopago_routes_1 = __importDefault(require("./routes/mercadopago.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const product_images_routes_1 = __importDefault(require("./routes/product-images.routes"));
const bling_routes_1 = __importDefault(require("./routes/bling.routes"));
const bling_oauth_routes_1 = __importDefault(require("./routes/bling-oauth.routes"));
const bling_sync_routes_1 = __importDefault(require("./routes/bling-sync.routes"));
const shipping_routes_1 = __importDefault(require("./routes/shipping.routes"));
const shipping_labels_routes_1 = __importDefault(require("./routes/shipping-labels.routes"));
const correios_routes_1 = __importDefault(require("./routes/correios.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const invoice_routes_1 = __importDefault(require("./routes/invoice.routes"));
const thermal_invoice_routes_1 = __importDefault(require("./routes/thermal-invoice.routes"));
// Inicializar o app
const app = (0, express_1.default)();
let server;
// Configuração CORS unificada e permissiva
app.use((0, cors_1.default)({
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
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
// Servir arquivos estáticos (imagens de produtos)
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
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
    var _a;
    requestCount++;
    console.log(`📨 ${req.method} ${req.url} | User-Agent: ${((_a = req.get('User-Agent')) === null || _a === void 0 ? void 0 : _a.substring(0, 50)) || 'none'}`);
    next();
});
// Rotas de saúde primeiro (para health checks) - resposta mais rápida
app.get('/health', (_req, res) => {
    healthCheckCount++;
    const uptime = Date.now() - startTime;
    // Log a cada health check para debug
    console.log(`🩺 Health check #${healthCheckCount} | Uptime: ${Math.floor(uptime / 1000)}s`);
    res.status(200).json({
        status: 'ok',
        uptime: Math.floor(uptime / 1000),
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
        uptime: Math.floor((Date.now() - startTime) / 1000),
        env: process.env.NODE_ENV
    });
});
// Rotas da API
app.use('/api/auth', auth_routes_1.default);
app.use('/api/categories', categories_routes_1.default);
app.use('/api/brands', brands_routes_1.default);
app.use('/api/products', products_routes_1.default);
app.use('/api/orders', orders_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/user/addresses', addresses_routes_1.default);
app.use('/api/payment', payment_routes_1.default);
app.use('/api/mercadopago', mercadopago_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/product-images', product_images_routes_1.default);
app.use('/api/bling', bling_routes_1.default);
app.use('/api/bling-oauth', bling_oauth_routes_1.default);
app.use('/api/bling-sync', bling_sync_routes_1.default);
app.use('/api/shipping', shipping_routes_1.default);
app.use('/api/shipping-labels', shipping_labels_routes_1.default);
app.use('/api/correios', correios_routes_1.default);
app.use('/api/settings', settings_routes_1.default);
app.use('/api/invoices', invoice_routes_1.default);
app.use('/api/thermal-invoices', thermal_invoice_routes_1.default);
// Health check da API
app.get('/api/health', (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Importar prisma dinamicamente para evitar erros de inicialização
        const { default: prisma } = yield Promise.resolve().then(() => __importStar(require('./config/prisma')));
        yield prisma.$queryRaw `SELECT 1`;
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
            mercadopago: 'configured',
            version: '1.0.0'
        });
    }
    catch (error) {
        console.error('API Health check failed:', error);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: 'Database connection failed'
        });
    }
}));
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
const errorHandler = (err, _req, res, _next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
};
app.use(errorHandler);
// Variável para controlar shutdown
let isShuttingDown = false;
// Função para graceful shutdown
const gracefulShutdown = (signal) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
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
        websocket_service_1.default.destroy();
        console.log('🔌 WebSocket Service destruído');
    }
    catch (error) {
        console.error('Erro ao destruir WebSocket:', error);
    }
    if (server) {
        server.close((err) => {
            if (err) {
                console.error('Erro durante o shutdown:', err);
            }
            else {
                console.log('Servidor fechado com sucesso');
            }
            process.exit(0);
        });
        // Forçar shutdown após 5 segundos
        setTimeout(() => {
            console.log('Forçando shutdown após timeout');
            process.exit(0);
        }, 5000);
    }
    else {
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
    }
    else {
        gracefulShutdown('uncaughtException');
    }
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    if (process.env.NODE_ENV === 'production') {
        console.error('Continuando execução em produção...');
    }
    else {
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
const PORT = Number(process.env.PORT) || Number(config_1.default.port) || 4000;
server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Escutando em 0.0.0.0:${PORT}`);
    console.log(`💾 Memória inicial: ${JSON.stringify(process.memoryUsage())}`);
    console.log(`⏰ Iniciado em: ${new Date().toISOString()}`);
    // Inicializar WebSocket Server
    try {
        websocket_service_1.default.init(server);
        console.log('🔌 WebSocket Server inicializado com sucesso');
    }
    catch (error) {
        console.error('❌ Erro ao inicializar WebSocket:', error);
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
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const memory = process.memoryUsage();
    console.log(`📊 Status: ${uptime}s uptime | ${requestCount} requests | ${healthCheckCount} health checks | ${Math.floor(memory.rss / 1024 / 1024)}MB RAM`);
}, 60000);
// Job agendado para processar pedidos pagos e gerar códigos de rastreio automaticamente
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🔄 Executando job agendado: processamento automático de pedidos pagos');
        yield order_service_1.orderService.processarPedidosPagos();
        console.log('✅ Job de processamento de pedidos e geração de códigos de rastreio concluído com sucesso');
    }
    catch (error) {
        console.error('❌ Erro ao executar job de processamento de pedidos:', error);
    }
}), 30 * 60 * 1000); // Executar a cada 30 minutos 
