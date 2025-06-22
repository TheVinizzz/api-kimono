/**
 * Validação de CPF e CNPJ
 */

/**
 * Valida um CPF
 * @param cpf CPF a ser validado (apenas números)
 * @returns true se o CPF for válido, false caso contrário
 */
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais (CPF inválido, mas passa na verificação matemática)
  if (/^(\d)\1+$/.test(cleanCPF)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  
  const remainder = sum % 11;
  const checkDigit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cleanCPF.charAt(9)) !== checkDigit1) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  
  const remainder2 = sum % 11;
  const checkDigit2 = remainder2 < 2 ? 0 : 11 - remainder2;
  
  return parseInt(cleanCPF.charAt(10)) === checkDigit2;
}

/**
 * Valida um CNPJ
 * @param cnpj CNPJ a ser validado (apenas números)
 * @returns true se o CNPJ for válido, false caso contrário
 */
export function validateCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais (CNPJ inválido, mas passa na verificação matemática)
  if (/^(\d)\1+$/.test(cleanCNPJ)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const remainder = sum % 11;
  const checkDigit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cleanCNPJ.charAt(12)) !== checkDigit1) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const remainder2 = sum % 11;
  const checkDigit2 = remainder2 < 2 ? 0 : 11 - remainder2;
  
  return parseInt(cleanCNPJ.charAt(13)) === checkDigit2;
}

/**
 * Valida um documento (CPF ou CNPJ)
 * @param value Documento a ser validado (pode conter formatação)
 * @returns true se o documento for válido, false caso contrário
 */
export function validateDocument(value: string): boolean {
  // Remove caracteres não numéricos
  const digits = value.replace(/\D/g, '');
  
  if (digits.length === 11) {
    return validateCPF(digits);
  } else if (digits.length === 14) {
    return validateCNPJ(digits);
  }
  
  return false;
} 