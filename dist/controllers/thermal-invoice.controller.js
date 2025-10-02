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
exports.updateThermalPrinterConfig = exports.getThermalPrinterConfig = exports.generateBatchThermalInvoices = exports.generateThermalInvoice = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const thermal_invoice_template_1 = require("../templates/thermal-invoice-template");
const qrcode_1 = __importDefault(require("qrcode"));
// Obter dados da empresa (compatível com ThermalInvoiceData)
function getCompanyInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Usar a mesma função que as etiquetas 58mm usam para garantir consistência
            const { getOriginInfo } = yield Promise.resolve().then(() => __importStar(require('./settings.controller')));
            const originInfo = yield getOriginInfo();
            // Buscar dados adicionais de CNPJ e email das configurações
            const additionalSettings = yield prisma_1.default.appSettings.findMany({
                where: {
                    key: {
                        in: ['shipping_origin_cnpj', 'shipping_origin_email']
                    }
                }
            });
            const settingsMap = Object.fromEntries(additionalSettings.map(s => [s.key, s.value]));
            return {
                name: originInfo.name || 'Kimono Store',
                address: originInfo.address || 'Rua das Flores, 123',
                city: originInfo.city || 'São Paulo',
                state: originInfo.state || 'SP',
                zipCode: originInfo.zipCode || '01310-100',
                phone: originInfo.phone || '(11) 99999-9999',
                email: settingsMap['shipping_origin_email'] || 'contato@kimonostore.com',
                cnpj: settingsMap['shipping_origin_cnpj'] || '00.000.000/0001-00'
            };
        }
        catch (error) {
            console.error('Erro ao obter dados da empresa:', error);
            return {
                name: 'Kimono Store',
                address: 'Rua das Flores, 123',
                city: 'São Paulo',
                state: 'SP',
                zipCode: '01310-100',
                phone: '(11) 99999-9999',
                email: 'contato@kimonostore.com',
                cnpj: '00.000.000/0001-00'
            };
        }
    });
}
// Processar endereço de entrega
function parseShippingAddress(shippingAddress) {
    try {
        const parts = shippingAddress.split(',').map(part => part.trim());
        if (parts.length >= 4) {
            return {
                address: `${parts[0]}, ${parts[1]}`,
                city: parts[2] || 'N/A',
                state: parts[3] || 'N/A',
                zipCode: parts[4] || '00000-000'
            };
        }
        return {
            address: shippingAddress,
            city: 'N/A',
            state: 'N/A',
            zipCode: '00000-000'
        };
    }
    catch (error) {
        return {
            address: 'Endereço não informado',
            city: 'N/A',
            state: 'N/A',
            zipCode: '00000-000'
        };
    }
}
// Gerar próximo número de nota fiscal
function getNextInvoiceNumber() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const timestamp = Date.now();
            const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const number = `${timestamp.toString().slice(-3)}${randomPart}`;
            return number.padStart(6, '0');
        }
        catch (error) {
            console.error('Erro ao gerar número da nota fiscal:', error);
            return Date.now().toString().slice(-6);
        }
    });
}
// Função para traduzir método de pagamento
function translatePaymentMethod(method) {
    if (!method)
        return 'Não informado';
    switch (method.toUpperCase()) {
        case 'CREDIT_CARD': return 'Cartão de Crédito';
        case 'PIX': return 'Pix';
        case 'BOLETO': return 'Boleto Bancário';
        case 'CASH': return 'Dinheiro';
        case 'DEBIT_CARD': return 'Cartão de Débito';
        default: return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
    }
}
// Função para gerar chave fake se não existir
function gerarChaveFake(order, company) {
    const cnpj = (company.cnpj || '').replace(/\D/g, '').padEnd(14, '0');
    const data = new Date(order.createdAt || Date.now()).toISOString().slice(0, 10).replace(/-/g, '');
    return `${cnpj}${data}${order.id.toString().padStart(6, '0')}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`.slice(0, 44);
}
// Gerar nota fiscal térmica
const generateThermalInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { orderId } = req.params;
        const { printerType = '80mm' } = req.query;
        if (!orderId || isNaN(Number(orderId))) {
            return res.status(400).json({
                success: false,
                error: 'ID do pedido inválido'
            });
        }
        // Buscar dados do pedido
        const order = yield prisma_1.default.order.findUnique({
            where: { id: Number(orderId) },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                weight: true,
                                sku: true
                            }
                        },
                        productVariant: {
                            select: {
                                size: true,
                                sku: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Pedido não encontrado'
            });
        }
        // DEBUG: Logar dados do pedido e itens
        console.log('Pedido:', order);
        console.log('Itens do pedido:', order.items);
        if (!order.items || order.items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Pedido não possui itens. Não é possível gerar nota fiscal.'
            });
        }
        // Obter dados da empresa
        const companyInfo = yield getCompanyInfo();
        // Obter próximo número da nota fiscal
        const invoiceNumber = yield getNextInvoiceNumber();
        // Processar endereço do cliente
        const addressInfo = order.shippingAddress
            ? parseShippingAddress(order.shippingAddress)
            : { address: 'Não informado', city: 'Não informado', state: 'N/A', zipCode: '00000-000' };
        // Preparar dados do cliente
        const customerInfo = {
            name: order.customerName || ((_a = order.user) === null || _a === void 0 ? void 0 : _a.name) || 'Cliente não identificado',
            document: order.customerDocument || undefined,
            address: addressInfo.address,
            city: addressInfo.city,
            state: addressInfo.state,
            zipCode: addressInfo.zipCode
        };
        // Preparar itens da nota fiscal
        const invoiceItems = order.items.map(item => {
            var _a, _b, _c, _d;
            const productName = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.name) || 'Produto não identificado';
            const variantInfo = ((_b = item.productVariant) === null || _b === void 0 ? void 0 : _b.size) ? ` - ${item.productVariant.size}` : '';
            const sku = ((_c = item.productVariant) === null || _c === void 0 ? void 0 : _c.sku) || ((_d = item.product) === null || _d === void 0 ? void 0 : _d.sku) || 'N/A';
            const unitPrice = Number(item.price);
            return {
                code: sku,
                description: `${productName}${variantInfo}`,
                quantity: item.quantity,
                unitPrice: unitPrice,
                total: item.quantity * unitPrice
            };
        });
        // Calcular subtotal
        const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
        // O total real do pedido já está em order.total
        const total = Number(order.total);
        // Calcular frete como diferença entre total e subtotal
        const frete = Math.max(0, total - subtotal);
        // Preparar dados da invoice
        const invoiceData = {
            number: invoiceNumber,
            date: new Date().toISOString(),
            subtotal: subtotal,
            tax: frete, // Usar o frete calculado
            total: total,
            paymentMethod: translatePaymentMethod(order.paymentMethod)
        };
        // Preparar dados completos da nota fiscal
        const thermalInvoiceData = {
            company: companyInfo,
            customer: customerInfo,
            invoice: invoiceData,
            items: invoiceItems
        };
        // Gerar chave de acesso (sempre gerar fake, pois não existe no modelo)
        const chaveAcesso = gerarChaveFake({ id: order.id, createdAt: order.createdAt }, companyInfo);
        const urlConsulta = `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=${chaveAcesso}`;
        const qrCodeDataUrl = yield qrcode_1.default.toDataURL(urlConsulta);
        // Passar para o template (campos opcionais já aceitos)
        const invoiceHTML = (0, thermal_invoice_template_1.generateThermalInvoiceHTML)(Object.assign(Object.assign({}, thermalInvoiceData), { qrCodeDataUrl, chaveAcesso }), printerType);
        // Nota: Atualização do pedido com dados da nota fiscal pode ser implementada
        // se necessário adicionar campos específicos no schema do banco
        return res.status(200).json({
            success: true,
            data: {
                invoiceNumber: invoiceNumber,
                invoiceHTML: invoiceHTML,
                printerType: printerType
            }
        });
    }
    catch (error) {
        console.error('Erro ao gerar nota fiscal térmica:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao gerar nota fiscal'
        });
    }
});
exports.generateThermalInvoice = generateThermalInvoice;
// Gerar múltiplas notas fiscais
const generateBatchThermalInvoices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderIds } = req.body;
        const { printerType = '80mm' } = req.query;
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Lista de IDs de pedidos inválida'
            });
        }
        const results = [];
        const errors = [];
        for (const orderId of orderIds) {
            try {
                // Usar a mesma lógica do método individual
                const mockReq = { params: { orderId: orderId.toString() }, query: { printerType } };
                const mockRes = {
                    status: (code) => ({
                        json: (data) => ({ statusCode: code, data })
                    })
                };
                // Chamada simulada para reutilizar a lógica
                const result = yield (0, exports.generateThermalInvoice)(mockReq, mockRes);
                results.push({
                    orderId,
                    success: true,
                    data: result
                });
            }
            catch (error) {
                errors.push({
                    orderId,
                    success: false,
                    error: error instanceof Error ? error.message : 'Erro desconhecido'
                });
            }
        }
        return res.status(200).json({
            success: true,
            data: {
                processed: results.length,
                failed: errors.length,
                results: results,
                errors: errors
            }
        });
    }
    catch (error) {
        console.error('Erro ao gerar notas fiscais em lote:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao gerar notas fiscais em lote'
        });
    }
});
exports.generateBatchThermalInvoices = generateBatchThermalInvoices;
// Obter configurações da impressora térmica
const getThermalPrinterConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield prisma_1.default.appSettings.findFirst();
        return res.status(200).json({
            success: true,
            data: {
                defaultPrinterType: '80mm', // Valor padrão
                autoGenerateInvoice: false, // Valor padrão
                companyInfo: yield getCompanyInfo()
            }
        });
    }
    catch (error) {
        console.error('Erro ao obter configurações da impressora:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao obter configurações da impressora térmica'
        });
    }
});
exports.getThermalPrinterConfig = getThermalPrinterConfig;
// Atualizar configurações da impressora térmica
const updateThermalPrinterConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { printerType, autoGenerateInvoice, companyInfo } = req.body;
        const updateData = {};
        if (printerType) {
            updateData.thermalPrinterType = printerType;
        }
        if (typeof autoGenerateInvoice === 'boolean') {
            updateData.autoGenerateInvoice = autoGenerateInvoice;
        }
        if (companyInfo) {
            Object.assign(updateData, {
                originCompanyName: companyInfo.name,
                originStreet: (_a = companyInfo.address) === null || _a === void 0 ? void 0 : _a.split(',')[0],
                originNeighborhood: (_c = (_b = companyInfo.address) === null || _b === void 0 ? void 0 : _b.split(',')[1]) === null || _c === void 0 ? void 0 : _c.trim(),
                originCity: companyInfo.city,
                originState: companyInfo.state,
                originZipCode: companyInfo.zipCode,
                originPhone: companyInfo.phone,
                originEmail: companyInfo.email,
                originCnpj: companyInfo.cnpj
            });
        }
        const settings = yield prisma_1.default.appSettings.upsert({
            where: { id: 1 },
            update: updateData,
            create: Object.assign({ id: 1 }, updateData)
        });
        return res.status(200).json({
            success: true,
            data: settings
        });
    }
    catch (error) {
        console.error('Erro ao atualizar configurações da impressora:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao atualizar configurações da impressora térmica'
        });
    }
});
exports.updateThermalPrinterConfig = updateThermalPrinterConfig;
