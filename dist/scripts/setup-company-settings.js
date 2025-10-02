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
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function setupCompanySettings() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🏢 Configurando configurações da empresa...');
            const companySettings = [
                {
                    key: 'company_name',
                    value: 'Kimono Store - Artes Marciais',
                    description: 'Nome da empresa',
                    category: 'company'
                },
                {
                    key: 'company_whatsapp',
                    value: '5511987654321',
                    description: 'Número do WhatsApp da empresa (com código do país)',
                    category: 'company'
                },
                {
                    key: 'company_address',
                    value: 'Rua das Artes Marciais, 456 - Vila Olímpia, São Paulo - SP, CEP: 04551-070',
                    description: 'Endereço completo da empresa',
                    category: 'company'
                },
                {
                    key: 'company_hours',
                    value: 'Segunda à Sexta: 8h às 19h, Sábado: 8h às 17h, Domingo: 9h às 15h',
                    description: 'Horário de funcionamento',
                    category: 'company'
                },
                {
                    key: 'pickup_instructions',
                    value: 'Para retirada local: 1) Entre em contato via WhatsApp para agendar, 2) Traga documento com foto, 3) Informe o número do pedido na chegada. Estacionamento gratuito disponível.',
                    description: 'Instruções para retirada local',
                    category: 'company'
                }
            ];
            for (const setting of companySettings) {
                yield prisma.appSettings.upsert({
                    where: { key: setting.key },
                    update: {
                        value: setting.value,
                        description: setting.description,
                        category: setting.category,
                        updatedAt: new Date()
                    },
                    create: setting
                });
                console.log(`✅ Configuração ${setting.key} criada/atualizada`);
            }
            console.log('🎉 Configurações da empresa configuradas com sucesso!');
        }
        catch (error) {
            console.error('❌ Erro ao configurar configurações da empresa:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
// Executar o script se for chamado diretamente
if (require.main === module) {
    setupCompanySettings();
}
exports.default = setupCompanySettings;
