import { OrderStatus } from '@prisma/client';

// Tipos de pagamento suportados pelo Mercado Pago
export type MercadoPagoPaymentMethod = 
  | 'credit_card'
  | 'debit_card'
  | 'pix'
  | 'bolbradesco'
  | 'pec'
  | 'ticket';

// Status de pagamento do Mercado Pago
export type MercadoPagoPaymentStatus = 
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

// Informações de pagador para Mercado Pago
export interface MercadoPagoPayer {
  id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  identification?: {
    type: string;
    number: string;
  };
  phone?: {
    area_code?: string;
    number?: string;
  };
  address?: {
    street_name?: string;
    street_number?: string;
    zip_code?: string;
  };
}

// Informações de cartão para Mercado Pago
export interface MercadoPagoCardToken {
  card_number: string;
  security_code: string;
  expiration_month: number;
  expiration_year: number;
  cardholder: {
    name: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

// Dados de pagamento para Mercado Pago
export interface MercadoPagoPayment {
  transaction_amount: number;
  token?: string;
  description: string;
  installments?: number;
  payment_method_id?: string; // Opcional - será detectado automaticamente pelo token
  payer: MercadoPagoPayer;
  external_reference?: string;
  notification_url?: string;
  metadata?: {
    order_id?: string;
  };
}

// Dados para criação de preferência de pagamento
export interface MercadoPagoPreference {
  items: Array<{
    id?: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
  }>;
  payer?: MercadoPagoPayer;
  payment_methods?: {
    excluded_payment_methods?: Array<{ id: string }>;
    excluded_payment_types?: Array<{ id: string }>;
    installments?: number;
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: string;
  external_reference?: string;
  notification_url?: string;
  metadata?: {
    order_id?: string;
  };
}

// Mapeamento de status de pagamento para status de pedido
export interface MercadoPagoStatusMapping {
  [key: string]: OrderStatus;
}

// Resposta de pagamento do Mercado Pago
export interface MercadoPagoPaymentResponse {
  id: number;
  date_created: string;
  date_approved?: string;
  date_last_updated: string;
  money_release_date?: string;
  operation_type: string;
  issuer_id: string;
  payment_method_id: string;
  payment_type_id: string;
  status: MercadoPagoPaymentStatus;
  status_detail: string;
  currency_id: string;
  description: string;
  live_mode: boolean;
  sponsor_id?: number;
  authorization_code?: string;
  money_release_schema?: string;
  taxes_amount: number;
  counter_currency?: string;
  brand_id?: string;
  shipping_amount: number;
  pos_id?: string;
  store_id?: string;
  integrator_id?: string;
  platform_id?: string;
  corporation_id?: string;
  collector_id: number;
  payer: {
    type: string;
    id: string;
    email: string;
    identification: {
      type: string;
      number: string;
    };
    phone: {
      area_code: string;
      number: string;
      extension: string;
    };
    first_name: string;
    last_name: string;
    entity_type: string;
  };
  marketplace_owner?: string;
  metadata: {
    [key: string]: any;
  };
  additional_info?: {
    [key: string]: any;
  };
  order?: {
    type: string;
    id: string;
  };
  external_reference?: string;
  transaction_amount: number;
  transaction_amount_refunded: number;
  coupon_amount: number;
  differential_pricing_id?: string;
  deduction_schema?: string;
  transaction_details: {
    payment_method_reference_id?: string;
    net_received_amount: number;
    total_paid_amount: number;
    overpaid_amount: number;
    external_resource_url?: string;
    installment_amount: number;
    financial_institution?: string;
    payable_deferral_period?: string;
    acquirer_reference?: string;
  };
  fee_details: Array<{
    type: string;
    amount: number;
    fee_payer: string;
  }>;
  charges_details: Array<{
    id: string;
    name: string;
    type: string;
    accounts: {
      from: string;
      to: string;
    };
    client_id: string;
    date_created: string;
    last_updated: string;
  }>;
  captured: boolean;
  binary_mode: boolean;
  call_for_authorize_id?: string;
  statement_descriptor?: string;
  installments: number;
  card?: {
    id?: string;
    first_six_digits?: string;
    last_four_digits?: string;
    expiration_month?: number;
    expiration_year?: number;
    date_created?: string;
    date_last_updated?: string;
    cardholder?: {
      name?: string;
      identification?: {
        number?: string;
        type?: string;
      };
    };
  };
  notification_url?: string;
  refunds: Array<any>;
  processing_mode: string;
  merchant_account_id?: string;
  merchant_number?: string;
  acquirer_reconciliation: Array<any>;
  point_of_interaction?: {
    type: string;
    business_info?: {
      unit: string;
      sub_unit: string;
    };
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
}

// Resposta de preferência do Mercado Pago
export interface MercadoPagoPreferenceResponse {
  id: string;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: string;
  }>;
  payer: MercadoPagoPayer;
  payment_methods: {
    excluded_payment_methods: Array<{ id: string }>;
    excluded_payment_types: Array<{ id: string }>;
    installments: number;
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
  external_reference: string;
  notification_url: string;
  init_point: string;
  sandbox_init_point: string;
  date_created: string;
  collector_id: number;
  client_id: string;
  marketplace: string;
  metadata: {
    [key: string]: any;
  };
}

// Resposta de notificação do webhook
export interface MercadoPagoWebhookEvent {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
}

// Dados para criação de PIX
export interface MercadoPagoPixPayment {
  transaction_amount: number;
  description: string;
  payment_method_id: 'pix';
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  external_reference?: string;
  notification_url?: string;
}

// Resposta de PIX do Mercado Pago
export interface MercadoPagoPixResponse {
  id: number;
  status: MercadoPagoPaymentStatus;
  status_detail: string;
  transaction_amount: number;
  description: string;
  external_reference: string;
  point_of_interaction?: {
    transaction_data?: {
      qr_code_base64?: string;
      qr_code?: string;
    };
  };
  date_created: string;
  date_of_expiration?: string;
} 