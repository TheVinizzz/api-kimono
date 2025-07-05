import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

export default {
  // Configurações do servidor
  port: process.env.PORT || 4000,
  
  // Configurações de CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Configurações JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'sua_chave_secreta_para_jwt',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // ✅ CONFIGURAÇÕES MERCADO PAGO PROFISSIONAIS (2025)
  mercadopago: {
    // ⚠️ ATENÇÃO: Configurar credenciais corretas de produção
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-07005224-3e87-43cb-849c-fa1ce90add06',
    publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || 'TEST-570696923866039-062320-0c0cce673b6260f95c955dc5f90d7b69-452258214',
    environment: process.env.MERCADOPAGO_ENVIRONMENT || 'sandbox', // 'sandbox' ou 'production'
    apiUrl: process.env.MERCADOPAGO_API_URL || 'https://api.mercadopago.com',
    
    // ✅ CONFIGURAÇÕES DE SEGURANÇA
    webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET || '4862b799a3bb9fa8fd7ee3b25af593add5631a6af3f5e366564eb8f2e713fce9',
    
    // ✅ CONFIGURAÇÕES DE INTEGRAÇÃO
    integrationId: process.env.MERCADOPAGO_INTEGRATION_ID || 'kimono-store-2025',
    notificationUrl: process.env.MERCADOPAGO_NOTIFICATION_URL || `${process.env.API_URL || 'http://localhost:4000'}/api/mercadopago/webhook`,
    
    // ✅ CONFIGURAÇÕES DE TIMEOUT E RETRY
    timeout: parseInt(process.env.MERCADOPAGO_TIMEOUT || '15000'), // 15 segundos
    maxRetries: parseInt(process.env.MERCADOPAGO_MAX_RETRIES || '3'),
    
    // ✅ CONFIGURAÇÕES DE PAGAMENTO
    defaultCurrency: 'BRL',
    defaultCountry: 'BR',
    maxInstallments: 12,
    
    // ✅ CONFIGURAÇÕES DE PIX
    pixExpirationMinutes: parseInt(process.env.PIX_EXPIRATION_MINUTES || '30'), // 30 minutos
    
    // ✅ CONFIGURAÇÕES DE BOLETO
    boletoExpirationDays: parseInt(process.env.BOLETO_EXPIRATION_DAYS || '3'), // 3 dias
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
    redirectUri: process.env.BLING_REDIRECT_URI || 'http://localhost:3001/callback',
    accessToken: process.env.BLING_ACCESS_TOKEN || '',
    refreshToken: process.env.BLING_REFRESH_TOKEN || '',
    environment: process.env.BLING_ENVIRONMENT || 'production', // 'sandbox' ou 'production'
    apiUrl: process.env.BLING_API_URL || 'https://api.bling.com.br',
    webhookSecret: process.env.BLING_WEBHOOK_SECRET || '',
  },
  
  // ✅ CONFIGURAÇÕES DE EMAIL
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@kimonostore.com',
  },
  
  // ✅ CONFIGURAÇÕES DE UPLOAD
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },
  
  // ✅ CONFIGURAÇÕES DE RATE LIMITING
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutos
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests por janela
  },
  
  // ✅ CONFIGURAÇÕES DE CACHE
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hora
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000'), // 1000 entries
  },
}; 