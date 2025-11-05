import express from 'express';
import {
  createReceipt,
  getReceipts,
  getReceiptById,
  getReceiptByPayment
} from '../controllers/receiptsController.js';
import {
  createReceiptValidator,
  uuidParamValidator
} from '../middleware/validators.js';

const router = express.Router();

router.post('/', createReceiptValidator, createReceipt);
router.get('/', getReceipts);
router.get('/:id', uuidParamValidator, getReceiptById);
router.get('/payment/:paymentId', uuidParamValidator, getReceiptByPayment);

export default router;
