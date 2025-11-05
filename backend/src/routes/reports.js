import express from 'express';
import {
  getDailyReport,
  getMonthlyReport,
  getSummary,
  getRevenueByVehicleType,
  getDateRangeReport
} from '../controllers/reportsController.js';
import { dateRangeValidator } from '../middleware/validators.js';

const router = express.Router();

router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/summary', getSummary);
router.get('/by-vehicle-type', getRevenueByVehicleType);
router.get('/date-range', dateRangeValidator, getDateRangeReport);

export default router;
