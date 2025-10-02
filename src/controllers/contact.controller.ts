import { Request, Response } from 'express';
import emailService from '../services/email.service';

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const sendContactEmail = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message }: ContactRequest = req.body;

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
    const emailSent = await emailService.sendContactEmail({
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
    } else {
      console.log(`❌ Falha ao enviar email de contato de ${name} (${email})`);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor. Tente novamente mais tarde.'
      });
    }

  } catch (error) {
    console.error('❌ Erro no controller de contato:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor. Tente novamente mais tarde.'
    });
  }
};
