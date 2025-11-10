/**
 * Pricing Rules Routes
 * API endpoints for managing advanced pricing rules
 */

import express from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
  getPricingRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRuleStatus
} from '../controllers/pricingRulesController.js';

const router = express.Router();

/**
 * GET /api/pricing-rules/rate/:rateId
 * Get all pricing rules for a specific rate
 */
router.get('/rate/:rateId', requireAuth, requirePermission('manageRates'), getPricingRules);

/**
 * POST /api/pricing-rules
 * Create a new pricing rule
 */
router.post('/', requireAuth, requirePermission('manageRates'), createRule);

/**
 * PUT /api/pricing-rules/:id
 * Update an existing pricing rule
 */
router.put('/:id', requireAuth, requirePermission('manageRates'), updateRule);

/**
 * DELETE /api/pricing-rules/:id
 * Delete a pricing rule
 */
router.delete('/:id', requireAuth, requirePermission('manageRates'), deleteRule);

/**
 * PATCH /api/pricing-rules/:id/toggle
 * Toggle rule active/inactive status
 */
router.patch('/:id/toggle', requireAuth, requirePermission('manageRates'), toggleRuleStatus);

export default router;
