"use strict";
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
const client_1 = require("@prisma/client");
const ua_parser_js_1 = require("ua-parser-js");
const prisma = new client_1.PrismaClient();
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
    const parser = new ua_parser_js_1.UAParser(userAgent);
    const browser = parser.getBrowser();
    const device = parser.getDevice();
    const os = parser.getOS();
    return {
        browserName: browser.name || 'unknown',
        deviceType: device.type || 'desktop',
        operatingSystem: os.name || 'unknown',
    };
};
const trackPageVisit = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Só rastrear requisições GET de páginas (ignorar assets, API, etc)
        if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.includes('.')) {
            const userAgent = req.headers['user-agent'];
            const referrer = req.headers.referer || req.headers.referrer;
            const ipAddress = getIpAddress(req);
            const sessionId = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sessionId) || null;
            // Extrair informações do usuário autenticado, se disponível
            const userId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id) || null;
            // Extrair informações do dispositivo
            const deviceInfo = parseUserAgent(userAgent);
            // Registrar a visita
            yield prisma.pageVisit.create({
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
                    // Adicionar informações geográficas em uma implementação real
                    // Isso exigiria um serviço de geolocalização por IP
                    country: null,
                    city: null,
                },
            });
        }
    }
    catch (error) {
        // Log do erro mas continuar o fluxo normal da requisição
        console.error('Erro ao rastrear visita:', error);
    }
    next();
});
exports.trackPageVisit = trackPageVisit;
