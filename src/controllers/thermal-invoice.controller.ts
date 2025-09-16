import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { generateThermalInvoiceHTML, ThermalInvoiceData } from '../templates/thermal-invoice-template';
import QRCode from 'qrcode';
import { Order } from '@prisma/client';

// Configurações para impressora térmica
interface ThermalPrinterConfig {
  width: number; // 32 chars para 58mm, 48 chars para 80mm
  type: '58mm' | '80mm';
}

// Obter dados da empresa (compatível com ThermalInvoiceData)
async function getCompanyInfo(): Promise<ThermalInvoiceData['company']> {
  try {
    // Usar a mesma função que as etiquetas 58mm usam para garantir consistência
    const { getOriginInfo } = await import('./settings.controller');
    const originInfo = await getOriginInfo();
    
    // Buscar dados adicionais de CNPJ e email das configurações
    const additionalSettings = await prisma.appSettings.findMany({
      where: {
        key: {
          in: ['shipping_origin_cnpj', 'shipping_origin_email']
        }
      }
    });
    
    const settingsMap = Object.fromEntries(additionalSettings.map(s => [s.key, s.value]));
    
    return {
      name: originInfo.name || 'Kimono Store',
      address: originInfo.address || 'Rua das Flores, 123',
      city: originInfo.city || 'São Paulo',
      state: originInfo.state || 'SP',
      zipCode: originInfo.zipCode || '01310-100',
      phone: originInfo.phone || '(11) 99999-9999',
      email: settingsMap['shipping_origin_email'] || 'contato@kimonostore.com',
      cnpj: settingsMap['shipping_origin_cnpj'] || '00.000.000/0001-00'
    };
  } catch (error) {
    console.error('Erro ao obter dados da empresa:', error);
    return {
      name: 'Kimono Store',
      address: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      phone: '(11) 99999-9999',
      email: 'contato@kimonostore.com',
      cnpj: '00.000.000/0001-00'
    };
  }
}

// Processar endereço de entrega
function parseShippingAddress(shippingAddress: string): { address: string; city: string; state: string; zipCode: string } {
  try {
    const parts = shippingAddress.split(',').map(part => part.trim());
    
    if (parts.length >= 4) {
      return {
        address: `${parts[0]}, ${parts[1]}`,
        city: parts[2] || 'N/A',
        state: parts[3] || 'N/A', 
        zipCode: parts[4] || '00000-000'
      };
    }
    
    return {
      address: shippingAddress,
      city: 'N/A',
      state: 'N/A',
      zipCode: '00000-000'
    };
  } catch (error) {
    return {
      address: 'Endereço não informado',
      city: 'N/A',
      state: 'N/A', 
      zipCode: '00000-000'
    };
  }
}

// Gerar próximo número de nota fiscal
async function getNextInvoiceNumber(): Promise<string> {
  try {
    const timestamp = Date.now();
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const number = `${timestamp.toString().slice(-3)}${randomPart}`;
    
    return number.padStart(6, '0');
  } catch (error) {
    console.error('Erro ao gerar número da nota fiscal:', error);
    return Date.now().toString().slice(-6);
  }
}

// Função para traduzir método de pagamento
function translatePaymentMethod(method: string | null | undefined): string {
  if (!method) return 'Não informado';
  switch (method.toUpperCase()) {
    case 'CREDIT_CARD': return 'Cartão de Crédito';
    case 'PIX': return 'Pix';
    case 'BOLETO': return 'Boleto Bancário';
    case 'CASH': return 'Dinheiro';
    case 'DEBIT_CARD': return 'Cartão de Débito';
    default: return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  }
}

// Função para gerar chave fake se não existir
function gerarChaveFake(order: { id: number; createdAt?: Date }, company: { cnpj?: string }): string {
  const cnpj = (company.cnpj || '').replace(/\D/g, '').padEnd(14, '0');
  const data = new Date(order.createdAt || Date.now()).toISOString().slice(0,10).replace(/-/g, '');
  return `${cnpj}${data}${order.id.toString().padStart(6, '0')}${Math.floor(Math.random()*1000000).toString().padStart(6, '0')}`.slice(0,44);
}

// Gerar nota fiscal térmica
export const generateThermalInvoice = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { printerType = '80mm' } = req.query;

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

    // DEBUG: Logar dados do pedido e itens
    console.log('Pedido:', order);
    console.log('Itens do pedido:', order.items);
    if (!order.items || order.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Pedido não possui itens. Não é possível gerar nota fiscal.'
      });
    }

    // Obter dados da empresa
    const companyInfo = await getCompanyInfo();
    
    // Obter próximo número da nota fiscal
    const invoiceNumber = await getNextInvoiceNumber();

    // Processar endereço do cliente
    const addressInfo = order.shippingAddress 
      ? parseShippingAddress(order.shippingAddress)
      : { address: 'Não informado', city: 'Não informado', state: 'N/A', zipCode: '00000-000' };

    // Preparar dados do cliente
    const customerInfo: ThermalInvoiceData['customer'] = {
      name: order.customerName || order.user?.name || 'Cliente não identificado',
      document: order.customerDocument || undefined,
      address: addressInfo.address,
      city: addressInfo.city,
      state: addressInfo.state,
      zipCode: addressInfo.zipCode
    };

    // Preparar itens da nota fiscal
    const invoiceItems: ThermalInvoiceData['items'] = order.items.map(item => {
      const productName = item.product?.name || 'Produto não identificado';
      const variantInfo = item.productVariant?.size ? ` - ${item.productVariant.size}` : '';
      const sku = item.productVariant?.sku || item.product?.sku || 'N/A';
      const unitPrice = Number(item.price);
      
      return {
        code: sku,
        description: `${productName}${variantInfo}`,
        quantity: item.quantity,
        unitPrice: unitPrice,
        total: item.quantity * unitPrice
      };
    });

    // Calcular subtotal
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    // O total real do pedido já está em order.total
    const total = Number(order.total);
    // Calcular frete como diferença entre total e subtotal
    const frete = Math.max(0, total - subtotal);

    // Preparar dados da invoice
    const invoiceData: ThermalInvoiceData['invoice'] = {
      number: invoiceNumber,
      date: new Date().toISOString(),
      subtotal: subtotal,
      tax: frete, // Usar o frete calculado
      total: total,
      paymentMethod: translatePaymentMethod(order.paymentMethod)
    };

    // Preparar dados completos da nota fiscal
    const thermalInvoiceData: ThermalInvoiceData = {
      company: companyInfo,
      customer: customerInfo,
      invoice: invoiceData,
      items: invoiceItems
    };

    // Gerar chave de acesso (sempre gerar fake, pois não existe no modelo)
    const chaveAcesso = gerarChaveFake({ id: order.id, createdAt: order.createdAt }, companyInfo);
    const urlConsulta = `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?chNFe=${chaveAcesso}`;
    const qrCodeDataUrl = await QRCode.toDataURL(urlConsulta);
    // Passar para o template (campos opcionais já aceitos)
    const invoiceHTML = generateThermalInvoiceHTML({ ...thermalInvoiceData, qrCodeDataUrl, chaveAcesso }, printerType as '58mm' | '80mm');

    // Nota: Atualização do pedido com dados da nota fiscal pode ser implementada
    // se necessário adicionar campos específicos no schema do banco

    return res.status(200).json({
      success: true,
      data: {
        invoiceNumber: invoiceNumber,
        invoiceHTML: invoiceHTML,
        printerType: printerType
      }
    });

  } catch (error) {
    console.error('Erro ao gerar nota fiscal térmica:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao gerar nota fiscal'
    });
  }
};

// Gerar múltiplas notas fiscais
export const generateBatchThermalInvoices = async (req: Request, res: Response) => {
  try {
    const { orderIds } = req.body;
    const { printerType = '80mm' } = req.query;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista de IDs de pedidos inválida'
      });
    }

    const results = [];
    const errors = [];

    for (const orderId of orderIds) {
      try {
        // Usar a mesma lógica do método individual
        const mockReq = { params: { orderId: orderId.toString() }, query: { printerType } };
        const mockRes = {
          status: (code: number) => ({
            json: (data: any) => ({ statusCode: code, data })
          })
        };

        // Chamada simulada para reutilizar a lógica
        const result = await generateThermalInvoice(mockReq as any, mockRes as any);
        results.push({
          orderId,
          success: true,
          data: result
        });
      } catch (error) {
        errors.push({
          orderId,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        processed: results.length,
        failed: errors.length,
        results: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Erro ao gerar notas fiscais em lote:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor ao gerar notas fiscais em lote'
    });
  }
};

// Obter configurações da impressora térmica
export const getThermalPrinterConfig = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.appSettings.findFirst();
    
    return res.status(200).json({
      success: true,
      data: {
        defaultPrinterType: '80mm', // Valor padrão
        autoGenerateInvoice: false, // Valor padrão
        companyInfo: await getCompanyInfo()
      }
    });
  } catch (error) {
    console.error('Erro ao obter configurações da impressora:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao obter configurações da impressora térmica'
    });
  }
};

// Atualizar configurações da impressora térmica
export const updateThermalPrinterConfig = async (req: Request, res: Response) => {
  try {
    const { printerType, autoGenerateInvoice, companyInfo } = req.body;

    const updateData: any = {};
    
    if (printerType) {
      updateData.thermalPrinterType = printerType;
    }
    
    if (typeof autoGenerateInvoice === 'boolean') {
      updateData.autoGenerateInvoice = autoGenerateInvoice;
    }

    if (companyInfo) {
      Object.assign(updateData, {
        originCompanyName: companyInfo.name,
        originStreet: companyInfo.address?.split(',')[0],
        originNeighborhood: companyInfo.address?.split(',')[1]?.trim(),
        originCity: companyInfo.city,
        originState: companyInfo.state,
        originZipCode: companyInfo.zipCode,
        originPhone: companyInfo.phone,
        originEmail: companyInfo.email,
        originCnpj: companyInfo.cnpj
      });
    }

    const settings = await prisma.appSettings.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData }
    });

    return res.status(200).json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Erro ao atualizar configurações da impressora:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao atualizar configurações da impressora térmica'
    });
  }
}; 