import express from 'express';
import {
  createMonthlyClient,
  getMonthlyClients,
  getMonthlyClientById,
  updateMonthlyClient,
  deleteMonthlyClient,
  getMonthlyClientHistory
} from '../controllers/monthlyClientsController.js';
import {
  createMonthlyClientValidator,
  updateMonthlyClientValidator,
  uuidParamValidator
} from '../middleware/validators.js';

const router = express.Router();

router.post('/', createMonthlyClientValidator, createMonthlyClient);
router.get('/', getMonthlyClients);
router.get('/:id', uuidParamValidator, getMonthlyClientById);
router.put('/:id', updateMonthlyClientValidator, updateMonthlyClient);
router.delete('/:id', uuidParamValidator, deleteMonthlyClient);
router.get('/:id/history', uuidParamValidator, getMonthlyClientHistory);

export default router;
