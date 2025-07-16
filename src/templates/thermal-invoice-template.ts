/**
 * Template para Nota Fiscal Térmica
 * Otimizado para impressoras térmicas de 58mm e 80mm
 * Seguindo padrões brasileiros de NFCe e CF-e
 */

export interface ThermalInvoiceData {
  company: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    cnpj: string;
    phone: string;
    email: string;
  };
  customer: {
    name: string;
    document?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  invoice: {
    number: string;
    date: string;
    total: number;
    subtotal: number;
    tax: number; // Valor do frete
    paymentMethod: string;
  };
  items: Array<{
    code: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  qrCodeDataUrl?: string;
  chaveAcesso?: string;
}

export const generateThermalInvoiceHTML = (data: ThermalInvoiceData, width: '58mm' | '80mm' = '80mm'): string => {
  const isNarrow = width === '58mm';
  const maxWidth = isNarrow ? '58mm' : '80mm';
  const fontSize = isNarrow ? '8pt' : '9pt';
  const fontSizeSmall = isNarrow ? '7pt' : '8pt';
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Nota Fiscal Térmica</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: ${fontSize};
            line-height: 1.2;
            color: #000;
            background: #fff;
            width: ${maxWidth};
            margin: 0 auto;
            padding: 2mm;
        }
        
        .invoice-container {
            width: 100%;
            max-width: ${maxWidth};
        }
        
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .small { font-size: ${fontSizeSmall}; }
        
        .header {
            border-bottom: 1px dashed #000;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
        }
        
        .company-name {
            font-size: ${isNarrow ? '10pt' : '12pt'};
            font-weight: bold;
            text-align: center;
            margin-bottom: 1mm;
        }
        
        .separator {
            border-bottom: 1px dashed #000;
            margin: 2mm 0;
            width: 100%;
        }
        
        .section {
            margin-bottom: 2mm;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .items-table th,
        .items-table td {
            text-align: left;
            padding: 0.5mm 1mm;
            border-bottom: 1px dotted #ccc;
        }
        
        .items-table th {
            font-weight: bold;
            border-bottom: 1px solid #000;
        }
        
        .item-code { width: 15%; }
        .item-desc { width: 45%; }
        .item-qty { width: 10%; text-align: center; }
        .item-price { width: 15%; text-align: right; }
        .item-total { width: 15%; text-align: right; }
        
        .totals {
            border-top: 1px solid #000;
            padding-top: 2mm;
            margin-top: 3mm;
        }
        
        .total-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1mm;
            align-items: center;
        }
        
        .total-line.frete {
            border-top: 1px dotted #666;
            padding-top: 1.5mm;
            margin-top: 1.5mm;
            font-weight: bold;
        }
        
        .grand-total {
            font-weight: bold;
            font-size: ${isNarrow ? '10pt' : '11pt'};
            border-top: 2px solid #000;
            padding-top: 2mm;
            margin-top: 2mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .footer {
            border-top: 1px dashed #000;
            padding-top: 2mm;
            margin-top: 2mm;
            text-align: center;
        }
        
        .qr-code {
            text-align: center;
            margin: 2mm 0;
        }
        
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            .invoice-container {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- CABEÇALHO -->
        <div class="header">
            <div class="company-name">${data.company.name}</div>
            <div class="text-center small">
                ${data.company.address}<br>
                ${data.company.city} - ${data.company.state}<br>
                CEP: ${data.company.zipCode}<br>
                CNPJ: ${data.company.cnpj}<br>
                Tel: ${data.company.phone}
            </div>
        </div>
        
        <!-- DADOS DA NOTA -->
        <div class="section">
            <div class="text-center bold">CUPOM FISCAL ELETRÔNICO</div>
            <div class="text-center small">
                NF-e: ${data.invoice.number}<br>
                ${new Date(data.invoice.date).toLocaleString('pt-BR')}
            </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- DADOS DO CLIENTE -->
        ${data.customer.name ? `
        <div class="section">
            <div class="bold">CLIENTE:</div>
            <div class="small">
                ${data.customer.name}${data.customer.document ? `<br>CPF/CNPJ: ${data.customer.document}` : ''}<br>
                ${data.customer.address}<br>
                ${data.customer.city} - ${data.customer.state}<br>
                CEP: ${data.customer.zipCode}
            </div>
        </div>
        <div class="separator"></div>
        ` : ''}
        
        <!-- ITENS -->
        <div class="section">
            <table class="items-table">
                <thead>
                    <tr>
                        <th class="item-code">ITEM</th>
                        <th class="item-desc">DESCRIÇÃO</th>
                        <th class="item-qty">QTD</th>
                        <th class="item-price">UNIT</th>
                        <th class="item-total">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items.map((item, index) => `
                    <tr>
                        <td class="item-code small">${index + 1}</td>
                        <td class="item-desc small">${item.description}</td>
                        <td class="item-qty small">${item.quantity}</td>
                        <td class="item-price small">R$ ${item.unitPrice.toFixed(2)}</td>
                        <td class="item-total small">R$ ${item.total.toFixed(2)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- TOTAIS -->
        <div class="totals">
            <div class="total-line">
                <span>Subtotal dos Produtos:</span>
                <span>R$ ${data.invoice.subtotal.toFixed(2)}</span>
            </div>
            ${data.invoice.tax > 0 ? `
            <div class="total-line frete">
                <span>FRETE:</span>
                <span>R$ ${data.invoice.tax.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="grand-total">
                <span>TOTAL GERAL:</span>
                <span>R$ ${data.invoice.total.toFixed(2)}</span>
            </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- FORMA DE PAGAMENTO -->
        <div class="section">
            <div class="bold">FORMA DE PAGAMENTO:</div>
            <div>${data.invoice.paymentMethod}</div>
        </div>
        <div class="separator"></div>
        <!-- QR CODE NFC-e -->
        ${data.qrCodeDataUrl ? `
        <div class="qr-code">
            <img src="${data.qrCodeDataUrl}" alt="QR Code NFC-e" style="width: 120px; height: 120px; margin: 0 auto;" />
            <div class="small">Chave de acesso:<br>${data.chaveAcesso || ''}</div>
        </div>
        <div class="separator"></div>
        ` : ''}
        
        <!-- RODAPÉ -->
        <div class="footer">
            <div class="small">
                ${data.company.email}<br>
                OBRIGADO PELA PREFERÊNCIA!<br>
                ${data.company.phone}
            </div>
            <div class="small">
                Documento Auxiliar da NFC-e<br>
                Não permite aproveitamento de crédito de ICMS
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

export const generateThermalInvoiceCSS = (width: '58mm' | '80mm' = '80mm'): string => {
  const isNarrow = width === '58mm';
  
  return `
    @page {
      size: ${width} auto;
      margin: 2mm;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: ${isNarrow ? '8pt' : '9pt'};
      line-height: 1.2;
      color: #000;
      background: #fff;
      width: ${width};
      margin: 0 auto;
    }
    
    .no-print {
      display: none;
    }
    
    @media print {
      .no-print {
        display: none !important;
      }
      
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .page-break {
        page-break-before: always;
      }
    }
  `;
};

export const generateThermalInvoicePDF = async (data: ThermalInvoiceData, width: '58mm' | '80mm' = '80mm'): Promise<Buffer> => {
  const html = generateThermalInvoiceHTML(data, width);
  
  // Aqui você integraria com uma biblioteca como Puppeteer ou jsPDF
  // Para este exemplo, retornamos um buffer simulado
  return Buffer.from(html, 'utf-8');
};

export default {
  generateThermalInvoiceHTML,
  generateThermalInvoiceCSS,
  generateThermalInvoicePDF
}; 