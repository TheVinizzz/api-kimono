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
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackPageVisit = void 0;
const ua_parser_js_1 = require("ua-parser-js");
// Lazy loading do Prisma para evitar problemas de inicialização
let prisma = null;
const getPrismaClient = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!prisma) {
        try {
            const { PrismaClient } = yield Promise.resolve().then(() => __importStar(require('@prisma/client')));
            prisma = new PrismaClient();
        }
        catch (error) {
            console.error('Erro ao inicializar Prisma:', error);
            return null;
        }
    }
    return prisma;
});
// Função para extrair o IP real do cliente, considerando proxies
const getIpAddress = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // Em alguns casos, pode ser uma lista separada por vírgulas
        return Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor.split(',')[0].trim();
    }
    return req.ip || 'unknown';
};
// Extrai informações do dispositivo a partir do User-Agent
const parseUserAgent = (userAgent) => {
    if (!userAgent)
        return null;
    try {
        const parser = new ua_parser_js_1.UAParser(userAgent);
        const browser = parser.getBrowser();
        const device = parser.getDevice();
        const os = parser.getOS();
        return {
            browserName: browser.name || 'unknown',
            deviceType: device.type || 'desktop',
            operatingSystem: os.name || 'unknown',
        };
    }
    catch (error) {
        console.error('Erro ao parsear User-Agent:', error);
        return null;
    }
};
const trackPageVisit = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Continuar imediatamente sem bloquear
    next();
    // Executar analytics de forma assíncrona sem bloquear a resposta
    setImmediate(() => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            // Só rastrear requisições GET de páginas (ignorar assets, API, etc)
            if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.includes('.')) {
                return;
            }
            const prismaClient = yield getPrismaClient();
            if (!prismaClient) {
                return; // Falhar silenciosamente se não conseguir conectar
            }
            const userAgent = req.headers['user-agent'];
            const referrer = req.headers.referer || req.headers.referrer;
            const ipAddress = getIpAddress(req);
            const sessionId = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sessionId) || null;
            // Extrair informações do usuário autenticado, se disponível
            const userId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || null;
            // Extrair informações do dispositivo
            const deviceInfo = parseUserAgent(userAgent);
            // Registrar a visita com timeout
            yield Promise.race([
                prismaClient.pageVisit.create({
                    data: {
                        url: req.protocol + '://' + req.get('host') + req.originalUrl,
                        path: req.path,
                        userAgent,
                        ipAddress,
                        referrer: referrer === null || referrer === void 0 ? void 0 : referrer.toString(),
                        userId,
                        sessionId,
                        deviceType: deviceInfo === null || deviceInfo === void 0 ? void 0 : deviceInfo.deviceType,
                        browserName: deviceInfo === null || deviceInfo === void 0 ? void 0 : deviceInfo.browserName,
                        operatingSystem: deviceInfo === null || deviceInfo === void 0 ? void 0 : deviceInfo.operatingSystem,
                        country: null,
                        city: null,
                    },
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Analytics timeout')), 5000))
            ]);
        }
        catch (error) {
            // Log do erro mas não afetar a aplicação
            console.error('Erro ao rastrear visita:', error);
        }
    }));
});
exports.trackPageVisit = trackPageVisit;
