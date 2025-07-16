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
exports.getOriginInfo = exports.getOriginZipCode = exports.getSetting = exports.updateShippingSettings = exports.getShippingSettings = void 0;
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
