import { Request, Response, NextFunction } from 'express';
import { UAParser } from 'ua-parser-js';

// Lazy loading do Prisma para evitar problemas de inicialização
let prisma: any = null;

const getPrismaClient = async () => {
  if (!prisma) {
    try {
      const { PrismaClient } = await import('@prisma/client');
      prisma = new PrismaClient();
    } catch (error) {
      console.error('Erro ao inicializar Prisma:', error);
      return null;
    }
  }
  return prisma;
};

// Função para extrair o IP real do cliente, considerando proxies
const getIpAddress = (req: Request): string => {
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
const parseUserAgent = (userAgent: string | undefined) => {
  if (!userAgent) return null;
  
  try {
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const device = parser.getDevice();
    const os = parser.getOS();
    
    return {
      browserName: browser.name || 'unknown',
      deviceType: device.type || 'desktop',
      operatingSystem: os.name || 'unknown',
    };
  } catch (error) {
    console.error('Erro ao parsear User-Agent:', error);
    return null;
  }
};

export const trackPageVisit = async (req: Request, res: Response, next: NextFunction) => {
  // Continuar imediatamente sem bloquear
  next();
  
  // Executar analytics de forma assíncrona sem bloquear a resposta
  setImmediate(async () => {
    try {
      // Só rastrear requisições GET de páginas (ignorar assets, API, etc)
      if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.includes('.')) {
        return;
      }

      const prismaClient = await getPrismaClient();
      if (!prismaClient) {
        return; // Falhar silenciosamente se não conseguir conectar
      }
      
      const userAgent = req.headers['user-agent'];
      const referrer = req.headers.referer || req.headers.referrer;
      const ipAddress = getIpAddress(req);
      const sessionId = req.cookies?.sessionId || null;
      
      // Extrair informações do usuário autenticado, se disponível
      const userId = req.user?.id || null;
      
      // Extrair informações do dispositivo
      const deviceInfo = parseUserAgent(userAgent);
      
      // Registrar a visita com timeout
      await Promise.race([
        prismaClient.pageVisit.create({
          data: {
            url: req.protocol + '://' + req.get('host') + req.originalUrl,
            path: req.path,
            userAgent,
            ipAddress,
            referrer: referrer?.toString(),
            userId,
            sessionId,
            deviceType: deviceInfo?.deviceType,
            browserName: deviceInfo?.browserName,
            operatingSystem: deviceInfo?.operatingSystem,
            country: null,
            city: null,
          },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Analytics timeout')), 5000)
        )
      ]);
    } catch (error) {
      // Log do erro mas não afetar a aplicação
      console.error('Erro ao rastrear visita:', error);
    }
  });
}; 