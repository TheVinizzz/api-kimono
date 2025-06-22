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
exports.trackPageVisit = exports.exportVisits = exports.getVisitDetails = exports.getAnalytics = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Obter período dos parâmetros de consulta (padrão: última semana)
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : new Date();
        // Estatísticas gerais
        const totalVisits = yield prisma.pageVisit.count({
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });
        // Páginas mais visitadas
        const pageVisits = yield prisma.pageVisit.groupBy({
            by: ['path'],
            _count: {
                id: true
            },
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 10
        });
        // Dispositivos mais utilizados
        const deviceTypes = yield prisma.pageVisit.groupBy({
            by: ['deviceType'],
            _count: {
                id: true
            },
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate
                },
                deviceType: {
                    not: null
                }
            }
        });
        // Navegadores mais utilizados
        const browsers = yield prisma.pageVisit.groupBy({
            by: ['browserName'],
            _count: {
                id: true
            },
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate
                },
                browserName: {
                    not: null
                }
            }
        });
        // Sistemas operacionais
        const operatingSystems = yield prisma.pageVisit.groupBy({
            by: ['operatingSystem'],
            _count: {
                id: true
            },
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate
                },
                operatingSystem: {
                    not: null
                }
            }
        });
        // Referrers (de onde os usuários vieram)
        const referrers = yield prisma.pageVisit.groupBy({
            by: ['referrer'],
            _count: {
                id: true
            },
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate
                },
                referrer: {
                    not: null
                }
            },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            },
            take: 10
        });
        // Estatísticas por hora do dia - versão mais segura
        let visitsPerHour = [];
        try {
            visitsPerHour = yield prisma.$queryRaw `
        SELECT EXTRACT(HOUR FROM timestamp)::integer as hour, COUNT(*)::integer as count
        FROM "PageVisit"
        WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY hour
      `;
        }
        catch (hourError) {
            console.error('Erro ao obter visitas por hora:', hourError);
            // Em caso de erro, tentar uma versão fallback sem estatísticas por hora
            visitsPerHour = [];
        }
        // Retornar dados compilados
        return res.json({
            totalVisits,
            pageVisits,
            deviceTypes,
            browsers,
            operatingSystems,
            referrers,
            visitsPerHour
        });
    }
    catch (error) {
        console.error('Erro ao obter estatísticas de visita:', error);
        return res.status(500).json({ error: 'Erro ao obter estatísticas de visita', details: error.message });
    }
});
exports.getAnalytics = getAnalytics;
// Obter detalhes de uma visita específica
const getVisitDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const visit = yield prisma.pageVisit.findUnique({
            where: { id: Number(id) }
        });
        if (!visit) {
            return res.status(404).json({ error: 'Registro de visita não encontrado' });
        }
        return res.json(visit);
    }
    catch (error) {
        console.error('Erro ao obter detalhes da visita:', error);
        return res.status(500).json({ error: 'Erro ao obter detalhes da visita' });
    }
});
exports.getVisitDetails = getVisitDetails;
// Exportar todas as visitas para um período específico (útil para análise externa)
const exportVisits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Obter período dos parâmetros de consulta (padrão: último mês)
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : new Date();
        const visits = yield prisma.pageVisit.findMany({
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: {
                timestamp: 'desc'
            }
        });
        return res.json(visits);
    }
    catch (error) {
        console.error('Erro ao exportar visitas:', error);
        return res.status(500).json({ error: 'Erro ao exportar visitas' });
    }
});
exports.exportVisits = exportVisits;
// Novo método para rastrear visitas vindas do frontend
const trackPageVisit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { path, url, referrer } = req.body;
        if (!path) {
            return res.status(400).json({ error: 'O caminho da página é obrigatório' });
        }
        // Extrair informações do User-Agent
        const userAgent = req.headers['user-agent'];
        const ipAddress = req.ip ||
            req.headers['x-forwarded-for'] ||
            'unknown';
        // Extrair informações do dispositivo
        const deviceInfo = userAgent ? parseUserAgent(userAgent) : null;
        // Extrair ID do usuário autenticado, se disponível
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null;
        // Extrair ID da sessão do cookie, se disponível
        const sessionId = ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.sessionId) || null;
        // Registrar a visita
        const visit = yield prisma.pageVisit.create({
            data: {
                url: url || `${req.protocol}://${req.get('host')}${path}`,
                path,
                userAgent,
                ipAddress,
                referrer,
                userId,
                sessionId,
                deviceType: deviceInfo === null || deviceInfo === void 0 ? void 0 : deviceInfo.deviceType,
                browserName: deviceInfo === null || deviceInfo === void 0 ? void 0 : deviceInfo.browserName,
                operatingSystem: deviceInfo === null || deviceInfo === void 0 ? void 0 : deviceInfo.operatingSystem,
            },
        });
        return res.status(201).json({ success: true, visitId: visit.id });
    }
    catch (error) {
        console.error('Erro ao rastrear visita:', error);
        return res.status(500).json({ error: 'Erro ao registrar visita' });
    }
});
exports.trackPageVisit = trackPageVisit;
// Função auxiliar para processar o User-Agent
const parseUserAgent = (userAgent) => {
    // Importação dinâmica do ua-parser-js para evitar erro de tipo
    try {
        const UAParser = require('ua-parser-js');
        const parser = new UAParser(userAgent);
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
        console.error('Erro ao processar User-Agent:', error);
        return {
            browserName: 'unknown',
            deviceType: 'unknown',
            operatingSystem: 'unknown',
        };
    }
};
