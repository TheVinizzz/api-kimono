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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendContactEmail = void 0;
const email_service_1 = __importDefault(require("../services/email.service"));
const sendContactEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, subject, message } = req.body;
        // Validação básica
        if (!name || !email || !subject || !message) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos são obrigatórios'
            });
        }
        // Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email inválido'
            });
        }
        // Enviar email
        const emailSent = yield email_service_1.default.sendContactEmail({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim()
        });
        if (emailSent) {
            console.log(`✅ Email de contato enviado com sucesso de ${name} (${email})`);
            return res.status(200).json({
                success: true,
                message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.'
            });
        }
        else {
            console.log(`❌ Falha ao enviar email de contato de ${name} (${email})`);
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor. Tente novamente mais tarde.'
            });
        }
    }
    catch (error) {
        console.error('❌ Erro no controller de contato:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor. Tente novamente mais tarde.'
        });
    }
});
exports.sendContactEmail = sendContactEmail;
