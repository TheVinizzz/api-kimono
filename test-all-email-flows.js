console.log('\n📧 TESTE COMPLETO DE TODOS OS FLUXOS DE EMAIL');
console.log('═'.repeat(70));

const nodemailer = require('nodemailer');
require('dotenv').config();

// 1. Verificar configuração
console.log('\n1️⃣ CONFIGURAÇÃO DE EMAIL:');
console.log('─'.repeat(70));
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NÃO DEFINIDO');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'DEFINIDO' : 'NÃO DEFINIDO');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'NÃO DEFINIDO');

// 2. Criar transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || ''
  }
});

// 3. Testar conexão
console.log('\n2️⃣ TESTANDO CONEXÃO:');
console.log('─'.repeat(70));
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Erro na conexão:', error.message);
    return;
  }
  console.log('✅ Conexão estabelecida com sucesso');
});

// 4. Função para gerar template de contato
function generateContactEmail(contactData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Contato do Site - ${contactData.subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C41E3A; margin: 0;">📧 Novo Contato do Site</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 15px 0; color: #495057;">Informações do Cliente</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold; width: 120px;">Nome:</td>
                        <td style="padding: 8px 0;">${contactData.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                        <td style="padding: 8px 0;"><a href="mailto:${contactData.email}" style="color: #C41E3A;">${contactData.email}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Assunto:</td>
                        <td style="padding: 8px 0;">${contactData.subject}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; font-weight: bold;">Data:</td>
                        <td style="padding: 8px 0;">${new Date().toLocaleString('pt-BR')}</td>
                    </tr>
                </table>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #495057; border-bottom: 2px solid #C41E3A; padding-bottom: 5px;">Mensagem</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #C41E3A;">
                    <p style="margin: 0; white-space: pre-wrap;">${contactData.message}</p>
                </div>
            </div>

            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #155724;">Ações Recomendadas:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                    <li>Responder ao cliente em até 24 horas</li>
                    <li>Usar o email de resposta direta: <strong>${contactData.email}</strong></li>
                    <li>Manter um tom profissional e cordial</li>
                </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #6c757d; font-size: 14px;">
                    Este email foi enviado automaticamente pelo formulário de contato do site Kimono Store<br>
                    📱 WhatsApp: (11) 95071-9084<br>
                    📧 Email: atendimento@kimono.net.br
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// 5. Função para gerar template de confirmação de pagamento
function generatePaymentConfirmationEmail(orderData) {
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
                    📱 WhatsApp: (11) 95071-9084<br>
                    📧 Email: atendimento@kimono.net.br
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// 6. Função para gerar template de rastreamento
function generateTrackingEmail(trackingData) {
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
                <a href="https://rastreamento.correios.com.br/app/index.php" style="background-color: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
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
                    📱 WhatsApp: (11) 95071-9084<br>
                    📧 Email: atendimento@kimono.net.br
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// 7. Testar todos os fluxos
async function testAllEmailFlows() {
  console.log('\n3️⃣ TESTANDO FLUXOS DE EMAIL:');
  console.log('─'.repeat(70));

  let successCount = 0;
  let totalTests = 0;

  // Teste 1: Email de Contato
  totalTests++;
  console.log('\n📧 Teste 1: Email de Contato');
  console.log('─'.repeat(50));
  
  const contactData = {
    name: 'João Silva',
    email: 'joao.silva@teste.com',
    subject: 'Dúvida sobre produtos',
    message: 'Olá, gostaria de saber mais informações sobre os kimonos disponíveis. Vocês têm alguma promoção especial?'
  };

  const contactMailOptions = {
    from: process.env.EMAIL_FROM || `"Kimono Store" <${process.env.EMAIL_USER}>`,
    to: 'atendimento@kimono.net.br',
    subject: `Contato do Site - ${contactData.subject}`,
    html: generateContactEmail(contactData),
    replyTo: contactData.email
  };

  try {
    await transporter.sendMail(contactMailOptions);
    console.log('✅ Email de contato enviado com sucesso!');
    console.log('   📧 Para: atendimento@kimono.net.br');
    console.log('   📧 Reply-To:', contactData.email);
    successCount++;
  } catch (error) {
    console.log('❌ Erro ao enviar email de contato:', error.message);
  }

  // Teste 2: Email de Confirmação de Pagamento
  totalTests++;
  console.log('\n💳 Teste 2: Email de Confirmação de Pagamento');
  console.log('─'.repeat(50));
  
  const paymentData = {
    orderId: 12345,
    customerName: 'Maria Santos',
    customerEmail: 'maria.santos@teste.com',
    total: 250.00,
    items: [
      { name: 'Kimono Judo Branco', quantity: 1, price: 150.00 },
      { name: 'Faixa Preta', quantity: 1, price: 50.00 },
      { name: 'Frete', quantity: 1, price: 50.00 }
    ],
    paymentMethod: 'PIX'
  };

  const paymentMailOptions = {
    from: process.env.EMAIL_FROM || `"Kimono Store" <${process.env.EMAIL_USER}>`,
    to: paymentData.customerEmail,
    subject: `Pagamento Confirmado - Pedido #${paymentData.orderId}`,
    html: generatePaymentConfirmationEmail(paymentData)
  };

  try {
    await transporter.sendMail(paymentMailOptions);
    console.log('✅ Email de confirmação de pagamento enviado com sucesso!');
    console.log('   📧 Para:', paymentData.customerEmail);
    console.log('   💰 Valor: R$', paymentData.total.toFixed(2));
    successCount++;
  } catch (error) {
    console.log('❌ Erro ao enviar email de confirmação:', error.message);
  }

  // Teste 3: Email de Rastreamento
  totalTests++;
  console.log('\n📦 Teste 3: Email de Rastreamento');
  console.log('─'.repeat(50));
  
  const trackingData = {
    orderId: 12345,
    customerName: 'Maria Santos',
    customerEmail: 'maria.santos@teste.com',
    trackingNumber: 'BR123456789BR',
    shippingCarrier: 'Correios',
    estimatedDelivery: '05/02/2025'
  };

  const trackingMailOptions = {
    from: process.env.EMAIL_FROM || `"Kimono Store" <${process.env.EMAIL_USER}>`,
    to: trackingData.customerEmail,
    subject: `Código de Rastreio Disponível - Pedido #${trackingData.orderId}`,
    html: generateTrackingEmail(trackingData)
  };

  try {
    await transporter.sendMail(trackingMailOptions);
    console.log('✅ Email de rastreamento enviado com sucesso!');
    console.log('   📧 Para:', trackingData.customerEmail);
    console.log('   🚚 Código:', trackingData.trackingNumber);
    successCount++;
  } catch (error) {
    console.log('❌ Erro ao enviar email de rastreamento:', error.message);
  }

  // Resumo dos testes
  console.log('\n4️⃣ RESUMO DOS TESTES:');
  console.log('─'.repeat(70));
  console.log(`✅ Sucessos: ${successCount}/${totalTests}`);
  console.log(`❌ Falhas: ${totalTests - successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 TODOS OS FLUXOS DE EMAIL ESTÃO FUNCIONANDO PERFEITAMENTE!');
    console.log('📧 Contato: atendimento@kimono.net.br');
    console.log('💳 Pagamento: Enviado para o cliente');
    console.log('📦 Rastreamento: Enviado para o cliente');
  } else {
    console.log('\n⚠️ ALGUNS FLUXOS DE EMAIL PRECISAM DE ATENÇÃO');
  }

  console.log('\n═'.repeat(70));
  console.log('🏁 TESTE COMPLETO FINALIZADO!');
  console.log('═'.repeat(70));
}

// Executar testes
testAllEmailFlows().catch(error => {
  console.error('❌ Erro geral nos testes:', error);
});
