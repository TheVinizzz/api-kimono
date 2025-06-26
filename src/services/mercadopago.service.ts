import axios from 'axios';
import config from '../config';
import { OrderStatus } from '@prisma/client';
import { 
  MercadoPagoPayer,
  MercadoPagoPayment, 
  MercadoPagoPreference,
  MercadoPagoPaymentResponse,
  MercadoPagoPreferenceResponse,
  MercadoPagoStatusMapping,
  MercadoPagoPixPayment,
  MercadoPagoPixResponse,
  MercadoPagoCardToken
} from '../types/mercadopago.types';
import { processMercadoPagoError } from '../utils/mercadopago-errors';

// Classe principal do serviço Mercado Pago
class MercadoPagoService {
  private apiUrl: string;
  private accessToken: string;
  private publicKey: string;
  private statusMapping: MercadoPagoStatusMapping;

  constructor() {
    this.apiUrl = config.mercadopago.apiUrl;
    this.accessToken = config.mercadopago.accessToken;
    this.publicKey = config.mercadopago.publicKey;
    
    // Mapeamento de status do Mercado Pago para status de pedido
    this.statusMapping = {
      'pending': 'PENDING',
      'approved': 'PAID',
      'authorized': 'PAID',
      'in_process': 'PENDING',
      'in_mediation': 'PENDING',
      'rejected': 'CANCELED',
      'cancelled': 'CANCELED',
      'refunded': 'CANCELED',
      'charged_back': 'CANCELED'
    };
  }

  // Headers para requisições
  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `${Date.now()}-${Math.random()}`
    };
  }

  // Mapear status do Mercado Pago para status de pedido
  mapMercadoPagoStatusToOrderStatus(mercadoPagoStatus: string): OrderStatus {
    return this.statusMapping[mercadoPagoStatus] || 'PENDING';
  }

  // Criar token de cartão
  async createCardToken(cardData: MercadoPagoCardToken): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/card_tokens`,
        cardData,
        { 
          headers: {
            'Authorization': `Bearer ${this.publicKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.id;
    } catch (error) {
      console.error('Erro ao criar token de cartão no Mercado Pago:', error);
      throw error;
    }
  }

  // Criar um pagamento
  async createPayment(paymentData: MercadoPagoPayment): Promise<MercadoPagoPaymentResponse> {
    try {
      console.log('Enviando requisição para criar pagamento no Mercado Pago:', {
        url: `${this.apiUrl}/v1/payments`,
        data: paymentData
      });
      
      const response = await axios.post(
        `${this.apiUrl}/v1/payments`,
        paymentData,
        { headers: this.getHeaders() }
      );
      
      console.log('Resposta completa da API Mercado Pago:', response.data);
      
      // Para PIX, verificar se há informações específicas
      if (paymentData.payment_method_id && paymentData.payment_method_id === 'pix') {
        console.log('Detalhes do PIX na resposta:');
        console.log('- point_of_interaction:', response.data.point_of_interaction);
        console.log('- qr_code:', response.data.point_of_interaction?.transaction_data?.qr_code);
        console.log('- qr_code_base64:', response.data.point_of_interaction?.transaction_data?.qr_code_base64);
      }
      
      // Para Cartão de Crédito, exibir informações específicas
      if (paymentData.payment_method_id && paymentData.payment_method_id.includes('credit')) {
        console.log('Detalhes do pagamento com Cartão de Crédito:');
        console.log('- status:', response.data.status);
        console.log('- status_detail:', response.data.status_detail);
        console.log('- card:', response.data.card);
        console.log('- authorization_code:', response.data.authorization_code);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Erro ao criar pagamento no Mercado Pago:', error);
      
      // Log detalhado para erros de cartão de crédito
      if (error.response?.data) {
        console.error('Detalhes do erro de pagamento:');
        console.error('- Status:', error.response.status);
        console.error('- Mensagem:', error.response.data.message || error.message);
        console.error('- Código:', error.response.data.error);
        console.error('- Causa:', error.response.data.cause);
        
        // Tratar mensagens de erro específicas
        if (error.response.data.cause) {
          error.response.data.cause.forEach((cause: any) => {
            console.error(`- Erro ${cause.code}: ${cause.description}`);
          });
        }
      }
      
      throw error;
    }
  }

  // Criar uma preferência de pagamento (para múltiplos métodos)
  async createPreference(preferenceData: MercadoPagoPreference): Promise<MercadoPagoPreferenceResponse> {
    try {
      console.log('Criando preferência de pagamento no Mercado Pago:', preferenceData);
      
      const response = await axios.post(
        `${this.apiUrl}/checkout/preferences`,
        preferenceData,
        { headers: this.getHeaders() }
      );
      
      console.log('Preferência criada:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar preferência de pagamento no Mercado Pago:', error);
      throw error;
    }
  }

  // Criar pagamento PIX
  async createPixPayment(pixData: MercadoPagoPixPayment): Promise<MercadoPagoPixResponse> {
    try {
      console.log('🔄 Criando pagamento PIX no Mercado Pago...');
      console.log('📋 Dados enviados:', JSON.stringify(pixData, null, 2));
      
      // Verificar se as credenciais estão configuradas
      if (!this.accessToken || this.accessToken === 'TEST-07005224-3e87-43cb-849c-fa1ce90add06') {
        throw new Error('❌ Credenciais do Mercado Pago não configuradas ou inválidas. Verifique o arquivo .env');
      }
      
      const response = await axios.post(
        `${this.apiUrl}/v1/payments`,
        pixData,
        { headers: this.getHeaders() }
      );
      
      console.log('✅ PIX criado com sucesso:', {
        id: response.data.id,
        status: response.data.status,
        qr_code_available: !!response.data.point_of_interaction?.transaction_data?.qr_code
      });
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao criar pagamento PIX no Mercado Pago:', error);
      
      const processedError = processMercadoPagoError(error);
      throw new Error(processedError.message);
    }
  }

  // Consultar status de um pagamento
  async getPaymentStatus(paymentId: string): Promise<MercadoPagoPaymentResponse> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/payments/${paymentId}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Erro ao consultar status do pagamento:', error);
      throw error;
    }
  }

  // Buscar pagamentos por referência externa (ID do pedido)
  async getPaymentsByExternalReference(externalReference: string): Promise<MercadoPagoPaymentResponse[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/payments/search?external_reference=${externalReference}`,
        { headers: this.getHeaders() }
      );
      
      if (response.data.results && response.data.results.length > 0) {
        return response.data.results;
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar pagamentos por referência externa:', error);
      throw error;
    }
  }

  // Processar webhook do Mercado Pago
  processWebhook(data: any): { action: string, payment: { id: string, status: string }, status: OrderStatus } {
    try {
      console.log('Processando webhook do Mercado Pago:', data);
      
      // Verificar se o webhook é de pagamento
      if (data && data.type === 'payment' && data.data && data.data.id) {
        return {
          action: data.action || 'payment.updated',
          payment: {
            id: data.data.id,
            status: 'pending' // Status será atualizado pela consulta do pagamento
          },
          status: 'PENDING' as OrderStatus
        };
      }
      
      throw new Error('Dados de webhook inválidos');
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      throw error;
    }
  }

  // Obter informações de PIX
  async getPixInfo(paymentId: string): Promise<{ qrCode: string, qrCodeBase64: string }> {
    try {
      console.log('🔍 Obtendo informações do PIX para pagamento:', paymentId);
      
      const payment = await this.getPaymentStatus(paymentId);
      
      console.log('📋 Dados do pagamento PIX:', {
        id: payment.id,
        status: payment.status,
        payment_method_id: payment.payment_method_id,
        has_point_of_interaction: !!payment.point_of_interaction,
        has_transaction_data: !!payment.point_of_interaction?.transaction_data
      });
      
      const qrCode = payment.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;
      
      if (!qrCode && !qrCodeBase64) {
        console.warn('⚠️ QR Code não encontrado na resposta do Mercado Pago');
        console.log('Estrutura completa da resposta:', JSON.stringify(payment, null, 2));
      }
      
      return {
        qrCode: qrCode || '',
        qrCodeBase64: qrCodeBase64 || ''
      };
    } catch (error) {
      console.error('❌ Erro ao obter informações do PIX:', error);
      throw error;
    }
  }

  // Obter métodos de pagamento disponíveis
  async getPaymentMethods(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/payment_methods`,
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erro ao obter métodos de pagamento:', error);
      throw error;
    }
  }

  // Refund de pagamento
  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const refundData = amount ? { amount } : {};
      
      const response = await axios.post(
        `${this.apiUrl}/v1/payments/${paymentId}/refunds`,
        refundData,
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erro ao processar refund:', error);
      throw error;
    }
  }

  // Cancelar pagamento
  async cancelPayment(paymentId: string): Promise<any> {
    try {
      const response = await axios.put(
        `${this.apiUrl}/v1/payments/${paymentId}`,
        { status: 'cancelled' },
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      throw error;
    }
  }

  // Método para processar pagamento com cartão
  async processCardPayment(paymentData: any): Promise<any> {
    try {
      console.log('🏦 Processando pagamento com cartão:', {
        amount: paymentData.transaction_amount,
        method: paymentData.payment_method_id,
        installments: paymentData.installments,
        email: paymentData.payer.email
      });

      // Usar o método createPayment que já existe na classe
      const response = await this.createPayment(paymentData);

      console.log('✅ Pagamento com cartão processado:', {
        id: response.id,
        status: response.status,
        status_detail: response.status_detail
      });

      return response;
    } catch (error: any) {
      console.error('❌ Erro ao processar pagamento com cartão:', error);
      
      // Tratar erros específicos do Mercado Pago
      if (error.response?.data?.cause && error.response.data.cause.length > 0) {
        const mpError = error.response.data.cause[0];
        throw new Error(`Erro no pagamento: ${mpError.description || mpError.message}`);
      }
      
      if (error.response?.data?.message) {
        throw new Error(`Erro no pagamento: ${error.response.data.message}`);
      }
      
      throw new Error('Erro ao processar pagamento com cartão');
    }
  }

  // Método auxiliar para criar token de cartão (versão simplificada)
  async createCardTokenSimple(cardData: any): Promise<string> {
    try {
      console.log('🔄 Criando token de cartão...');

      const tokenData = {
        card_number: cardData.card_number,
        expiration_month: cardData.expiration_month,
        expiration_year: cardData.expiration_year,
        security_code: cardData.security_code,
        cardholder: cardData.cardholder
      };

      const response = await axios.post(
        `${this.apiUrl}/v1/card_tokens`,
        tokenData,
        { 
          headers: {
            'Authorization': `Bearer ${this.publicKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Token criado com sucesso:', response.data.id);
      return response.data.id;
    } catch (error: any) {
      console.error('❌ Erro ao criar token de cartão:', error);
      
      // Log detalhado do erro
      if (error.response?.data) {
        console.error('Detalhes do erro:', {
          status: error.response.status,
          message: error.response.data.message,
          error: error.response.data.error,
          cause: error.response.data.cause
        });
      }
      
      throw error;
    }
  }
}

// Exportar uma instância única do serviço
const mercadoPagoService = new MercadoPagoService();
export default mercadoPagoService; 