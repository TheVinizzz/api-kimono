import { Request, Response } from 'express';
import { z } from 'zod';
import shippingService from '../services/shipping.service';

// Schema de validação para cálculo de frete
const shippingCalculationSchema = z.object({
  cepDestino: z.string().min(8).max(9),
  peso: z.number().positive().optional().default(0.8),
  valor: z.number().positive(),
  cepOrigem: z.string().min(8).max(9).optional()
});

// Schema de validação para cálculo de frete detalhado
const detailedShippingSchema = z.object({
  cepOrigem: z.string().min(8).max(9).optional(), // Agora opcional - busca das configurações se não fornecido
  cepDestino: z.string().min(8).max(9),
  peso: z.number().positive(),
  formato: z.number().int().min(1).max(3), // 1 = caixa, 2 = rolo, 3 = envelope
  comprimento: z.number().positive(),
  altura: z.number().positive(),
  largura: z.number().positive(),
  diametro: z.number().optional().default(0),
  valorDeclarado: z.number().optional().default(0),
  maoPropria: z.boolean().optional().default(false),
  avisoRecebimento: z.boolean().optional().default(false)
});

/**
 * Calcula frete para um produto (método simplificado)
 */
export const calculateProductShipping = async (req: Request, res: Response) => {
  try {
    const validation = shippingCalculationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validation.error.format()
      });
    }

    const { cepDestino, peso, valor, cepOrigem } = validation.data;

    const result = await shippingService.calculateProductShipping(
      cepDestino,
      peso,
      valor,
      cepOrigem
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Erro ao calcular frete'
      });
    }

    // Formatar resposta para o frontend
    const formattedOptions = result.options.map(option => ({
      name: option.nome,
      price: option.valor,
      days: option.prazoEntrega,
      description: `Entrega via ${option.nome}`,
      type: option.nome.toLowerCase().includes('sedex') ? 'express' : 'economic',
      codigo: option.codigo
    }));

    return res.json({
      success: true,
      options: formattedOptions,
      cepDestino,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no controller de frete:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Calcula frete com parâmetros detalhados
 */
export const calculateDetailedShipping = async (req: Request, res: Response) => {
  try {
    const validation = detailedShippingSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validation.error.format()
      });
    }

    const { cepDestino, peso, comprimento, altura, largura, valorDeclarado, cepOrigem } = validation.data;

    // Buscar CEP de origem das configurações se não fornecido
    let originZipCode = cepOrigem;
    if (!originZipCode) {
      try {
        const { getOriginZipCode } = await import('../controllers/settings.controller');
        originZipCode = await getOriginZipCode();
      } catch (error) {
        console.error('Erro ao buscar CEP de origem:', error);
        originZipCode = '01310-100'; // Fallback
      }
    }

    // Garantir que temos todos os campos obrigatórios
    const shippingParams = {
      ...validation.data,
      cepOrigem: originZipCode
    };

    const result = await shippingService.calculateShipping(shippingParams);

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Erro ao calcular frete'
      });
    }

    // Formatar resposta para o frontend
    const formattedOptions = result.options.map(option => ({
      name: option.nome,
      price: option.valor,
      days: option.prazoEntrega,
      description: `Entrega via ${option.nome}`,
      type: option.nome.toLowerCase().includes('sedex') ? 'express' : 'economic',
      codigo: option.codigo
    }));

    return res.json({
      success: true,
      options: formattedOptions,
      cepDestino,
      shippingInfo: {
        peso,
        dimensoes: `${comprimento}x${largura}x${altura} cm`,
        valorDeclarado
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no controller de frete detalhado:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Endpoint para verificar se um CEP é válido
 */
export const validateCEP = async (req: Request, res: Response) => {
  try {
    const { cep } = req.params;
    
    if (!cep) {
      return res.status(400).json({
        error: 'CEP é obrigatório'
      });
    }

    const cleanCEP = cep.replace(/\D/g, '');
    const isValid = /^\d{8}$/.test(cleanCEP);

    return res.json({
      cep: cep,
      cleanCEP: cleanCEP,
      isValid: isValid,
      formatted: isValid ? `${cleanCEP.slice(0, 5)}-${cleanCEP.slice(5)}` : null
    });

  } catch (error) {
    console.error('Erro ao validar CEP:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
}; 