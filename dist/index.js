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
// Importar middleware de analytics
const analytics_middleware_1 = require("./middleware/analytics.middleware");
// Inicializar o app
const app = (0, express_1.default)();
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
app.use(express_1.default.json());
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
// Rota de saúde para verificação
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
// Iniciar o servidor
const PORT = config_1.default.port;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`URL da API: http://localhost:${PORT}`);
});
