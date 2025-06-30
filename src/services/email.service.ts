import nodemailer from 'nodemailer';
import config from '../config';

interface OrderEmailData {
  orderId: number;
  customerName: string;
  customerEmail: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  paymentMethod: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configurar transporter (usar Gmail como exemplo)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      }
    });
  }

  async sendPaymentConfirmation(orderData: OrderEmailData): Promise<boolean> {
    try {
      const emailHtml = this.generatePaymentConfirmationEmail(orderData);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@seusite.com',
        to: orderData.customerEmail,
        subject: `Pagamento Confirmado - Pedido #${orderData.orderId}`,
        html: emailHtml
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de confirmação enviado para ${orderData.customerEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  private generatePaymentConfirmationEmail(orderData: OrderEmailData): string {
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
export default emailService; 