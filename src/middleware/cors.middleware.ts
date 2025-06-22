import { Request, Response, NextFunction } from 'express';

/**
 * Middleware avançado para lidar com CORS (Cross-Origin Resource Sharing).
 * Adiciona todos os cabeçalhos necessários para permitir requisições de qualquer origem.
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Permitir requisições de qualquer origem
  res.header('Access-Control-Allow-Origin', '*');
  
  // Permitir todos os métodos HTTP
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
  
  // Permitir todos os cabeçalhos - incluindo API-Key que é usado
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization, Origin, Cache-Control, Pragma, Api-Key, X-API-Key');
  
  // Permitir cookies em requisições cross-origin (falso por segurança)
  res.header('Access-Control-Allow-Credentials', 'false');
  
  // Definir o tempo de cache para preflight (OPTIONS)
  res.header('Access-Control-Max-Age', '86400'); // 24 horas
  
  // Expor cabeçalhos específicos
  res.header('Access-Control-Expose-Headers', 'Content-Length, X-Pagination');
  
  // Para requisições OPTIONS, apenas retorne 200 OK
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}; 