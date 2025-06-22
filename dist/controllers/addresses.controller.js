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
exports.setDefaultAddress = exports.deleteAddress = exports.updateAddress = exports.createAddress = exports.getAddressById = exports.getUserAddresses = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Obter todos os endereços do usuário logado
const getUserAddresses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const addresses = yield prisma.address.findMany({
            where: { userId },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        return res.json(addresses);
    }
    catch (error) {
        console.error('Erro ao buscar endereços:', error);
        return res.status(500).json({ error: 'Erro ao buscar endereços' });
    }
});
exports.getUserAddresses = getUserAddresses;
// Obter um endereço específico por ID
const getAddressById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const address = yield prisma.address.findFirst({
            where: {
                id,
                userId
            }
        });
        if (!address) {
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }
        return res.json(address);
    }
    catch (error) {
        console.error('Erro ao buscar endereço:', error);
        return res.status(500).json({ error: 'Erro ao buscar endereço' });
    }
});
exports.getAddressById = getAddressById;
// Criar um novo endereço
const createAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        const { name, street, number, complement, neighborhood, city, state, zipCode, isDefault } = req.body;
        // Validar campos obrigatórios
        if (!name || !street || !number || !neighborhood || !city || !state || !zipCode) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
        }
        // Se estiver criando como padrão, remover o padrão dos outros endereços
        if (isDefault) {
            yield prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false }
            });
        }
        const newAddress = yield prisma.address.create({
            data: {
                userId,
                name,
                street,
                number,
                complement,
                neighborhood,
                city,
                state,
                zipCode,
                isDefault: isDefault || false
            }
        });
        return res.status(201).json(newAddress);
    }
    catch (error) {
        console.error('Erro ao criar endereço:', error);
        return res.status(500).json({ error: 'Erro ao criar endereço' });
    }
});
exports.createAddress = createAddress;
// Atualizar um endereço existente
const updateAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        // Verificar se o endereço existe e pertence ao usuário
        const existingAddress = yield prisma.address.findFirst({
            where: {
                id,
                userId
            }
        });
        if (!existingAddress) {
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }
        const { name, street, number, complement, neighborhood, city, state, zipCode, isDefault } = req.body;
        // Se estiver tornando este endereço como padrão, remover o padrão dos outros
        if (isDefault && !existingAddress.isDefault) {
            yield prisma.address.updateMany({
                where: {
                    userId,
                    NOT: { id }
                },
                data: { isDefault: false }
            });
        }
        const updatedAddress = yield prisma.address.update({
            where: { id },
            data: {
                name,
                street,
                number,
                complement,
                neighborhood,
                city,
                state,
                zipCode,
                isDefault: isDefault || false
            }
        });
        return res.json(updatedAddress);
    }
    catch (error) {
        console.error('Erro ao atualizar endereço:', error);
        return res.status(500).json({ error: 'Erro ao atualizar endereço' });
    }
});
exports.updateAddress = updateAddress;
// Excluir um endereço
const deleteAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        // Verificar se o endereço existe e pertence ao usuário
        const existingAddress = yield prisma.address.findFirst({
            where: {
                id,
                userId
            }
        });
        if (!existingAddress) {
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }
        yield prisma.address.delete({
            where: { id }
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error('Erro ao excluir endereço:', error);
        return res.status(500).json({ error: 'Erro ao excluir endereço' });
    }
});
exports.deleteAddress = deleteAddress;
// Definir um endereço como padrão
const setDefaultAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }
        // Verificar se o endereço existe e pertence ao usuário
        const existingAddress = yield prisma.address.findFirst({
            where: {
                id,
                userId
            }
        });
        if (!existingAddress) {
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }
        // Remover o padrão de todos os endereços do usuário
        yield prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false }
        });
        // Definir o endereço selecionado como padrão
        const updatedAddress = yield prisma.address.update({
            where: { id },
            data: { isDefault: true }
        });
        return res.json(updatedAddress);
    }
    catch (error) {
        console.error('Erro ao definir endereço padrão:', error);
        return res.status(500).json({ error: 'Erro ao definir endereço padrão' });
    }
});
exports.setDefaultAddress = setDefaultAddress;
