import express from 'express';
import {
  createPayment,
  getPayments,
  getPaymentById,
  getPaymentsByTicket
} from '../controllers/paymentsController.js';
import {
  createPaymentValidator,
  uuidParamValidator
} from '../middleware/validators.js';

const router = express.Router();

router.post('/', createPaymentValidator, createPayment);
router.get('/', getPayments);
router.get('/:id', uuidParamValidator, getPaymentById);
router.get('/ticket/:ticketId', uuidParamValidator, getPaymentsByTicket);

export default router;
