"use strict";
// Utilitário para tratamento profissional de erros do Mercado Pago
// Baseado na documentação oficial: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/response-handling
Object.defineProperty(exports, "__esModule", { value: true });
exports.MERCADOPAGO_ERROR_CODES = void 0;
exports.processMercadoPagoError = processMercadoPagoError;
exports.validateCPFForMercadoPago = validateCPFForMercadoPago;
exports.formatPhoneForMercadoPago = formatPhoneForMercadoPago;
exports.generateExternalReference = generateExternalReference;
// Mapeamento de códigos de erro específicos do Mercado Pago
exports.MERCADOPAGO_ERROR_CODES = {
    // Erros de cartão
    'invalid_card_number': 'Número do cartão inválido',
    'invalid_expiration_date': 'Data de expiração inválida',
    'invalid_security_code': 'Código de segurança inválido',
    'invalid_issuer': 'Emissor do cartão inválido',
    'rejected_insufficient_amount': 'Cartão sem limite suficiente',
    'rejected_high_risk': 'Pagamento rejeitado por segurança',
    'rejected_duplicated_payment': 'Pagamento duplicado',
    'rejected_call_for_authorize': 'Cartão requer autorização manual',
    'rejected_card_disabled': 'Cartão desabilitado',
    'rejected_bad_filled_card_number': 'Número do cartão mal preenchido',
    'rejected_bad_filled_date': 'Data de expiração mal preenchida',
    'rejected_bad_filled_other': 'Dados do cartão mal preenchidos',
    'rejected_bad_filled_security_code': 'Código de segurança mal preenchido',
    'rejected_blacklist': 'Cartão na lista negra',
    'rejected_card_error': 'Erro no cartão',
    'rejected_max_attempts': 'Máximo de tentativas excedido',
    // Erros de dados pessoais
    '2067': 'CPF/CNPJ inválido',
    'invalid_identification_number': 'Número de identificação inválido',
    'invalid_identification_type': 'Tipo de identificação inválido',
    // Erros de PIX
    'pix_not_enabled': 'PIX não habilitado para esta conta',
    'pix_invalid_amount': 'Valor inválido para PIX',
    // Erros gerais
    'invalid_parameter': 'Parâmetro inválido',
    'missing_parameter': 'Parâmetro obrigatório ausente',
    'invalid_request': 'Requisição inválida',
    'unauthorized': 'Não autorizado - verifique as credenciais',
    'forbidden': 'Acesso negado',
    'not_found': 'Recurso não encontrado',
    'method_not_allowed': 'Método não permitido',
    'internal_server_error': 'Erro interno do Mercado Pago'
};
/**
 * Processa erro do Mercado Pago e retorna mensagem amigável
 */
function processMercadoPagoError(error) {
    var _a, _b;
    // Erro de rede ou timeout
    if (!error.response) {
        return {
            message: 'Erro de conexão com o Mercado Pago. Tente novamente.',
            statusCode: 503,
            isRetryable: true
        };
    }
    const { status, data } = error.response;
    // Erro 403 - Credenciais inválidas
    if (status === 403) {
        return {
            message: 'Credenciais do Mercado Pago inválidas ou expiradas',
            code: 'unauthorized',
            statusCode: 500, // Erro interno para o cliente
            isRetryable: false
        };
    }
    // Erro 401 - Não autorizado
    if (status === 401) {
        return {
            message: 'Não autorizado - verifique as credenciais',
            code: 'unauthorized',
            statusCode: 500,
            isRetryable: false
        };
    }
    // Erro 400 - Dados inválidos
    if (status === 400 && ((_a = data === null || data === void 0 ? void 0 : data.cause) === null || _a === void 0 ? void 0 : _a.length) > 0) {
        const cause = data.cause[0];
        const errorCode = (_b = cause.code) === null || _b === void 0 ? void 0 : _b.toString();
        // Buscar mensagem específica
        const specificMessage = exports.MERCADOPAGO_ERROR_CODES[errorCode];
        if (specificMessage) {
            return {
                message: specificMessage,
                code: errorCode,
                statusCode: 400,
                isRetryable: false
            };
        }
        // Usar descrição do MP se disponível
        if (cause.description) {
            return {
                message: cause.description,
                code: errorCode,
                statusCode: 400,
                isRetryable: false
            };
        }
    }
    // Erro 429 - Rate limit
    if (status === 429) {
        return {
            message: 'Muitas requisições. Aguarde um momento e tente novamente.',
            code: 'rate_limit',
            statusCode: 429,
            isRetryable: true
        };
    }
    // Erro 500+ - Servidor do MP
    if (status >= 500) {
        return {
            message: 'Erro temporário no Mercado Pago. Tente novamente em alguns minutos.',
            code: 'server_error',
            statusCode: 503,
            isRetryable: true
        };
    }
    // Erro genérico
    return {
        message: (data === null || data === void 0 ? void 0 : data.message) || 'Erro no processamento do pagamento',
        code: (data === null || data === void 0 ? void 0 : data.error) || 'unknown_error',
        statusCode: status,
        isRetryable: false
    };
}
/**
 * Valida se um CPF é válido para o Mercado Pago
 */
function validateCPFForMercadoPago(cpf) {
    const cleanCPF = cpf.replace(/\D/g, '');
    // CPFs válidos para teste no Mercado Pago
    const validTestCPFs = [
        '11144477735',
        '12345678909',
        '11111111111', // Válido apenas para testes
        '22222222222', // Válido apenas para testes
        '33333333333' // Válido apenas para testes
    ];
    // Em ambiente de teste, aceitar CPFs específicos
    if (process.env.MERCADOPAGO_ENVIRONMENT === 'sandbox') {
        return validTestCPFs.includes(cleanCPF) || isValidCPF(cleanCPF);
    }
    // Em produção, validar CPF real
    return isValidCPF(cleanCPF);
}
/**
 * Validação básica de CPF
 */
function isValidCPF(cpf) {
    if (cpf.length !== 11)
        return false;
    if (/^(\d)\1{10}$/.test(cpf))
        return false; // Todos os dígitos iguais
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11)
        remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9)))
        return false;
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11)
        remainder = 0;
    return remainder === parseInt(cpf.charAt(10));
}
/**
 * Formata telefone para o padrão do Mercado Pago
 */
function formatPhoneForMercadoPago(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
        return {
            area_code: cleanPhone.substring(0, 2),
            number: cleanPhone.substring(2)
        };
    }
    if (cleanPhone.length === 10) {
        return {
            area_code: cleanPhone.substring(0, 2),
            number: cleanPhone.substring(2)
        };
    }
    // Fallback para telefones inválidos
    return {
        area_code: '11',
        number: '999999999'
    };
}
/**
 * Gera external_reference único
 */
function generateExternalReference(orderId, type = 'user') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}_${orderId}_${timestamp}_${random}`;
}
