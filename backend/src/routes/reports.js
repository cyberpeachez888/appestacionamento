import express from 'express';
import {
  getDailyReport,
  getMonthlyReport,
  getSummary,
  getRevenueByVehicleType,
  getDateRangeReport
} from '../controllers/reportsController.js';
import { dateRangeValidator, requiredDateRangeValidator } from '../middleware/validators.js';

const router = express.Router();

router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/summary', getSummary);
router.get('/by-vehicle-type', dateRangeValidator, getRevenueByVehicleType);
router.get('/date-range', requiredDateRangeValidator, getDateRangeReport);

export default router;
