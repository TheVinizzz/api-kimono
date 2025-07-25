import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import prisma from '../config/prisma';

// Interface para dados da empresa
interface CompanyInfo {
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  cnpj: string;
  stateReg: string; // Inscrição Estadual
}

// Interface para dados do cliente
interface CustomerInfo {
  name: string;
  email?: string;
  phone?: string;
  document?: string; // CPF/CNPJ
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

// Interface para itens da nota fiscal
interface InvoiceItem {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight?: number;
}

// Interface para dados da nota fiscal
interface InvoiceData {
  number: string;
  series: string;
  issueDate: Date;
  company: CompanyInfo;
  customer: CustomerInfo;
  items: InvoiceItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  observations?: string;
}

// Buscar dados da empresa das configurações
async function getCompanyInfo(): Promise<CompanyInfo> {
  try {
    // Buscar configurações específicas usando key/value
    const settingsMap = new Map();
    const settings = await prisma.appSettings.findMany({
      where: {
        category: 'company'
      }
    });
    
    settings.forEach(setting => {
      settingsMap.set(setting.key, setting.value);
    });
    
    // Se encontrou configurações, usar elas
    if (settingsMap.size > 0) {
      return {
        name: settingsMap.get('name') || 'Kimono Store',
        address: settingsMap.get('address') || 'Rua das Artes Marciais, 123',
        neighborhood: settingsMap.get('neighborhood') || 'Centro',
        city: settingsMap.get('city') || 'São Paulo',
        state: settingsMap.get('state') || 'SP',
        zipCode: settingsMap.get('zipCode') || '01234-567',
        phone: settingsMap.get('phone') || '(11) 99999-9999',
        email: settingsMap.get('email') || 'contato@kimonostore.com',
        cnpj: settingsMap.get('cnpj') || '00.000.000/0001-00',
        stateReg: settingsMap.get('stateReg') || '000.000.000.000'
      };
    }
    
    // Dados padrão se não configurado
    return {
      name: 'Kimono Store',
      address: 'Rua das Artes Marciais, 123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      phone: '(11) 99999-9999',
      email: 'contato@kimonostore.com',
      cnpj: '00.000.000/0001-00',
      stateReg: '000.000.000.000'
    };
  } catch (error) {
    console.error('Erro ao buscar dados da empresa:', error);
    // Retorna dados padrão em caso de erro
    return {
      name: 'Kimono Store',
      address: 'Rua das Artes Marciais, 123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
      phone: '(11) 99999-9999',
      email: 'contato@kimonostore.com',
      cnpj: '00.000.000/0001-00',
      stateReg: '000.000.000.000'
    };
  }
}

// Gerar próximo número de nota fiscal
async function getNextInvoiceNumber(): Promise<{ number: string; series: string }> {
  try {
    // Por enquanto, usar timestamp para gerar número único
    // Em implementação futura, usar tabela de controle sequencial
    const timestamp = Date.now();
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const number = `${timestamp.toString().slice(-3)}${randomPart}`;
    
    return {
      number: number.padStart(6, '0'),
      series: '1'
    };
  } catch (error) {
    console.error('Erro ao gerar número da nota fiscal:', error);
    // Em caso de erro, usar número baseado em timestamp
    const timestamp = Date.now().toString().slice(-6);
    return {
      number: timestamp,
      series: '1'
    };
  }
}

// Processar endereço do pedido
function parseShippingAddress(addressString: string): { address: string; city: string; state: string; zipCode: string } {
  try {
    // Tentar fazer parse como JSON primeiro
    const parsed = JSON.parse(addressString);
    return {
      address: `${parsed.street || ''}, ${parsed.number || ''} ${parsed.complement || ''}`.trim(),
      city: parsed.city || 'Não informado',
      state: parsed.state || 'N/A',
      zipCode: parsed.zipCode || '00000-000'
    };
  } catch {
    // Se não for JSON, tentar extrair informações do texto
    const parts = addressString.split(',').map(p => p.trim());
    return {
      address: parts[0] || 'Endereço não informado',
      city: parts[1] || 'Não informado',
      state: parts[2] || 'N/A',
      zipCode: parts[3] || '00000-000'
    };
  }
}

// Gerar nota fiscal em PDF
export const generateInvoice = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({
        success: false,
        error: 'ID do pedido inválido'
      });
    }

    // Buscar dados do pedido
    const order = await prisma.order.findUnique({
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

    // Obter dados da empresa
    const companyInfo = await getCompanyInfo();
    
    // Obter próximo número da nota fiscal
    const { number, series } = await getNextInvoiceNumber();

    // Processar endereço do cliente
    const addressInfo = order.shippingAddress 
      ? parseShippingAddress(order.shippingAddress)
      : { address: 'Não informado', city: 'Não informado', state: 'N/A', zipCode: '00000-000' };

    // Preparar dados do cliente
    const customerInfo: CustomerInfo = {
      name: order.customerName || order.user?.name || 'Cliente não identificado',
      email: order.customerEmail || order.user?.email || undefined,
      phone: order.customerPhone || undefined,
      document: order.customerDocument || undefined,
      address: addressInfo.address,
      city: addressInfo.city,
      state: addressInfo.state,
      zipCode: addressInfo.zipCode
    };

    // Preparar itens da nota fiscal
    const invoiceItems: InvoiceItem[] = order.items.map((item: any, index: number) => {
      const productSku = item.productVariant?.sku || item.product.sku || `PROD${item.productId}`;
      const productName = item.product.name;
      const variantInfo = item.productVariant ? ` - Tamanho ${item.productVariant.size}` : '';
      
      return {
        code: productSku,
        description: `${productName}${variantInfo}`,
        quantity: item.quantity,
        unitPrice: Number(item.price),
        totalPrice: Number(item.price) * item.quantity,
        weight: item.product.weight
      };
    });

    // Calcular valores
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const shippingCost = 0; // Implementar lógica de frete se necessário
    const total = Number(order.total);

    // Preparar dados da nota fiscal
    const invoiceData: InvoiceData = {
      number,
      series,
      issueDate: new Date(),
      company: companyInfo,
      customer: customerInfo,
      items: invoiceItems,
      subtotal,
      shippingCost,
      total,
      paymentMethod: order.paymentMethod || 'Não informado',
      observations: `Pedido #${order.id} - Emitido automaticamente`
    };

    // Gerar PDF
    const pdfBuffer = await generateInvoicePDF(invoiceData);

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="nota-fiscal-${number}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar nota fiscal:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar nota fiscal'
    });
  }
};

// Função para gerar PDF da nota fiscal
async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Gerar QR Code para verificação
      const verificationUrl = `https://verificacao.empresa.com/nf/${data.number}`;
      const qrCodeUrl = await QRCode.toDataURL(verificationUrl);
      const qrCodeBuffer = Buffer.from(qrCodeUrl.split(',')[1], 'base64');

      // CABEÇALHO
      doc.fontSize(18).font('Helvetica-Bold');
      doc.text('NOTA FISCAL DE PRODUTO', 40, 50, { align: 'center' });
      
      doc.fontSize(12).font('Helvetica');
      doc.text(`Nº ${data.number}`, 40, 80);
      doc.text(`Série: ${data.series}`, 150, 80);
      doc.text(`Data de Emissão: ${data.issueDate.toLocaleDateString('pt-BR')}`, 250, 80);

      // QR Code no canto direito
      doc.image(qrCodeBuffer, 450, 50, { width: 100 });

      // Linha separadora
      doc.moveTo(40, 110).lineTo(555, 110).stroke();

      // DADOS DO EMITENTE
      let yPos = 130;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('DADOS DO EMITENTE', 40, yPos);
      
      yPos += 15;
      doc.fontSize(9).font('Helvetica');
      doc.text(`Razão Social: ${data.company.name}`, 40, yPos);
      yPos += 12;
      doc.text(`CNPJ: ${data.company.cnpj}`, 40, yPos);
      doc.text(`Inscrição Estadual: ${data.company.stateReg}`, 250, yPos);
      yPos += 12;
      doc.text(`Endereço: ${data.company.address}`, 40, yPos);
      yPos += 12;
      doc.text(`${data.company.neighborhood} - ${data.company.city}/${data.company.state}`, 40, yPos);
      doc.text(`CEP: ${data.company.zipCode}`, 350, yPos);
      yPos += 12;
      doc.text(`Telefone: ${data.company.phone}`, 40, yPos);
      doc.text(`Email: ${data.company.email}`, 250, yPos);

      // Linha separadora
      yPos += 20;
      doc.moveTo(40, yPos).lineTo(555, yPos).stroke();

      // DADOS DO DESTINATÁRIO
      yPos += 15;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('DADOS DO DESTINATÁRIO', 40, yPos);
      
      yPos += 15;
      doc.fontSize(9).font('Helvetica');
      doc.text(`Nome: ${data.customer.name}`, 40, yPos);
      yPos += 12;
      if (data.customer.document) {
        doc.text(`CPF/CNPJ: ${data.customer.document}`, 40, yPos);
        yPos += 12;
      }
      doc.text(`Endereço: ${data.customer.address}`, 40, yPos);
      yPos += 12;
      doc.text(`${data.customer.city}/${data.customer.state}`, 40, yPos);
      doc.text(`CEP: ${data.customer.zipCode}`, 250, yPos);
      yPos += 12;
      if (data.customer.phone) {
        doc.text(`Telefone: ${data.customer.phone}`, 40, yPos);
      }
      if (data.customer.email) {
        doc.text(`Email: ${data.customer.email}`, 250, yPos);
      }

      // Linha separadora
      yPos += 20;
      doc.moveTo(40, yPos).lineTo(555, yPos).stroke();

      // DISCRIMINAÇÃO DOS PRODUTOS/SERVIÇOS
      yPos += 15;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('DISCRIMINAÇÃO DOS PRODUTOS', 40, yPos);

      // Cabeçalho da tabela
      yPos += 20;
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('Código', 40, yPos);
      doc.text('Descrição', 100, yPos);
      doc.text('Qtd', 350, yPos);
      doc.text('Valor Unit.', 390, yPos);
      doc.text('Valor Total', 470, yPos);

      // Linha do cabeçalho
      yPos += 12;
      doc.moveTo(40, yPos).lineTo(555, yPos).stroke();

      // Itens
      yPos += 10;
      doc.fontSize(8).font('Helvetica');
      
      data.items.forEach((item) => {
        doc.text(item.code, 40, yPos);
        doc.text(item.description, 100, yPos, { width: 240 });
        doc.text(item.quantity.toString(), 350, yPos);
        doc.text(`R$ ${item.unitPrice.toFixed(2)}`, 390, yPos);
        doc.text(`R$ ${item.totalPrice.toFixed(2)}`, 470, yPos);
        yPos += 15;
      });

      // Linha separadora antes dos totais
      yPos += 10;
      doc.moveTo(40, yPos).lineTo(555, yPos).stroke();

      // TOTAIS
      yPos += 15;
      doc.fontSize(9).font('Helvetica');
      doc.text(`Subtotal: R$ ${data.subtotal.toFixed(2)}`, 400, yPos);
      yPos += 12;
      if (data.shippingCost > 0) {
        doc.text(`Frete: R$ ${data.shippingCost.toFixed(2)}`, 400, yPos);
        yPos += 12;
      }
      
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`TOTAL GERAL: R$ ${data.total.toFixed(2)}`, 400, yPos);

      // INFORMAÇÕES ADICIONAIS
      yPos += 30;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('INFORMAÇÕES ADICIONAIS:', 40, yPos);
      yPos += 15;
      doc.fontSize(8).font('Helvetica');
      doc.text(`Forma de Pagamento: ${data.paymentMethod}`, 40, yPos);
      yPos += 12;
      if (data.observations) {
        doc.text(`Observações: ${data.observations}`, 40, yPos);
      }

      // RODAPÉ
      yPos = 750; // Posição fixa no rodapé
      doc.fontSize(7).font('Helvetica');
      doc.text('Este documento foi gerado automaticamente pelo sistema.', 40, yPos, { align: 'center' });
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 40, yPos + 10, { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// Listar notas fiscais emitidas
export const getInvoicesList = async (req: Request, res: Response) => {
  try {
    // Por enquanto, retornar lista baseada nos pedidos
    // Em um sistema mais completo, haveria uma tabela específica para notas fiscais
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limitar a 50 registros
    });

    const invoicesList = orders.map((order: any, index: number) => ({
      id: order.id,
      number: (index + 1).toString().padStart(6, '0'),
      series: '1',
      customerName: order.customerName || order.user?.name || 'Cliente não identificado',
      total: Number(order.total),
      issueDate: order.createdAt,
      status: order.status
    }));

    return res.json({
      success: true,
      invoices: invoicesList
    });

  } catch (error) {
    console.error('Erro ao listar notas fiscais:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao listar notas fiscais'
    });
  }
}; 