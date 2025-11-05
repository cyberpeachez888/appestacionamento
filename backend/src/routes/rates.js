import express from 'express';
import {
  createRate,
  getRates,
  getRateById,
  updateRate,
  deleteRate,
  getActiveRates
} from '../controllers/ratesController.js';
import {
  createRateValidator,
  updateRateValidator,
  uuidParamValidator
} from '../middleware/validators.js';

const router = express.Router();

router.get('/active', getActiveRates);
router.post('/', createRateValidator, createRate);
router.get('/', getRates);
router.get('/:id', uuidParamValidator, getRateById);
router.put('/:id', updateRateValidator, updateRate);
router.delete('/:id', uuidParamValidator, deleteRate);

export default router;
