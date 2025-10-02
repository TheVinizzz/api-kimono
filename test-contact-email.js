console.log('\n📧 TESTANDO ENVIO DE EMAIL DE CONTATO');
console.log('═'.repeat(60));

const nodemailer = require('nodemailer');
require('dotenv').config();

// 1. Verificar configuração
console.log('\n1️⃣ CONFIGURAÇÃO:');
console.log('─'.repeat(60));
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NÃO DEFINIDO');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'DEFINIDO' : 'NÃO DEFINIDO');

// 2. Criar transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || ''
  }
});

// 3. Dados de teste do contato
const contactData = {
  name: 'Cliente Teste',
  email: 'cliente.teste@gmail.com',
  subject: 'Teste de Contato',
  message: 'Esta é uma mensagem de teste enviada pelo formulário de contato do site Kimono Store.\n\nEspero que esteja funcionando corretamente!\n\nAtenciosamente,\nCliente Teste'
};

// 4. Gerar HTML do email
const emailHtml = `
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
                📧 Email: vendas@kimono.net.br
            </p>
        </div>
    </div>
</body>
</html>
`;

// 5. Configurar email
const mailOptions = {
  from: process.env.EMAIL_FROM || `"Kimono Store" <${process.env.EMAIL_USER}>`,
  to: 'viniprograming@gmail.com', // Email de destino conforme solicitado
  subject: `Contato do Site - ${contactData.subject}`,
  html: emailHtml,
  replyTo: contactData.email // Permitir resposta direta ao cliente
};

console.log('\n2️⃣ ENVIANDO EMAIL:');
console.log('─'.repeat(60));
console.log('From:', mailOptions.from);
console.log('To:', mailOptions.to);
console.log('Subject:', mailOptions.subject);
console.log('Reply-To:', mailOptions.replyTo);

// 6. Enviar email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('❌ Erro ao enviar email:', error.message);
  } else {
    console.log('✅ Email de contato enviado com sucesso!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  }
  
  console.log('\n═'.repeat(60));
  console.log('🎉 TESTE DE CONTATO FINALIZADO!');
  console.log('═'.repeat(60));
});
