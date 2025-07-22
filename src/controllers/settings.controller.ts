import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Schema de validação para configurações
const settingsUpdateSchema = z.object({
  shipping_origin_zipcode: z.string().min(8).max(9).optional(),
  shipping_origin_name: z.string().min(1).max(100).optional(),
  shipping_origin_address: z.string().min(1).max(200).optional(),
  shipping_origin_complement: z.string().max(100).optional(),
  shipping_origin_neighborhood: z.string().min(1).max(100).optional(),
  shipping_origin_city: z.string().min(1).max(100).optional(),
  shipping_origin_state: z.string().length(2).optional(),
  shipping_origin_phone: z.string().min(10).max(20).optional(),
  shipping_origin_email: z.string().email().optional(),
  shipping_origin_cnpj: z.string().min(14).max(18).optional()
});

// Schema para configurações da empresa
const companySettingsSchema = z.object({
  company_name: z.string().min(1).max(100).optional(),
  company_whatsapp: z.string().min(10).max(20).optional(),
  company_address: z.string().min(1).max(200).optional(),
  company_hours: z.string().max(100).optional(),
  pickup_instructions: z.string().max(500).optional()
});

/**
 * Buscar todas as configurações de frete
 */
export const getShippingSettings = async (req: Request, res: Response) => {
  try {
    const shippingSettings = await prisma.appSettings.findMany({
      where: {
        category: 'shipping'
      },
      orderBy: {
        key: 'asc'
      }
    });

    // Transformar em objeto para facilitar uso no frontend
    const settings: Record<string, string> = {};
    shippingSettings.forEach(setting => {
      settings[setting.key] = setting.value;
    });

    return res.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Erro ao buscar configurações de frete:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Atualizar configurações de frete
 */
export const updateShippingSettings = async (req: Request, res: Response) => {
  try {
    const validation = settingsUpdateSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.format()
      });
    }

    const updates = validation.data;
    const updatedSettings = [];

    // Atualizar cada configuração
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const setting = await prisma.appSettings.upsert({
          where: { key },
          update: {
            value: value.toString(),
            updatedAt: new Date()
          },
          create: {
            key,
            value: value.toString(),
            category: 'shipping',
            description: getSettingDescription(key)
          }
        });
        updatedSettings.push(setting);
      }
    }

    return res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
      updated: updatedSettings.length
    });

  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Buscar configuração específica
 */
export const getSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const setting = await prisma.appSettings.findUnique({
      where: { key }
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Configuração não encontrada'
      });
    }

    return res.json({
      success: true,
      setting
    });

  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Obter CEP de origem para cálculos de frete
 */
export const getOriginZipCode = async (): Promise<string> => {
  try {
    const setting = await prisma.appSettings.findUnique({
      where: { key: 'shipping_origin_zipcode' }
    });

    return setting?.value || '01310-100'; // CEP padrão se não encontrado
  } catch (error) {
    console.error('Erro ao buscar CEP de origem:', error);
    return '01310-100'; // CEP padrão em caso de erro
  }
};

/**
 * Obter todas as informações de origem para frete
 */
export const getOriginInfo = async () => {
  try {
    const shippingSettings = await prisma.appSettings.findMany({
      where: {
        category: 'shipping'
      }
    });

    const originInfo: Record<string, string> = {};
    shippingSettings.forEach(setting => {
      originInfo[setting.key] = setting.value;
    });

    return {
      zipCode: originInfo.shipping_origin_zipcode || '01310-100',
      name: originInfo.shipping_origin_name || 'Kimono Store',
      address: originInfo.shipping_origin_address || 'Rua das Flores, 123',
      complement: originInfo.shipping_origin_complement || '',
      neighborhood: originInfo.shipping_origin_neighborhood || 'Centro',
      city: originInfo.shipping_origin_city || 'São Paulo',
      state: originInfo.shipping_origin_state || 'SP',
      phone: originInfo.shipping_origin_phone || '(11) 99999-9999'
    };
  } catch (error) {
    console.error('Erro ao buscar informações de origem:', error);
    // Retornar valores padrão em caso de erro
    return {
      zipCode: '01310-100',
      name: 'Kimono Store',
      address: 'Rua das Flores, 123',
      complement: '',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      phone: '(11) 99999-9999'
    };
  }
};

/**
 * Buscar configurações da empresa
 */
export const getCompanySettings = async (req: Request, res: Response) => {
  try {
    const companySettings = await prisma.appSettings.findMany({
      where: {
        category: 'company'
      },
      orderBy: {
        key: 'asc'
      }
    });

    // Transformar em objeto para facilitar uso no frontend
    const settings: Record<string, string> = {};
    companySettings.forEach(setting => {
      settings[setting.key] = setting.value;
    });

    // Definir valores padrão se não existirem
    const defaultSettings = {
      company_name: 'Kimono Store - Artes Marciais',
      company_whatsapp: '5511987654321',
      company_address: 'Rua das Artes Marciais, 456 - Vila Olímpia, São Paulo - SP, CEP: 04551-070',
      company_hours: 'Segunda à Sexta: 8h às 19h, Sábado: 8h às 17h, Domingo: 9h às 15h',
      pickup_instructions: 'Para retirada local: 1) Entre em contato via WhatsApp para agendar, 2) Traga documento com foto, 3) Informe o número do pedido na chegada. Estacionamento gratuito disponível.'
    };

    const finalSettings = { ...defaultSettings, ...settings };

    return res.json({
      success: true,
      settings: finalSettings
    });

  } catch (error) {
    console.error('Erro ao buscar configurações da empresa:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Atualizar configurações da empresa
 */
export const updateCompanySettings = async (req: Request, res: Response) => {
  try {
    const validation = companySettingsSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.format()
      });
    }

    const updates = validation.data;

    // Atualizar ou criar cada configuração
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        await prisma.appSettings.upsert({
          where: {
            key: key
          },
          update: {
            value: value,
            updatedAt: new Date()
          },
          create: {
            key: key,
            value: value,
            description: getCompanySettingDescription(key),
            category: 'company'
          }
        });
      }
    }

    return res.json({
      success: true,
      message: 'Configurações da empresa atualizadas com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar configurações da empresa:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

/**
 * Helper para obter descrição das configurações da empresa
 */
function getCompanySettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    company_name: 'Nome da empresa',
    company_whatsapp: 'Número do WhatsApp da empresa (com código do país)',
    company_address: 'Endereço completo da empresa',
    company_hours: 'Horário de funcionamento',
    pickup_instructions: 'Instruções para retirada local'
  };
  
  return descriptions[key] || 'Configuração da empresa';
}

// Helper function para descrições das configurações
function getSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    shipping_origin_zipcode: 'CEP de origem para cálculos de frete',
    shipping_origin_name: 'Nome da empresa remetente',
    shipping_origin_address: 'Endereço da empresa remetente',
    shipping_origin_complement: 'Complemento do endereço da empresa',
    shipping_origin_neighborhood: 'Bairro da empresa remetente',
    shipping_origin_city: 'Cidade da empresa remetente',
    shipping_origin_state: 'Estado da empresa remetente',
    shipping_origin_phone: 'Telefone da empresa remetente',
    shipping_origin_email: 'Email da empresa remetente',
    shipping_origin_cnpj: 'CNPJ da empresa remetente'
  };

  return descriptions[key] || 'Configuração da aplicação';
} 