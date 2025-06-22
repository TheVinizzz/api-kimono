"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = __importDefault(require("./config"));
// Importar rotas
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const categories_routes_1 = __importDefault(require("./routes/categories.routes"));
const products_routes_1 = __importDefault(require("./routes/products.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const addresses_routes_1 = __importDefault(require("./routes/addresses.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const product_images_routes_1 = __importDefault(require("./routes/product-images.routes"));
// Importar middleware de analytics
const analytics_middleware_1 = require("./middleware/analytics.middleware");
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
// Logging de requisições
app.use((req, _res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
// Middleware de analytics para rastrear visitas
app.use(analytics_middleware_1.trackPageVisit);
// Rotas - todas usarão o CORS configurado globalmente acima
app.use('/api/auth', auth_routes_1.default);
app.use('/api/categories', categories_routes_1.default);
app.use('/api/products', products_routes_1.default);
app.use('/api/orders', orders_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/user/addresses', addresses_routes_1.default);
app.use('/api/payment', payment_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/upload', upload_routes_1.default);
app.use('/api/product-images', product_images_routes_1.default);
// Rota de saúde para verificação
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
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
// Função para graceful shutdown
const gracefulShutdown = (signal) => {
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
    }
    else {
        process.exit(0);
    }
};
// Tratar sinais de terminação
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Tratar exceções não capturadas
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
// Iniciar o servidor
const PORT = config_1.default.port;
server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`URL da API: http://localhost:${PORT}`);
    console.log(`Memória inicial: ${JSON.stringify(process.memoryUsage())}`);
});
// Configurar timeout para keep-alive
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
