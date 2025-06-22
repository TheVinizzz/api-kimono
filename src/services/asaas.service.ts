import axios from 'axios';
import config from '../config';
import { OrderStatus } from '@prisma/client';
import { 
  AsaasCustomer, 
  AsaasPayment, 
  AsaasPaymentLink,
  AsaasPaymentResponse,
  AsaasStatusMapping,
  AsaasBillingType
} from '../types/asaas.types';

// Classe principal do serviço Asaas
class AsaasService {
  private apiUrl: string;
  private apiKey: string;
  private walletId: string;
  private statusMapping: AsaasStatusMapping;

  constructor() {
    this.apiUrl = config.asaas.apiUrl;
    this.apiKey = config.asaas.apiKey;
    this.walletId = config.asaas.walletId;
    
    // Mapeamento de status do Asaas para status de pedido
    this.statusMapping = {
      'PENDING': 'PENDING',
      'CONFIRMED': 'PAID',
      'RECEIVED': 'PAID',
      'OVERDUE': 'PENDING',
      'REFUNDED': 'CANCELED',
      'RECEIVED_IN_CASH': 'PAID',
      'REFUND_REQUESTED': 'PENDING',
      'CHARGEBACK_REQUESTED': 'PENDING',
      'CHARGEBACK_DISPUTE': 'PENDING',
      'AWAITING_CHARGEBACK_REVERSAL': 'PENDING',
      'DUNNING_REQUESTED': 'PENDING',
      'DUNNING_RECEIVED': 'PAID',
      'AWAITING_RISK_ANALYSIS': 'PENDING'
    };
  }

  // Headers padrão para as requisições
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'ShoppingApp',
      'access_token': this.apiKey
    };
  }

  // Criar um cliente no Asaas
  async createCustomer(customerData: AsaasCustomer): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v3/customers`,
        customerData,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente no Asaas:', error);
      throw error;
    }
  }

  // Buscar cliente por e-mail
  async findCustomerByEmail(email: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v3/customers?email=${email}`,
        { headers: this.getHeaders() }
      );
      
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar cliente no Asaas:', error);
      throw error;
    }
  }

  // Atualizar dados de um cliente
  async updateCustomer(customerId: string, customerData: Partial<AsaasCustomer>): Promise<any> {
    try {
      const response = await axios.put(
        `${this.apiUrl}/v3/customers/${customerId}`,
        customerData,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar cliente no Asaas:', error);
      throw error;
    }
  }

  // Criar um pagamento
  async createPayment(paymentData: AsaasPayment): Promise<AsaasPaymentResponse> {
    try {
      // Remover o walletId do objeto de dados e enviá-lo como parâmetro de consulta
      const { walletId, ...paymentDataWithoutWallet } = {
        ...paymentData,
        walletId: this.walletId
      };
      
      console.log('Enviando requisição para criar pagamento:', {
        url: `${this.apiUrl}/v3/payments?wallet=${this.walletId}`,
        data: paymentDataWithoutWallet
      });
      
      const response = await axios.post(
        `${this.apiUrl}/v3/payments?wallet=${this.walletId}`,
        paymentDataWithoutWallet,
        { headers: this.getHeaders() }
      );
      
      console.log('Resposta completa da API Asaas:', response.data);
      
      // Para PIX, verificar se há informações específicas
      if (paymentDataWithoutWallet.billingType === 'PIX') {
        console.log('Detalhes do PIX na resposta:');
        console.log('- pix:', response.data.pix);
        console.log('- pixQrCode:', response.data.pixQrCode);
        console.log('- pixCodeQrCode:', response.data.pixCodeQrCode);
        console.log('- pixEncodedImage:', response.data.pixEncodedImage);
        console.log('- pixCodeBase64:', response.data.pixCodeBase64);
      }
      
      // Para Cartão de Crédito, exibir informações específicas
      if (paymentDataWithoutWallet.billingType === 'CREDIT_CARD') {
        console.log('Detalhes do pagamento com Cartão de Crédito:');
        console.log('- status:', response.data.status);
        console.log('- creditCardId:', response.data.creditCardId);
        console.log('- creditCardBrand:', response.data.creditCardBrand);
        console.log('- creditCardToken:', response.data.creditCardToken);
        console.log('- lastFourDigits:', response.data.creditCard?.lastFourDigits);
        console.log('- transactionReceiptUrl:', response.data.transactionReceiptUrl);
      }
      
      // Para Cartão de Débito, exibir informações específicas
      if (paymentDataWithoutWallet.billingType === 'DEBIT_CARD') {
        console.log('Detalhes do pagamento com Cartão de Débito:');
        console.log('- status:', response.data.status);
        console.log('- creditCardId:', response.data.creditCardId);
        console.log('- creditCardBrand:', response.data.creditCardBrand);
        console.log('- creditCardToken:', response.data.creditCardToken);
        console.log('- lastFourDigits:', response.data.creditCard?.lastFourDigits);
        console.log('- transactionReceiptUrl:', response.data.transactionReceiptUrl);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar pagamento no Asaas:', error);
      
      // Log detalhado para erros de cartão de crédito
      if (paymentData.billingType === 'CREDIT_CARD' && error.response?.data) {
        console.error('Detalhes do erro de pagamento com cartão de crédito:');
        console.error('- Status:', error.response.status);
        console.error('- Mensagem:', error.response.data.errors?.[0]?.description || error.message);
        console.error('- Código:', error.response.data.errors?.[0]?.code);
        
        // Tratar mensagens de erro específicas de cartão
        const errorCode = error.response.data.errors?.[0]?.code;
        if (errorCode) {
          switch (errorCode) {
            case 'invalid_credit_card':
              console.error('Cartão inválido ou não autorizado pela operadora');
              break;
            case 'expired_card':
              console.error('Cartão expirado');
              break;
            case 'insufficient_funds':
              console.error('Saldo insuficiente');
              break;
            default:
              console.error('Erro desconhecido no processamento do cartão');
          }
        }
      }
      
      // Log detalhado para erros de cartão de débito
      if (paymentData.billingType === 'DEBIT_CARD' && error.response?.data) {
        console.error('Detalhes do erro de pagamento com cartão de débito:');
        console.error('- Status:', error.response.status);
        console.error('- Mensagem:', error.response.data.errors?.[0]?.description || error.message);
        console.error('- Código:', error.response.data.errors?.[0]?.code);
        
        // Tratar mensagens de erro específicas de cartão
        const errorCode = error.response.data.errors?.[0]?.code;
        if (errorCode) {
          switch (errorCode) {
            case 'invalid_credit_card':
              console.error('Cartão inválido ou não autorizado pela operadora');
              break;
            case 'expired_card':
              console.error('Cartão expirado');
              break;
            case 'insufficient_funds':
              console.error('Saldo insuficiente');
              break;
            default:
              console.error('Erro desconhecido no processamento do cartão');
          }
        }
      }
      
      throw error;
    }
  }

  // Criar um link de pagamento
  async createPaymentLink(paymentLinkData: AsaasPaymentLink): Promise<AsaasPaymentResponse> {
    try {
      // Remover o walletId do objeto de dados e enviá-lo como parâmetro de consulta
      const { walletId, ...linkDataWithoutWallet } = {
        ...paymentLinkData,
        walletId: this.walletId
      };
      
      const response = await axios.post(
        `${this.apiUrl}/v3/paymentLinks?wallet=${this.walletId}`,
        linkDataWithoutWallet,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao criar link de pagamento no Asaas:', error);
      throw error;
    }
  }

  // Buscar dados do PIX de um pagamento
  async getPixInfo(paymentId: string): Promise<{ encodedImage: string, payload: string }> {
    try {
      console.log(`Buscando dados do PIX para o pagamento ${paymentId}`);
      
      const response = await axios.get(
        `${this.apiUrl}/v3/payments/${paymentId}/pixQrCode`,
        { headers: this.getHeaders() }
      );
      
      console.log('Dados do PIX recebidos:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dados do PIX:', error);
      throw error;
    }
  }

  // Consultar status de um pagamento
  async getPaymentStatus(paymentId: string): Promise<AsaasPaymentResponse> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v3/payments/${paymentId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao consultar status do pagamento:', error);
      throw error;
    }
  }

  // Buscar pagamentos por referência externa (ID do pedido)
  async getPaymentsByExternalReference(externalReference: string): Promise<AsaasPaymentResponse[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v3/payments?externalReference=${externalReference}`,
        { headers: this.getHeaders() }
      );
      
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar pagamentos por referência externa:', error);
      throw error;
    }
  }

  // Processar webhook do Asaas
  processWebhook(data: any): { event: string, payment: { id: string, status: string }, status: OrderStatus } {
    try {
      console.log('Processando webhook do Asaas:', data);
      
      // Verificar se o evento é relacionado a pagamento
      if (data && data.event && data.payment) {
        return {
          event: data.event,
          payment: {
            id: data.payment.id,
            status: data.payment.status
          },
          status: this.mapAsaasStatusToOrderStatus(data.payment.status)
        };
      }
      
      throw new Error('Dados de webhook inválidos');
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }

  // Mapear status do Asaas para status do pedido
  mapAsaasStatusToOrderStatus(asaasStatus: string): OrderStatus {
    return this.statusMapping[asaasStatus] || 'PENDING';
  }
}

export default new AsaasService(); 