import express from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  checkoutTicket,
  deleteTicket
} from '../controllers/ticketsController.js';
import {
  createTicketValidator,
  updateTicketValidator,
  uuidParamValidator
} from '../middleware/validators.js';

const router = express.Router();

router.post('/', createTicketValidator, createTicket);
router.get('/', getTickets);
router.get('/:id', uuidParamValidator, getTicketById);
router.put('/:id/checkout', uuidParamValidator, checkoutTicket);
router.delete('/:id', uuidParamValidator, deleteTicket);

export default router;
