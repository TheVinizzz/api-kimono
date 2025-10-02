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
exports.updateCompanySettings = exports.getCompanySettings = exports.getOriginInfo = exports.getOriginZipCode = exports.getSetting = exports.updateShippingSettings = exports.getShippingSettings = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Schema de validação para configurações
const settingsUpdateSchema = zod_1.z.object({
    shipping_origin_zipcode: zod_1.z.string().min(8).max(9).optional(),
    shipping_origin_name: zod_1.z.string().min(1).max(100).optional(),
    shipping_origin_address: zod_1.z.string().min(1).max(200).optional(),
    shipping_origin_complement: zod_1.z.string().max(100).optional(),
    shipping_origin_neighborhood: zod_1.z.string().min(1).max(100).optional(),
    shipping_origin_city: zod_1.z.string().min(1).max(100).optional(),
    shipping_origin_state: zod_1.z.string().length(2).optional(),
    shipping_origin_phone: zod_1.z.string().min(10).max(20).optional(),
    shipping_origin_email: zod_1.z.string().email().optional(),
    shipping_origin_cnpj: zod_1.z.string().min(14).max(18).optional()
});
// Schema para configurações da empresa
const companySettingsSchema = zod_1.z.object({
    company_name: zod_1.z.string().min(1).max(100).optional(),
    company_whatsapp: zod_1.z.string().min(10).max(20).optional(),
    company_address: zod_1.z.string().min(1).max(200).optional(),
    company_hours: zod_1.z.string().max(100).optional(),
    pickup_instructions: zod_1.z.string().max(500).optional()
});
/**
 * Buscar todas as configurações de frete
 */
const getShippingSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shippingSettings = yield prisma.appSettings.findMany({
            where: {
                category: 'shipping'
            },
            orderBy: {
                key: 'asc'
            }
        });
        // Transformar em objeto para facilitar uso no frontend
        const settings = {};
        shippingSettings.forEach(setting => {
            settings[setting.key] = setting.value;
        });
        return res.json({
            success: true,
            settings
        });
    }
    catch (error) {
        console.error('Erro ao buscar configurações de frete:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.getShippingSettings = getShippingSettings;
/**
 * Atualizar configurações de frete
 */
const updateShippingSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
                const setting = yield prisma.appSettings.upsert({
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
    }
    catch (error) {
        console.error('Erro ao atualizar configurações:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.updateShippingSettings = updateShippingSettings;
/**
 * Buscar configuração específica
 */
const getSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { key } = req.params;
        const setting = yield prisma.appSettings.findUnique({
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
    }
    catch (error) {
        console.error('Erro ao buscar configuração:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.getSetting = getSetting;
/**
 * Obter CEP de origem para cálculos de frete
 */
const getOriginZipCode = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const setting = yield prisma.appSettings.findUnique({
            where: { key: 'shipping_origin_zipcode' }
        });
        return (setting === null || setting === void 0 ? void 0 : setting.value) || '01310-100'; // CEP padrão se não encontrado
    }
    catch (error) {
        console.error('Erro ao buscar CEP de origem:', error);
        return '01310-100'; // CEP padrão em caso de erro
    }
});
exports.getOriginZipCode = getOriginZipCode;
/**
 * Obter todas as informações de origem para frete
 */
const getOriginInfo = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shippingSettings = yield prisma.appSettings.findMany({
            where: {
                category: 'shipping'
            }
        });
        const originInfo = {};
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
    }
    catch (error) {
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
});
exports.getOriginInfo = getOriginInfo;
/**
 * Buscar configurações da empresa
 */
const getCompanySettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companySettings = yield prisma.appSettings.findMany({
            where: {
                category: 'company'
            },
            orderBy: {
                key: 'asc'
            }
        });
        // Transformar em objeto para facilitar uso no frontend
        const settings = {};
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
        const finalSettings = Object.assign(Object.assign({}, defaultSettings), settings);
        return res.json({
            success: true,
            settings: finalSettings
        });
    }
    catch (error) {
        console.error('Erro ao buscar configurações da empresa:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.getCompanySettings = getCompanySettings;
/**
 * Atualizar configurações da empresa
 */
const updateCompanySettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
                yield prisma.appSettings.upsert({
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
    }
    catch (error) {
        console.error('Erro ao atualizar configurações da empresa:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});
exports.updateCompanySettings = updateCompanySettings;
/**
 * Helper para obter descrição das configurações da empresa
 */
function getCompanySettingDescription(key) {
    const descriptions = {
        company_name: 'Nome da empresa',
        company_whatsapp: 'Número do WhatsApp da empresa (com código do país)',
        company_address: 'Endereço completo da empresa',
        company_hours: 'Horário de funcionamento',
        pickup_instructions: 'Instruções para retirada local'
    };
    return descriptions[key] || 'Configuração da empresa';
}
// Helper function para descrições das configurações
function getSettingDescription(key) {
    const descriptions = {
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
