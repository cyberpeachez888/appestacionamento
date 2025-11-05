import { body, param, query, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors.array()
    });
  }
  next();
};

// Ticket validators
export const createTicketValidator = [
  body('vehicle_plate').trim().notEmpty().withMessage('Vehicle plate is required'),
  body('vehicle_type').isIn(['car', 'motorcycle', 'truck']).withMessage('Invalid vehicle type'),
  body('is_monthly_client').optional().isBoolean().withMessage('is_monthly_client must be boolean'),
  body('monthly_client_id').optional().isUUID().withMessage('Invalid monthly client ID'),
  validate
];

export const updateTicketValidator = [
  param('id').isUUID().withMessage('Invalid ticket ID'),
  body('exit_time').optional().isISO8601().withMessage('Invalid exit time format'),
  body('status').optional().isIn(['active', 'completed', 'cancelled']).withMessage('Invalid status'),
  validate
];

// Monthly client validators
export const createMonthlyClientValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('vehicle_plate').trim().notEmpty().withMessage('Vehicle plate is required'),
  body('vehicle_type').trim().notEmpty().withMessage('Vehicle type is required'),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('start_date').isISO8601().withMessage('Invalid start date format'),
  body('end_date').isISO8601().withMessage('Invalid end date format'),
  body('monthly_fee').isDecimal().withMessage('Monthly fee must be a valid number'),
  validate
];

export const updateMonthlyClientValidator = [
  param('id').isUUID().withMessage('Invalid client ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('vehicle_plate').optional().trim().notEmpty().withMessage('Vehicle plate cannot be empty'),
  body('vehicle_type').optional().trim().notEmpty().withMessage('Vehicle type cannot be empty'),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('start_date').optional().isISO8601().withMessage('Invalid start date format'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date format'),
  body('monthly_fee').optional().isDecimal().withMessage('Monthly fee must be a valid number'),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  validate
];

// Rate validators
export const createRateValidator = [
  body('vehicle_type').trim().notEmpty().withMessage('Vehicle type is required'),
  body('rate_type').isIn(['hourly', 'daily', 'monthly']).withMessage('Invalid rate type'),
  body('amount').isDecimal().withMessage('Amount must be a valid number'),
  body('description').optional().trim(),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  validate
];

export const updateRateValidator = [
  param('id').isUUID().withMessage('Invalid rate ID'),
  body('vehicle_type').optional().trim().notEmpty().withMessage('Vehicle type cannot be empty'),
  body('rate_type').optional().isIn(['hourly', 'daily', 'monthly']).withMessage('Invalid rate type'),
  body('amount').optional().isDecimal().withMessage('Amount must be a valid number'),
  body('description').optional().trim(),
  body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
  validate
];

// Payment validators
export const createPaymentValidator = [
  body('amount').isDecimal().withMessage('Amount must be a valid number'),
  body('payment_method').isIn(['cash', 'card', 'pix']).withMessage('Invalid payment method'),
  body('ticket_id').optional().isUUID().withMessage('Invalid ticket ID'),
  body('monthly_client_id').optional().isUUID().withMessage('Invalid monthly client ID'),
  validate
];

// Receipt validators
export const createReceiptValidator = [
  body('payment_id').isUUID().withMessage('Payment ID is required and must be valid'),
  body('amount').isDecimal().withMessage('Amount must be a valid number'),
  body('ticket_id').optional().isUUID().withMessage('Invalid ticket ID'),
  body('monthly_client_id').optional().isUUID().withMessage('Invalid monthly client ID'),
  validate
];

// Report validators
export const dateRangeValidator = [
  query('start_date').optional().isISO8601().withMessage('Invalid start date format'),
  query('end_date').optional().isISO8601().withMessage('Invalid end date format'),
  validate
];

export const uuidParamValidator = [
  param('id').isUUID().withMessage('Invalid ID format'),
  validate
];
