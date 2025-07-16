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
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        // Configurar transporter (usar Gmail como exemplo)
        this.transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || '',
                pass: process.env.EMAIL_PASS || ''
            }
        });
    }
    sendPaymentConfirmation(orderData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emailHtml = this.generatePaymentConfirmationEmail(orderData);
                const mailOptions = {
                    from: process.env.EMAIL_FROM || 'noreply@seusite.com',
                    to: orderData.customerEmail,
                    subject: `Pagamento Confirmado - Pedido #${orderData.orderId}`,
                    html: emailHtml
                };
                yield this.transporter.sendMail(mailOptions);
                console.log(`✅ Email de confirmação enviado para ${orderData.customerEmail}`);
                return true;
            }
            catch (error) {
                console.error('❌ Erro ao enviar email:', error);
                return false;
            }
        });
    }
    sendTrackingCodeNotification(trackingData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const emailHtml = this.generateTrackingCodeEmail(trackingData);
                const mailOptions = {
                    from: process.env.EMAIL_FROM || 'noreply@seusite.com',
                    to: trackingData.customerEmail,
                    subject: `Código de Rastreio Disponível - Pedido #${trackingData.orderId}`,
                    html: emailHtml
                };
                yield this.transporter.sendMail(mailOptions);
                console.log(`✅ Email com código de rastreio enviado para ${trackingData.customerEmail}`);
                return true;
            }
            catch (error) {
                console.error('❌ Erro ao enviar email de rastreio:', error);
                return false;
            }
        });
    }
    generateTrackingCodeEmail(trackingData) {
        const rastreioUrl = 'https://rastreamento.correios.com.br/app/index.php';
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Código de Rastreio Disponível</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D4AF37; margin: 0;">📦 Seu Pedido foi Enviado!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; color: #495057;">Olá, ${trackingData.customerName}!</h2>
            <p style="margin: 0;">Seu pedido #${trackingData.orderId} foi enviado e já está a caminho!</p>
          </div>

          <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h3 style="margin: 0 0 15px 0; color: #0056b3;">Seu Código de Rastreio</h3>
            <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; padding: 15px; background: #fff; border-radius: 5px; border: 1px dashed #0056b3;">
              ${trackingData.trackingNumber}
            </div>
            <p style="margin-top: 15px;">Transportadora: ${trackingData.shippingCarrier}</p>
            ${trackingData.estimatedDelivery ? `<p>Previsão de entrega: ${trackingData.estimatedDelivery}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${rastreioUrl}" style="background-color: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              RASTREAR MEU PEDIDO
            </a>
          </div>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #155724;">Informações Importantes:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>O prazo de entrega é de 5-10 dias úteis</li>
              <li>Você receberá atualizações sobre o status da entrega</li>
              <li>Em caso de ausência, a entrega poderá ser redirecionada para uma agência dos Correios</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #6c757d; font-size: 14px;">
              Dúvidas? Entre em contato conosco:<br>
              📱 WhatsApp: (83) 99831-1713<br>
              📧 Email: suporte@seusite.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    generatePaymentConfirmationEmail(orderData) {
        const itemsHtml = orderData.items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Pagamento Confirmado</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D4AF37; margin: 0;">🎉 Pagamento Confirmado!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; color: #495057;">Olá, ${orderData.customerName}!</h2>
            <p style="margin: 0;">Seu pagamento foi aprovado com sucesso e seu pedido está sendo processado.</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #495057; border-bottom: 2px solid #D4AF37; padding-bottom: 5px;">Detalhes do Pedido #${orderData.orderId}</h3>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #D4AF37;">Produto</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #D4AF37;">Qtd</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #D4AF37;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="text-align: right; font-size: 18px; font-weight: bold; color: #D4AF37; margin-top: 15px;">
              Total: R$ ${orderData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #155724;">Próximos Passos:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Seu pedido será preparado em até 2 dias úteis</li>
              <li>Você receberá o código de rastreamento por email</li>
              <li>O prazo de entrega é de 5-10 dias úteis</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #6c757d; font-size: 14px;">
              Dúvidas? Entre em contato conosco:<br>
              📱 WhatsApp: (83) 99831-1713<br>
              📧 Email: suporte@seusite.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
}
const emailService = new EmailService();
exports.default = emailService;
