import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    // Obter período dos parâmetros de consulta (padrão: última semana)
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();
    
    // Estatísticas gerais
    const totalVisits = await prisma.pageVisit.count({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    // Páginas mais visitadas
    const pageVisits = await prisma.pageVisit.groupBy({
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
    const deviceTypes = await prisma.pageVisit.groupBy({
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
    const browsers = await prisma.pageVisit.groupBy({
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
    const operatingSystems = await prisma.pageVisit.groupBy({
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
    const referrers = await prisma.pageVisit.groupBy({
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
    let visitsPerHour: Array<{hour: number, count: number}> = [];
    try {
      visitsPerHour = await prisma.$queryRaw`
        SELECT EXTRACT(HOUR FROM timestamp)::integer as hour, COUNT(*)::integer as count
        FROM "PageVisit"
        WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY hour
      `;
    } catch (hourError) {
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
    
  } catch (error) {
    console.error('Erro ao obter estatísticas de visita:', error);
    return res.status(500).json({ error: 'Erro ao obter estatísticas de visita', details: (error as Error).message });
  }
};

// Obter detalhes de uma visita específica
export const getVisitDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const visit = await prisma.pageVisit.findUnique({
      where: { id: Number(id) }
    });
    
    if (!visit) {
      return res.status(404).json({ error: 'Registro de visita não encontrado' });
    }
    
    return res.json(visit);
  } catch (error) {
    console.error('Erro ao obter detalhes da visita:', error);
    return res.status(500).json({ error: 'Erro ao obter detalhes da visita' });
  }
};

// Exportar todas as visitas para um período específico (útil para análise externa)
export const exportVisits = async (req: Request, res: Response) => {
  try {
    // Obter período dos parâmetros de consulta (padrão: último mês)
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();
    
    const visits = await prisma.pageVisit.findMany({
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
  } catch (error) {
    console.error('Erro ao exportar visitas:', error);
    return res.status(500).json({ error: 'Erro ao exportar visitas' });
  }
};

// Novo método para rastrear visitas vindas do frontend
export const trackPageVisit = async (req: Request, res: Response) => {
  try {
    const { path, url, referrer } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'O caminho da página é obrigatório' });
    }
    
    // Extrair informações do User-Agent
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || 
      req.headers['x-forwarded-for'] as string || 
      'unknown';
    
    // Extrair informações do dispositivo
    const deviceInfo = userAgent ? parseUserAgent(userAgent) : null;
    
    // Extrair ID do usuário autenticado, se disponível
    const userId = req.user?.id || null;
    
    // Extrair ID da sessão do cookie, se disponível
    const sessionId = req.cookies?.sessionId || null;
    
    // Registrar a visita
    const visit = await prisma.pageVisit.create({
      data: {
        url: url || `${req.protocol}://${req.get('host')}${path}`,
        path,
        userAgent,
        ipAddress,
        referrer,
        userId,
        sessionId,
        deviceType: deviceInfo?.deviceType,
        browserName: deviceInfo?.browserName,
        operatingSystem: deviceInfo?.operatingSystem,
      },
    });
    
    return res.status(201).json({ success: true, visitId: visit.id });
  } catch (error) {
    console.error('Erro ao rastrear visita:', error);
    return res.status(500).json({ error: 'Erro ao registrar visita' });
  }
};

// Função auxiliar para processar o User-Agent
const parseUserAgent = (userAgent: string) => {
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
  } catch (error) {
    console.error('Erro ao processar User-Agent:', error);
    return {
      browserName: 'unknown',
      deviceType: 'unknown',
      operatingSystem: 'unknown',
    };
  }
}; 