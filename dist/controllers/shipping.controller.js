"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCEP = exports.calculateDetailedShipping = exports.calculateProductShipping = void 0;
const zod_1 = require("zod");
const shipping_service_1 = __importDefault(require("../services/shipping.service"));
// Schema de validação para cálculo de frete
const shippingCalculationSchema = zod_1.z.object({
    cepDestino: zod_1.z.string().min(8).max(9),
    peso: zod_1.z.number().positive().optional().default(0.8),
    valor: zod_1.z.number().positive(),
    cepOrigem: zod_1.z.string().min(8).max(9).optional()
});
// Schema de validação para cálculo de frete detalhado
const detailedShippingSchema = zod_1.z.object({
    cepOrigem: zod_1.z.string().min(8).max(9).optional(), // Agora opcional - busca das configurações se não fornecido
    cepDestino: zod_1.z.string().min(8).max(9),
    peso: zod_1.z.number().positive(),
    formato: zod_1.z.number().int().min(1).max(3), // 1 = caixa, 2 = rolo, 3 = envelope
    comprimento: zod_1.z.number().positive(),
    altura: zod_1.z.number().positive(),
    largura: zod_1.z.number().positive(),
    diametro: zod_1.z.number().optional().default(0),
    valorDeclarado: zod_1.z.number().optional().default(0),
    maoPropria: zod_1.z.boolean().optional().default(false),
    avisoRecebimento: zod_1.z.boolean().optional().default(false)
});
/**
 * Calcula frete para um produto (método simplificado)
 */
const calculateProductShipping = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validation = shippingCalculationSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: 'Dados inválidos',
                details: validation.error.format()
            });
        }
        const { cepDestino, peso, valor, cepOrigem } = validation.data;
        const result = yield shipping_service_1.default.calculateProductShipping(cepDestino, peso, valor, cepOrigem);
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
    }
    catch (error) {
        console.error('Erro no controller de frete:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});
exports.calculateProductShipping = calculateProductShipping;
/**
 * Calcula frete com parâmetros detalhados
 */
const calculateDetailedShipping = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
                const { getOriginZipCode } = yield Promise.resolve().then(() => __importStar(require('../controllers/settings.controller')));
                originZipCode = yield getOriginZipCode();
            }
            catch (error) {
                console.error('Erro ao buscar CEP de origem:', error);
                originZipCode = '01310-100'; // Fallback
            }
        }
        // Garantir que temos todos os campos obrigatórios
        const shippingParams = Object.assign(Object.assign({}, validation.data), { cepOrigem: originZipCode });
        const result = yield shipping_service_1.default.calculateShipping(shippingParams);
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
    }
    catch (error) {
        console.error('Erro no controller de frete detalhado:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});
exports.calculateDetailedShipping = calculateDetailedShipping;
/**
 * Endpoint para verificar se um CEP é válido
 */
const validateCEP = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
    }
    catch (error) {
        console.error('Erro ao validar CEP:', error);
        return res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
});
exports.validateCEP = validateCEP;
