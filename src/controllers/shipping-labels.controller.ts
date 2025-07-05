import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

// Função para buscar dados da empresa das configurações
async function getSenderInfo() {
  try {
    const { getOriginInfo } = await import('../controllers/settings.controller');
    return await getOriginInfo();
  } catch (error) {
    console.error('Erro ao buscar dados da empresa:', error);
    // Valores padrão em caso de erro
    return {
      name: "Kimono Store",
      address: "Rua das Flores, 123",
      complement: "Sala 45", 
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "01234-567",
      phone: "(11) 99999-9999"
    };
  }
}

// Listar pedidos pagos dos últimos 10 dias (incluindo já impressos)
// Função auxiliar para criar endereço padrão
function createDefaultAddress(order: any) {
  return {
    name: order.customerName || order.user?.name || 'Destinatário',
    street: 'Endereço não disponível',
    number: 'S/N',
    complement: '',
    neighborhood: 'Verificar com cliente',
    city: 'Verificar com cliente',
    state: 'Verificar com cliente',
    zipCode: '00000-000'
  };
}

export const getPendingShippingLabels = async (req: Request, res: Response) => {
  try {
    // Calcular data de 10 dias atrás
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Buscar todos os pedidos pagos dos últimos 10 dias com filtros mais permissivos
    const orders = await prisma.order.findMany({
      where: {
        AND: [
          {
            OR: [
              { status: 'PAID' },
              { status: 'PROCESSING' },
              { status: 'SHIPPED' },
              { status: 'DELIVERED' }
            ]
          },
          { 
            createdAt: {
              gte: tenDaysAgo
            }
          },
          { total: { gt: 0 } }
        ]
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                weight: true
              }
            },
            productVariant: {
              select: {
                size: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { labelPrinted: 'asc' }, // Não impressos primeiro
        { createdAt: 'desc' }
      ]
    });

    console.log(`Encontrados ${orders.length} pedidos pagos nos últimos 10 dias`);

    // Processar dados do endereço de entrega com mais tolerância
    const processedOrders = orders.map(order => {
      let shippingData = null;
      
      console.log(`🔍 Processando pedido ${order.id}:`);
      console.log('- shippingAddress raw:', order.shippingAddress);
      console.log('- shippingAddress length:', order.shippingAddress?.length);
      console.log('- shippingAddress type:', typeof order.shippingAddress);
      
      if (order.shippingAddress && order.shippingAddress.trim() !== '') {
        const addressString = order.shippingAddress.toString().trim();
        
        // Primeiro, tentar como JSON
        if (addressString.startsWith('{')) {
          try {
            const parsedAddress = JSON.parse(addressString);
            console.log('- Endereço parseado como JSON:', parsedAddress);
            console.log('- Chaves do endereço:', Object.keys(parsedAddress));
            
            // Estrutura básica do endereço - verificando diferentes formatos possíveis
            shippingData = {
              name: parsedAddress.name || parsedAddress.recipient || parsedAddress.customerName || order.customerName || order.user?.name || 'Destinatário',
              street: parsedAddress.street || parsedAddress.address || parsedAddress.streetName || parsedAddress.logradouro || 'Rua não informada',
              number: parsedAddress.number || parsedAddress.streetNumber || parsedAddress.numero || 'S/N',
              complement: parsedAddress.complement || parsedAddress.additionalInfo || parsedAddress.complemento || '',
              neighborhood: parsedAddress.neighborhood || parsedAddress.district || parsedAddress.bairro || 'Bairro não informado',
              city: parsedAddress.city || parsedAddress.cidade || 'Cidade não informada',
              state: parsedAddress.state || parsedAddress.uf || parsedAddress.estado || 'Estado não informado',
              zipCode: parsedAddress.zipCode || parsedAddress.cep || parsedAddress.postalCode || '00000-000'
            };
            
            console.log('- Endereço processado do JSON:', shippingData);
            
          } catch (error) {
            console.warn('❌ Erro ao processar JSON do endereço:', error);
            shippingData = createDefaultAddress(order);
          }
        } 
        // Se não é JSON, processar como string formatada
        else {
          console.log('- Processando como endereço formatado:', addressString);
          
          // Padrão brasileiro típico: "Rua Nome, 123, Bairro, Cidade - Estado, CEP"
          // ou "Rua Nome, 123, Bairro, Cidade - Estado CEP"
          
          let street = '', number = '', neighborhood = '', city = '', state = '', zipCode = '';
          
          // Separar por vírgulas
          const parts = addressString.split(',').map(part => part.trim());
          console.log('- Partes separadas por vírgula:', parts);
          
          if (parts.length >= 4) {
            // Formato padrão brasileiro: Rua, Número, Bairro, Cidade - Estado, CEP
            street = parts[0] || '';
            number = parts[1] || 'S/N';
            neighborhood = parts[2] || '';
            
            // A última parte pode ter CEP separado ou junto com cidade/estado
            const lastPart = parts[parts.length - 1] || '';
            let cityStatePart = parts[3] || '';
            
            // Extrair CEP primeiro (formato brasileiro: 12345-123 ou 12345123)
            const cepMatch = addressString.match(/(\d{5}-?\d{3})/);
            if (cepMatch) {
              zipCode = cepMatch[1];
              // Remover CEP da string para processar cidade/estado
              cityStatePart = cityStatePart.replace(cepMatch[1], '').trim();
              // Se CEP estava em parte separada, usar a parte anterior
              if (lastPart.includes(cepMatch[1]) && parts.length > 4) {
                cityStatePart = parts[3];
              }
            }
            
            // Processar cidade e estado (formato: "Cidade - Estado" ou "Cidade/Estado")
            if (cityStatePart.includes(' - ')) {
              const [cityPart, statePart] = cityStatePart.split(' - ');
              city = cityPart.trim();
              state = statePart.trim();
            } else if (cityStatePart.includes('/')) {
              const [cityPart, statePart] = cityStatePart.split('/');
              city = cityPart.trim();
              state = statePart.trim();
            } else {
              // Tentar extrair estado como últimas 2 letras maiúsculas
              const stateMatch = cityStatePart.match(/\b([A-Z]{2})$/);
              if (stateMatch) {
                state = stateMatch[1];
                city = cityStatePart.replace(stateMatch[0], '').trim();
              } else {
                city = cityStatePart;
                // Tentar extrair estado do endereço completo
                const fullStateMatch = addressString.match(/\b([A-Z]{2})\b/);
                if (fullStateMatch) {
                  state = fullStateMatch[1];
                }
              }
            }
          } 
          else if (parts.length >= 3) {
            // Formato mais simples: Rua, Número, Resto
            street = parts[0] || '';
            number = parts[1] || 'S/N';
            
            // Combinar o resto e tentar extrair informações
            const remainingText = parts.slice(2).join(', ');
            
            // Extrair CEP
            const cepMatch = remainingText.match(/(\d{5}-?\d{3})/);
            if (cepMatch) {
              zipCode = cepMatch[1];
            }
            
            // Extrair estado (2 letras maiúsculas)
            const stateMatch = remainingText.match(/\b([A-Z]{2})\b/);
            if (stateMatch) {
              state = stateMatch[1];
            }
            
            // O que sobrar é bairro e cidade
            let cleanText = remainingText.replace(/\d{5}-?\d{3}/, '').replace(/\b[A-Z]{2}\b/, '').replace(/[-,]+$/, '').trim();
            
            // Se tem hífen, provavelmente separa bairro de cidade
            if (cleanText.includes(' - ')) {
              const textParts = cleanText.split(' - ');
              neighborhood = textParts[0]?.trim() || '';
              city = textParts[1]?.trim() || '';
            } else {
              // Assumir que é tudo cidade ou dividir meio a meio
              const words = cleanText.split(/\s+/);
              if (words.length > 2) {
                neighborhood = words.slice(0, Math.floor(words.length / 2)).join(' ');
                city = words.slice(Math.floor(words.length / 2)).join(' ');
              } else {
                city = cleanText;
              }
            }
          }
          else if (parts.length >= 2) {
            // Mínimo: Rua, Número
            street = parts[0] || '';
            number = parts[1] || 'S/N';
            
            // Tentar extrair outras informações do primeiro campo se for muito longo
            if (street.length > 50) {
              const streetParts = street.split(/\s+/);
              if (streetParts.length > 3) {
                street = streetParts.slice(0, 3).join(' ');
                // O resto pode ser bairro
                neighborhood = streetParts.slice(3).join(' ');
              }
            }
            
            city = 'Cidade não informada';
          }
          else {
            // Apenas um campo - provavelmente endereço completo mal formatado
            street = addressString;
            number = 'S/N';
            city = 'Verificar endereço';
          }
          
          // Limpar e formatar campos
          street = street.replace(/^(Rua|Av|Avenida|R\.|Av\.)\s*/i, '').trim();
          number = number.replace(/[^\d\-A-Za-z]/g, '') || 'S/N';
          neighborhood = neighborhood.replace(/^[-,\s]+|[-,\s]+$/g, '');
          city = city.replace(/^[-,\s]+|[-,\s]+$/g, '');
          state = state.replace(/[^A-Z]/g, '');
          zipCode = zipCode.replace(/[^\d\-]/g, '');
          
          // Garantir formato do CEP
          if (zipCode && zipCode.length === 8 && !zipCode.includes('-')) {
            zipCode = zipCode.substring(0, 5) + '-' + zipCode.substring(5);
          }
          
          shippingData = {
            name: order.customerName || order.user?.name || 'Destinatário',
            street: street || 'Endereço não disponível',
            number: number || 'S/N',
            complement: '',
            neighborhood: neighborhood || '',
            city: city || 'Cidade não informada',
            state: state || '',
            zipCode: zipCode || ''
          };
          
          console.log('- Endereço extraído da string:', shippingData);
        }
      } else {
        console.log('- Pedido sem shippingAddress');
        shippingData = createDefaultAddress(order);
      }

      // Calcular peso total aproximado
      const totalWeight = order.items.reduce((sum, item) => {
        const itemWeight = item.product.weight || 0.1; // Peso padrão se não definido
        return sum + (itemWeight * item.quantity);
      }, 0);

      return {
        id: order.id,
        customerName: order.customerName || order.user?.name || shippingData.name,
        customerEmail: order.customerEmail || order.user?.email || '',
        total: Number(order.total),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        shippingData,
        totalWeight: Math.max(totalWeight, 0.1), // Peso mínimo de 100g
        itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          product: {
            id: item.product.id,
            name: item.product.name,
            weight: item.product.weight
          },
          productVariant: item.productVariant ? {
            size: item.productVariant.size
          } : null
        })),
        user: order.user ? {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email
        } : null,
        labelPrinted: order.labelPrinted,
        labelPrintedAt: order.labelPrintedAt?.toISOString() || null,
        hasValidAddress: order.shippingAddress && order.shippingAddress.trim() !== '' && order.shippingAddress !== '{}'
      };
    });

    console.log(`Processados ${processedOrders.length} pedidos para exibição`);

    return res.json({
      success: true,
      orders: processedOrders,
      count: processedOrders.length,
      period: '10 dias',
      filters: {
        pendingCount: processedOrders.filter(o => !o.labelPrinted).length,
        printedCount: processedOrders.filter(o => o.labelPrinted).length,
        validAddressCount: processedOrders.filter(o => o.hasValidAddress).length
      }
    });

  } catch (error) {
    console.error('Erro ao buscar pedidos pendentes:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar pedidos pendentes' 
    });
  }
};

// Gerar etiqueta de envio em PDF
export const generateShippingLabel = async (req: Request, res: Response) => {
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
                weight: true
              }
            },
            productVariant: {
              select: {
                size: true
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

    if (!order.shippingAddress) {
      return res.status(400).json({
        success: false,
        error: 'Pedido não possui endereço de entrega'
      });
    }

    // Processar endereço de entrega usando a mesma lógica da lista
    let shippingData;
    const addressString = order.shippingAddress?.trim();
    
    if (!addressString || addressString === '{}') {
      return res.status(400).json({
        success: false,
        error: 'Endereço de entrega não disponível'
      });
    }

    console.log('Processando endereço do pedido #' + order.id + ':', addressString);

    // Tentar processar como JSON primeiro
    if (addressString.startsWith('{')) {
      try {
        shippingData = JSON.parse(addressString);
        console.log('- Endereço JSON válido:', shippingData);
      } catch (error) {
        console.log('- JSON inválido, processando como string');
        shippingData = createDefaultAddress(order);
      }
    } 
    // Se não é JSON, processar como string formatada usando a mesma lógica
    else {
      console.log('- Processando como endereço formatado:', addressString);
      
      // Padrão brasileiro típico: "Rua Nome, 123, Bairro, Cidade - Estado, CEP"
      // ou "Rua Nome, 123, Bairro, Cidade - Estado CEP"
      
      let street = '', number = '', neighborhood = '', city = '', state = '', zipCode = '';
      
      // Separar por vírgulas
      const parts = addressString.split(',').map(part => part.trim());
      console.log('- Partes separadas por vírgula:', parts);
      
      if (parts.length >= 4) {
        // Formato padrão brasileiro: Rua, Número, Bairro, Cidade - Estado, CEP
        street = parts[0] || '';
        number = parts[1] || 'S/N';
        neighborhood = parts[2] || '';
        
        // A última parte pode ter CEP separado ou junto com cidade/estado
        const lastPart = parts[parts.length - 1] || '';
        let cityStatePart = parts[3] || '';
        
        // Extrair CEP primeiro (formato brasileiro: 12345-123 ou 12345123)
        const cepMatch = addressString.match(/(\d{5}-?\d{3})/);
        if (cepMatch) {
          zipCode = cepMatch[1];
          // Remover CEP da string para processar cidade/estado
          cityStatePart = cityStatePart.replace(cepMatch[1], '').trim();
          // Se CEP estava em parte separada, usar a parte anterior
          if (lastPart.includes(cepMatch[1]) && parts.length > 4) {
            cityStatePart = parts[3];
          }
        }
        
        // Processar cidade e estado (formato: "Cidade - Estado" ou "Cidade/Estado")
        if (cityStatePart.includes(' - ')) {
          const [cityPart, statePart] = cityStatePart.split(' - ');
          city = cityPart.trim();
          state = statePart.trim();
        } else if (cityStatePart.includes('/')) {
          const [cityPart, statePart] = cityStatePart.split('/');
          city = cityPart.trim();
          state = statePart.trim();
        } else {
          // Tentar extrair estado como últimas 2 letras maiúsculas
          const stateMatch = cityStatePart.match(/\b([A-Z]{2})$/);
          if (stateMatch) {
            state = stateMatch[1];
            city = cityStatePart.replace(stateMatch[0], '').trim();
          } else {
            city = cityStatePart;
            // Tentar extrair estado do endereço completo
            const fullStateMatch = addressString.match(/\b([A-Z]{2})\b/);
            if (fullStateMatch) {
              state = fullStateMatch[1];
            }
          }
        }
      } 
      else if (parts.length >= 3) {
        // Formato mais simples: Rua, Número, Resto
        street = parts[0] || '';
        number = parts[1] || 'S/N';
        
        // Combinar o resto e tentar extrair informações
        const remainingText = parts.slice(2).join(', ');
        
        // Extrair CEP
        const cepMatch = remainingText.match(/(\d{5}-?\d{3})/);
        if (cepMatch) {
          zipCode = cepMatch[1];
        }
        
        // Extrair estado (2 letras maiúsculas)
        const stateMatch = remainingText.match(/\b([A-Z]{2})\b/);
        if (stateMatch) {
          state = stateMatch[1];
        }
        
        // O que sobrar é bairro e cidade
        let cleanText = remainingText.replace(/\d{5}-?\d{3}/, '').replace(/\b[A-Z]{2}\b/, '').replace(/[-,]+$/, '').trim();
        
        // Se tem hífen, provavelmente separa bairro de cidade
        if (cleanText.includes(' - ')) {
          const textParts = cleanText.split(' - ');
          neighborhood = textParts[0]?.trim() || '';
          city = textParts[1]?.trim() || '';
        } else {
          // Assumir que é tudo cidade ou dividir meio a meio
          const words = cleanText.split(/\s+/);
          if (words.length > 2) {
            neighborhood = words.slice(0, Math.floor(words.length / 2)).join(' ');
            city = words.slice(Math.floor(words.length / 2)).join(' ');
          } else {
            city = cleanText;
          }
        }
      }
      else if (parts.length >= 2) {
        // Mínimo: Rua, Número
        street = parts[0] || '';
        number = parts[1] || 'S/N';
        
        // Tentar extrair outras informações do primeiro campo se for muito longo
        if (street.length > 50) {
          const streetParts = street.split(/\s+/);
          if (streetParts.length > 3) {
            street = streetParts.slice(0, 3).join(' ');
            // O resto pode ser bairro
            neighborhood = streetParts.slice(3).join(' ');
          }
        }
        
        city = 'Cidade não informada';
      }
      else {
        // Apenas um campo - provavelmente endereço completo mal formatado
        street = addressString;
        number = 'S/N';
        city = 'Verificar endereço';
      }
      
      // Limpar e formatar campos
      street = street.replace(/^(Rua|Av|Avenida|R\.|Av\.)\s*/i, '').trim();
      number = number.replace(/[^\d\-A-Za-z]/g, '') || 'S/N';
      neighborhood = neighborhood.replace(/^[-,\s]+|[-,\s]+$/g, '');
      city = city.replace(/^[-,\s]+|[-,\s]+$/g, '');
      state = state.replace(/[^A-Z]/g, '');
      zipCode = zipCode.replace(/[^\d\-]/g, '');
      
      // Garantir formato do CEP
      if (zipCode && zipCode.length === 8 && !zipCode.includes('-')) {
        zipCode = zipCode.substring(0, 5) + '-' + zipCode.substring(5);
      }
      
      shippingData = {
        name: order.customerName || order.user?.name || 'Destinatário',
        street: street || 'Endereço não disponível',
        number: number || 'S/N',
        complement: '',
        neighborhood: neighborhood || '',
        city: city || 'Cidade não informada',
        state: state || '',
        zipCode: zipCode || ''
      };
      
      console.log('- Endereço extraído da string:', shippingData);
    }

    // Calcular peso total
    const totalWeight = order.items.reduce((sum, item) => {
      const itemWeight = item.product.weight || 0.1;
      return sum + (itemWeight * item.quantity);
    }, 0);

    // Gerar PDF da etiqueta
    const pdfBuffer = await generateLabelPDF(order, shippingData, totalWeight);

    // Configurar headers para download do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="etiqueta-pedido-${orderId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar etiqueta:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar etiqueta de envio'
    });
  }
};

// Marcar etiqueta como impressa
export const markLabelAsPrinted = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({
        success: false,
        error: 'ID do pedido inválido'
      });
    }

    // Atualizar status de impressão
    const updatedOrder = await prisma.order.update({
      where: { id: Number(orderId) },
      data: {
        labelPrinted: true,
        labelPrintedAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: 'Etiqueta marcada como impressa',
      order: {
        id: updatedOrder.id,
        labelPrinted: updatedOrder.labelPrinted,
        labelPrintedAt: updatedOrder.labelPrintedAt
      }
    });

  } catch (error) {
    console.error('Erro ao marcar etiqueta como impressa:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao marcar etiqueta como impressa'
    });
  }
};

// Gerar múltiplas etiquetas em lote
export const generateBatchLabels = async (req: Request, res: Response) => {
  try {
    const { orderIds } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista de pedidos inválida'
      });
    }

    // Buscar pedidos
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds.map(id => Number(id)) },
        shippingAddress: { not: null }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                weight: true
              }
            },
            productVariant: {
              select: {
                size: true
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

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nenhum pedido válido encontrado'
      });
    }

    // Gerar PDF com múltiplas etiquetas
    const pdfBuffer = await generateBatchLabelsPDF(orders);

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="etiquetas-lote-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar etiquetas em lote:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao gerar etiquetas em lote'
    });
  }
};

// Função para gerar PDF da etiqueta individual
async function generateLabelPDF(order: any, shippingData: any, totalWeight: number): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [283.46, 425.20], // 100mm x 150mm em pontos (72 DPI)
        margins: { top: 10, bottom: 10, left: 10, right: 10 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Buscar dados da empresa das configurações
      const senderInfo = await getSenderInfo();

      // Gerar código QR para rastreamento
      const trackingCode = `KIMONO${order.id.toString().padStart(8, '0')}`;
      const qrCodeUrl = await QRCode.toDataURL(trackingCode);
      const qrCodeBuffer = Buffer.from(qrCodeUrl.split(',')[1], 'base64');

      // Cabeçalho - Remetente
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('REMETENTE:', 15, 15);
      doc.fontSize(7).font('Helvetica');
      doc.text(`${senderInfo.name}`, 15, 25);
      doc.text(`${senderInfo.address}`, 15, 35);
      if (senderInfo.complement) {
        doc.text(`${senderInfo.complement}`, 15, 45);
      }
      doc.text(`${senderInfo.neighborhood} - ${senderInfo.city}/${senderInfo.state}`, 15, 55);
      doc.text(`CEP: ${senderInfo.zipCode}`, 15, 65);
      doc.text(`Tel: ${senderInfo.phone}`, 15, 75);

      // Linha separadora
      doc.moveTo(15, 90).lineTo(268, 90).stroke();

      // Destinatário
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('DESTINATÁRIO:', 15, 100);
      doc.fontSize(7).font('Helvetica');
      
      const recipientName = order.customerName || order.user?.name || shippingData.name;
      doc.text(`${recipientName}`, 15, 110);
      doc.text(`${shippingData.street}, ${shippingData.number}`, 15, 120);
      if (shippingData.complement) {
        doc.text(`${shippingData.complement}`, 15, 130);
      }
      doc.text(`${shippingData.neighborhood}`, 15, 140);
      doc.text(`${shippingData.city}/${shippingData.state}`, 15, 150);
      
      // CEP em destaque
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`CEP: ${shippingData.zipCode}`, 15, 165);

      // Informações do pedido
      doc.fontSize(7).font('Helvetica');
      doc.text(`Pedido: #${order.id}`, 15, 185);
      doc.text(`Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`, 15, 195);
      doc.text(`Peso aprox.: ${totalWeight.toFixed(1)}kg`, 15, 205);
      doc.text(`Itens: ${order.items.length}`, 15, 215);

      // Código de barras (simulado com código de rastreamento)
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(trackingCode, 15, 230);

      // QR Code
      doc.image(qrCodeBuffer, 200, 200, { width: 60, height: 60 });

      // Código de rastreamento legível
      doc.fontSize(6).font('Helvetica');
      doc.text('Código de rastreamento:', 15, 270);
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(trackingCode, 15, 280);

      // Instruções de manuseio
      doc.fontSize(6).font('Helvetica');
      doc.text('CORREIOS - ENTREGA EXPRESSA', 15, 300);
      doc.text('Manter em local seco', 15, 310);
      
      // Identificação de serviço
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('PAC', 220, 340);

      // Finalizar documento
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// Função para gerar PDF com múltiplas etiquetas
async function generateBatchLabelsPDF(orders: any[]): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 10, bottom: 10, left: 10, right: 10 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Buscar dados da empresa das configurações
      const senderInfo = await getSenderInfo();

      // Processar cada pedido
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        let shippingData;
        
        // Usar a mesma lógica de parsing robusta
        const addressString = order.shippingAddress?.trim();
        
        if (!addressString || addressString === '{}') {
          console.error(`Endereço vazio para pedido ${order.id}`);
          continue;
        }

        // Tentar processar como JSON primeiro
        if (addressString.startsWith('{')) {
          try {
            shippingData = JSON.parse(addressString);
          } catch (error) {
            console.error(`JSON inválido para pedido ${order.id}, usando fallback`);
            shippingData = createDefaultAddress(order);
          }
        } 
        // Se não é JSON, processar como string formatada
        else {
                     // Padrão brasileiro típico: "Rua Nome, 123, Bairro, Cidade - Estado, CEP"
           let street = '', number = '', neighborhood = '', city = '', state = '', zipCode = '';
           
           const parts = addressString.split(',').map((part: string) => part.trim());
          
          if (parts.length >= 4) {
            street = parts[0] || '';
            number = parts[1] || 'S/N';
            neighborhood = parts[2] || '';
            
            const lastPart = parts[parts.length - 1] || '';
            let cityStatePart = parts[3] || '';
            
            // Extrair CEP
            const cepMatch = addressString.match(/(\d{5}-?\d{3})/);
            if (cepMatch) {
              zipCode = cepMatch[1];
              cityStatePart = cityStatePart.replace(cepMatch[1], '').trim();
              if (lastPart.includes(cepMatch[1]) && parts.length > 4) {
                cityStatePart = parts[3];
              }
            }
            
            // Processar cidade e estado
            if (cityStatePart.includes(' - ')) {
              const [cityPart, statePart] = cityStatePart.split(' - ');
              city = cityPart.trim();
              state = statePart.trim();
            } else if (cityStatePart.includes('/')) {
              const [cityPart, statePart] = cityStatePart.split('/');
              city = cityPart.trim();
              state = statePart.trim();
            } else {
              const stateMatch = cityStatePart.match(/\b([A-Z]{2})$/);
              if (stateMatch) {
                state = stateMatch[1];
                city = cityStatePart.replace(stateMatch[0], '').trim();
              } else {
                city = cityStatePart;
                const fullStateMatch = addressString.match(/\b([A-Z]{2})\b/);
                if (fullStateMatch) {
                  state = fullStateMatch[1];
                }
              }
            }
          } 
          else if (parts.length >= 3) {
            street = parts[0] || '';
            number = parts[1] || 'S/N';
            
            const remainingText = parts.slice(2).join(', ');
            const cepMatch = remainingText.match(/(\d{5}-?\d{3})/);
            if (cepMatch) {
              zipCode = cepMatch[1];
            }
            
            const stateMatch = remainingText.match(/\b([A-Z]{2})\b/);
            if (stateMatch) {
              state = stateMatch[1];
            }
            
            let cleanText = remainingText.replace(/\d{5}-?\d{3}/, '').replace(/\b[A-Z]{2}\b/, '').replace(/[-,]+$/, '').trim();
            
            if (cleanText.includes(' - ')) {
              const textParts = cleanText.split(' - ');
              neighborhood = textParts[0]?.trim() || '';
              city = textParts[1]?.trim() || '';
            } else {
              const words = cleanText.split(/\s+/);
              if (words.length > 2) {
                neighborhood = words.slice(0, Math.floor(words.length / 2)).join(' ');
                city = words.slice(Math.floor(words.length / 2)).join(' ');
              } else {
                city = cleanText;
              }
            }
          } else {
            street = parts[0] || addressString;
            number = parts[1] || 'S/N';
            city = 'Cidade não informada';
          }
          
          // Limpar e formatar campos
          street = street.replace(/^(Rua|Av|Avenida|R\.|Av\.)\s*/i, '').trim();
          number = number.replace(/[^\d\-A-Za-z]/g, '') || 'S/N';
          neighborhood = neighborhood.replace(/^[-,\s]+|[-,\s]+$/g, '');
          city = city.replace(/^[-,\s]+|[-,\s]+$/g, '');
          state = state.replace(/[^A-Z]/g, '');
          zipCode = zipCode.replace(/[^\d\-]/g, '');
          
          if (zipCode && zipCode.length === 8 && !zipCode.includes('-')) {
            zipCode = zipCode.substring(0, 5) + '-' + zipCode.substring(5);
          }
          
          shippingData = {
            name: order.customerName || order.user?.name || 'Destinatário',
            street: street || 'Endereço não disponível',
            number: number || 'S/N',
            complement: '',
            neighborhood: neighborhood || '',
            city: city || 'Cidade não informada',
            state: state || '',
            zipCode: zipCode || ''
          };
        }

        const totalWeight = order.items.reduce((sum: number, item: any) => {
          const itemWeight = item.product.weight || 0.1;
          return sum + (itemWeight * item.quantity);
        }, 0);

        // Se não é a primeira etiqueta, adicionar nova página
        if (i > 0) {
          doc.addPage();
        }

        // Gerar conteúdo da etiqueta (similar ao individual, mas ajustado para A4)
        const trackingCode = `KIMONO${order.id.toString().padStart(8, '0')}`;
        
        // Título da etiqueta
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`ETIQUETA DE ENVIO - PEDIDO #${order.id}`, 50, 50);
        
        // Remetente
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('REMETENTE:', 50, 80);
        doc.fontSize(7).font('Helvetica');
              doc.text(`${senderInfo.name}`, 50, 95);
      doc.text(`${senderInfo.address}`, 50, 105);
      doc.text(`${senderInfo.neighborhood} - ${senderInfo.city}/${senderInfo.state}`, 50, 115);
      doc.text(`CEP: ${senderInfo.zipCode}`, 50, 125);

        // Destinatário
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('DESTINATÁRIO:', 50, 150);
        doc.fontSize(7).font('Helvetica');
        
        const recipientName = order.customerName || order.user?.name || shippingData.name;
        doc.text(`${recipientName}`, 50, 165);
        doc.text(`${shippingData.street}, ${shippingData.number}`, 50, 175);
        if (shippingData.complement) {
          doc.text(`${shippingData.complement}`, 50, 185);
        }
        doc.text(`${shippingData.neighborhood}`, 50, 195);
        doc.text(`${shippingData.city}/${shippingData.state}`, 50, 205);
        
        // CEP
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`CEP: ${shippingData.zipCode}`, 50, 220);

        // Informações adicionais
        doc.fontSize(7).font('Helvetica');
        doc.text(`Data: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`, 50, 240);
        doc.text(`Peso: ${totalWeight.toFixed(1)}kg`, 50, 250);
        doc.text(`Código: ${trackingCode}`, 50, 260);

        // Linha separadora para próxima etiqueta
        if (i < orders.length - 1) {
          doc.moveTo(50, 300).lineTo(550, 300).dash(5, { space: 5 }).stroke();
        }
      }

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// Resetar status de impressão (para teste/correção)
export const resetLabelPrintStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId || isNaN(Number(orderId))) {
      return res.status(400).json({
        success: false,
        error: 'ID do pedido inválido'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(orderId) },
      data: {
        labelPrinted: false,
        labelPrintedAt: null
      }
    });

    return res.json({
      success: true,
      message: 'Status de impressão resetado',
      order: {
        id: updatedOrder.id,
        labelPrinted: updatedOrder.labelPrinted,
        labelPrintedAt: updatedOrder.labelPrintedAt
      }
    });

  } catch (error) {
    console.error('Erro ao resetar status de impressão:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao resetar status de impressão'
    });
  }
}; 