/**
 * Validation and Sanitization Middleware
 * Validação e sanitização de dados de entrada
 */

import { body, param, query, validationResult } from 'express-validator';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Configurar DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitizar string contra XSS
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  // Remove todas as tags HTML e mantém apenas texto
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [] });
}

/**
 * Sanitizar objeto recursivamente
 */
export function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

/**
 * Middleware de sanitização de entrada
 * Aplica sanitização em req.body
 * Nota: req.query e req.params são somente leitura no Express,
 * então deixamos o express-validator lidar com eles quando necessário
 */
export function sanitizeInput(req, res, next) {
  // Apenas sanitizar req.body, que é mutável
  // req.query e req.params são objetos especiais do Express que não podem ser modificados diretamente
  // O express-validator já faz sanitização quando usado nos validadores
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
}

/**
 * Middleware para tratar erros de validação
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
}

/**
 * Validadores comuns reutilizáveis
 */
export const validators = {
  // Email
  email: body('email')
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),

  // Login (alfanumérico + underscore, 3-50 caracteres)
  login: body('login')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Login deve ter entre 3 e 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Login deve conter apenas letras, números e underscore'),

  // Senha (mínimo 8 caracteres, maiúscula, minúscula, número, especial)
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter no mínimo 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Senha deve conter: maiúscula, minúscula, número e caractere especial'
    ),

  // Placa de veículo (formato brasileiro)
  plate: body('plate')
    .trim()
    .toUpperCase()
    .matches(/^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/)
    .withMessage('Placa inválida. Use formato ABC1234 ou ABC1D23'),

  // UUID
  uuid: (field = 'id') => param(field).isUUID().withMessage('ID inválido'),

  // Número positivo
  positiveNumber: (field = 'value') =>
    body(field)
      .isFloat({ min: 0 })
      .withMessage('Valor deve ser um número positivo'),

  // String não vazia
  nonEmptyString: (field, minLength = 1, maxLength = 255) =>
    body(field)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(
        `Campo deve ter entre ${minLength} e ${maxLength} caracteres`
      ),

  // Data ISO
  isoDate: (field = 'date') =>
    body(field)
      .isISO8601()
      .withMessage('Data deve estar no formato ISO 8601'),

  // Enum/choice
  enum: (field, allowedValues) =>
    body(field)
      .isIn(allowedValues)
      .withMessage(`Valor deve ser um de: ${allowedValues.join(', ')}`),

  // Query parameters
  queryDate: (field = 'date') =>
    query(field)
      .optional()
      .isISO8601()
      .withMessage('Data deve estar no formato ISO 8601'),

  queryUUID: (field = 'id') =>
    query(field)
      .optional()
      .isUUID()
      .withMessage('ID inválido'),
};

/**
 * Validação específica para criação de usuário
 */
export const validateUserCreate = [
  validators.nonEmptyString('name', 2, 100),
  validators.email,
  validators.login,
  validators.password,
  body('role')
    .optional()
    .isIn(['admin', 'operator'])
    .withMessage('Role deve ser admin ou operator'),
  handleValidationErrors,
];

/**
 * Validação específica para login
 */
export const validateLogin = [
  validators.login.withMessage('Login inválido'),
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  handleValidationErrors,
];

/**
 * Validação específica para mudança de senha
 */
export const validatePasswordChange = [
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Senha atual é obrigatória quando não for primeiro login'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter no mínimo 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Senha deve conter: maiúscula, minúscula, número e caractere especial'
    ),
  handleValidationErrors,
];

/**
 * Validação específica para criação de cliente mensalista
 */
export const validateMonthlyCustomer = [
  validators.nonEmptyString('name', 2, 100),
  validators.plate,
  body('vehicleType')
    .notEmpty()
    .withMessage('Tipo de veículo é obrigatório'),
  validators.positiveNumber('value'),
  body('paymentMethod')
    .isIn(['Dinheiro', 'PIX', 'Cartão', 'Transferência'])
    .withMessage('Método de pagamento inválido'),
  handleValidationErrors,
];

/**
 * Validação específica para criação de ticket
 */
export const validateTicket = [
  validators.plate,
  body('vehicle_type')
    .notEmpty()
    .withMessage('Tipo de veículo é obrigatório'),
  handleValidationErrors,
];

