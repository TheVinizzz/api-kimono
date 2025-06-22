import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { UAParser } from 'ua-parser-js';

const prisma = new PrismaClient();

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
  
  const parser = new UAParser(userAgent);
  const browser = parser.getBrowser();
  const device = parser.getDevice();
  const os = parser.getOS();
  
  return {
    browserName: browser.name || 'unknown',
    deviceType: device.type || 'desktop',
    operatingSystem: os.name || 'unknown',
  };
};

export const trackPageVisit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Só rastrear requisições GET de páginas (ignorar assets, API, etc)
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.includes('.')) {
      const userAgent = req.headers['user-agent'];
      const referrer = req.headers.referer || req.headers.referrer;
      const ipAddress = getIpAddress(req);
      const sessionId = req.cookies?.sessionId || null;
      
      // Extrair informações do usuário autenticado, se disponível
      const userId = req.user?.id || null;
      
      // Extrair informações do dispositivo
      const deviceInfo = parseUserAgent(userAgent);
      
      // Registrar a visita
      await prisma.pageVisit.create({
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
          // Adicionar informações geográficas em uma implementação real
          // Isso exigiria um serviço de geolocalização por IP
          country: null,
          city: null,
        },
      });
    }
  } catch (error) {
    // Log do erro mas continuar o fluxo normal da requisição
    console.error('Erro ao rastrear visita:', error);
  }
  
  next();
}; 