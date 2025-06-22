import { OrderStatus } from '@prisma/client';

// Tipos de pagamento suportados pelo Asaas
export type AsaasBillingType = 
  | 'BOLETO' 
  | 'CREDIT_CARD' 
  | 'DEBIT_CARD' 
  | 'PIX' 
  | 'UNDEFINED';

// Status de pagamento do Asaas
export type AsaasPaymentStatus = 
  | 'PENDING' 
  | 'CONFIRMED' 
  | 'RECEIVED' 
  | 'OVERDUE' 
  | 'REFUNDED' 
  | 'RECEIVED_IN_CASH' 
  | 'REFUND_REQUESTED' 
  | 'CHARGEBACK_REQUESTED' 
  | 'CHARGEBACK_DISPUTE' 
  | 'AWAITING_CHARGEBACK_REVERSAL'
  | 'DUNNING_REQUESTED' 
  | 'DUNNING_RECEIVED' 
  | 'AWAITING_RISK_ANALYSIS';

// Informações de cliente para Asaas
export interface AsaasCustomer {
  id?: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
}

// Informações de cartão para Asaas (válido para crédito e débito)
export interface AsaasCardInfo {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

// Informações do titular do cartão para Asaas
export interface AsaasCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
}

// Dados de pagamento para Asaas
export interface AsaasPayment {
  id?: string;
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  creditCard?: AsaasCardInfo;
  creditCardHolderInfo?: AsaasCardHolderInfo;
  remoteIp?: string;
  walletId?: string;
}

// Dados para criação de link de pagamento
export interface AsaasPaymentLink {
  id?: string;
  name: string;
  description?: string;
  value: number;
  billingType?: AsaasBillingType;
  chargeType?: string;
  dueDateLimitDays?: number;
  subscriptionCycle?: string;
  maxInstallmentCount?: number;
  walletId?: string;
}

// Mapeamento de status de pagamento para status de pedido
export interface AsaasStatusMapping {
  [key: string]: OrderStatus;
}

// Resposta de pagamento do Asaas
export interface AsaasPaymentResponse {
  id: string;
  status: AsaasPaymentStatus;
  value: number;
  netValue: number;
  description: string;
  billingType: AsaasBillingType;
  dueDate?: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
  creditCard?: {
    creditCardBrand: string;
    creditCardToken: string;
    lastFourDigits: string;
  };
  transactionReceiptUrl?: string;
  pixQrCode?: string;
  pixCodeBase64?: string;
}

// Resposta de notificação do webhook
export interface AsaasWebhookEvent {
  event: string;
  payment: {
    id: string;
    status: AsaasPaymentStatus;
  };
} 