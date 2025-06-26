"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Carrega as variáveis de ambiente do arquivo .env
dotenv_1.default.config();
exports.default = {
    // Configurações do servidor
    port: process.env.PORT || 4000,
    // Configurações de CORS
    corsOrigin: process.env.CORS_ORIGIN || '*',
    // Configurações JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'sua_chave_secreta_para_jwt',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    // Configurações Mercado Pago
    mercadopago: {
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-570696923866039-062320-0c0cce673b6260f95c955dc5f90d7b69-452258214',
        publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || 'TEST-07005224-3e87-43cb-849c-fa1ce90add06',
        environment: process.env.MERCADOPAGO_ENVIRONMENT || 'sandbox', // 'sandbox' ou 'production'
        apiUrl: process.env.MERCADOPAGO_API_URL || 'https://api.mercadopago.com',
    },
    // Configurações Asaas (manter para compatibilidade durante migração)
    asaas: {
        apiKey: process.env.ASAAS_API_KEY || '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmNhMzEzMDYxLTJmOGMtNDgzNi1hYTExLWIwODNiOTk4MWJhYzo6JGFhY2hfYjk0NDExZTItOGQ4NC00OTE0LWFlN2QtMTAzYjkwN2RmZjkx',
        walletId: process.env.ASAAS_WALLET_ID || '49454a3b-e967-4541-9b77-db1a63825f90',
        environment: process.env.ASAAS_ENVIRONMENT || 'production', // 'sandbox' ou 'production'
        apiUrl: process.env.ASAAS_API_URL || 'https://api.asaas.com',
    },
    // Configurações Bling
    bling: {
        clientId: process.env.BLING_CLIENT_ID || '',
        clientSecret: process.env.BLING_CLIENT_SECRET || '',
        accessToken: process.env.BLING_ACCESS_TOKEN || '',
        refreshToken: process.env.BLING_REFRESH_TOKEN || '',
        environment: process.env.BLING_ENVIRONMENT || 'production', // 'sandbox' ou 'production'
        apiUrl: process.env.BLING_API_URL || 'https://api.bling.com.br',
        webhookSecret: process.env.BLING_WEBHOOK_SECRET || '',
    },
    // Outras configurações...
};
