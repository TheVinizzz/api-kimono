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

interface TrackingEmailData {
  orderId: number;
  customerName: string;
  customerEmail: string;
  trackingNumber: string;
  shippingCarrier: string;
  estimatedDelivery?: string;
}

interface PasswordResetEmailData {
  userEmail: string;
  userName: string;
  resetToken: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configurar transporter (usar Gmail como exemplo)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || ''
      },
      // Adicionar configurações para melhorar entregabilidade
      pool: true, // Use connection pooling
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5
    });

    // Verificar conexão ao iniciar
    this.verifyConnection();
  }

  // Verificar conexão com o servidor de email
  private async verifyConnection(): Promise<void> {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Configuração de email incompleta. Emails não serão enviados.');
        return;
      }

      await this.transporter.verify();
      console.log('✅ Conexão com servidor de email estabelecida com sucesso');
    } catch (error) {
      console.error('❌ Erro ao conectar com servidor de email:', error);
    }
  }

  async sendPaymentConfirmation(orderData: OrderEmailData): Promise<boolean> {
    try {
      if (!this.isEmailConfigured()) {
        console.log('⚠️ Email não configurado. Pulando envio de confirmação de pagamento.');
        return false;
      }

      const emailHtml = this.generatePaymentConfirmationEmail(orderData);

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"Kimono Store" <${process.env.EMAIL_USER}>`,
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

  async sendTrackingCodeNotification(trackingData: TrackingEmailData): Promise<boolean> {
    try {
      if (!this.isEmailConfigured()) {
        console.log('⚠️ Email não configurado. Pulando envio de código de rastreio.');
        return false;
      }

      const emailHtml = this.generateTrackingCodeEmail(trackingData);

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"Kimono Store" <${process.env.EMAIL_USER}>`,
        to: trackingData.customerEmail,
        subject: `Código de Rastreio Disponível - Pedido #${trackingData.orderId}`,
        html: emailHtml
      };

      // Tentar enviar com retry em caso de falha
      let tentativas = 0;
      const maxTentativas = 3;
      
      while (tentativas < maxTentativas) {
        tentativas++;
        try {
          await this.transporter.sendMail(mailOptions);
          console.log(`✅ Email com código de rastreio enviado para ${trackingData.customerEmail}`);
          return true;
        } catch (retryError) {
          console.error(`❌ Erro na tentativa ${tentativas}/${maxTentativas} de enviar email:`, retryError);
          
          if (tentativas < maxTentativas) {
            const tempoEspera = Math.pow(2, tentativas) * 1000; // 2s, 4s, 8s...
            console.log(`⏳ Aguardando ${tempoEspera/1000}s antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, tempoEspera));
          }
        }
      }

      console.error('❌ Todas as tentativas de envio de email falharam');
      return false;
    } catch (error) {
      console.error('❌ Erro ao enviar email de rastreio:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(resetData: PasswordResetEmailData): Promise<boolean> {
    try {
      if (!this.isEmailConfigured()) {
        console.log('⚠️ Email não configurado. Pulando envio de reset de senha.');
        return false;
      }

      const emailHtml = this.generatePasswordResetEmail(resetData);
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetData.resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"Kimono Store" <${process.env.EMAIL_USER}>`,
        to: resetData.userEmail,
        subject: 'Redefinir sua senha - Kimono Store',
        html: emailHtml.replace('{{RESET_URL}}', resetUrl)
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email de reset de senha enviado para ${resetData.userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email de reset de senha:', error);
      return false;
    }
  }

  // Verificar se o email está configurado
  private isEmailConfigured(): boolean {
    return !!(process.env.EMAIL_USER && (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD));
  }

  private generateTrackingCodeEmail(trackingData: TrackingEmailData): string {
    const rastreioUrl = trackingData.shippingCarrier.toLowerCase().includes('correios') 
      ? `https://rastreamento.correios.com.br/app/index.php`
      : 'https://rastreamento.correios.com.br/app/index.php';

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

  private generatePasswordResetEmail(resetData: PasswordResetEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Redefinir Senha</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D4AF37; margin: 0;">🔐 Redefinir Senha</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; color: #495057;">Olá, ${resetData.userName}!</h2>
            <p style="margin: 0;">Recebemos uma solicitação para redefinir a senha da sua conta na Kimono Store.</p>
          </div>

          <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h3 style="margin: 0 0 15px 0; color: #0056b3;">Clique no botão abaixo para redefinir sua senha</h3>
            <p style="margin: 0 0 20px 0; color: #6c757d;">Este link é válido por 1 hora por motivos de segurança.</p>
            
            <a href="{{RESET_URL}}" style="background-color: #D4AF37; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
              REDEFINIR SENHA
            </a>
          </div>

          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
            <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Importante:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
              <li>Se você não solicitou esta redefinição, ignore este email</li>
              <li>Nunca compartilhe este link com outras pessoas</li>
              <li>O link expira em 1 hora por segurança</li>
            </ul>
          </div>

          <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 10px 0; color: #0c5460;">Dicas para uma senha segura:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
              <li>Use pelo menos 8 caracteres</li>
              <li>Combine letras maiúsculas, minúsculas, números e símbolos</li>
              <li>Evite informações pessoais óbvias</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #6c757d; font-size: 14px;">
              Dúvidas? Entre em contato conosco:<br>
              📱 WhatsApp: (83) 99831-1713<br>
              📧 Email: suporte@kimonostore.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
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