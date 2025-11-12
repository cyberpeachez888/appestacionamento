/**
 * Pricing Rules Controller
 * Handles CRUD operations for advanced pricing rules
 */

import {
  getRulesForRate,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
} from '../services/pricingCalculator.js';
import { logEvent } from '../middleware/auditLogger.js';

/**
 * Get all pricing rules for a specific rate
 */
export async function getPricingRules(req, res) {
  try {
    const { rateId } = req.params;

    if (!rateId) {
      return res.status(400).json({ error: 'Rate ID is required' });
    }

    const rules = await getRulesForRate(rateId);

    // Convert to camelCase for frontend
    const formattedRules = rules.map(toFrontendFormat);

    res.json(formattedRules);
  } catch (error) {
    console.error('Error fetching pricing rules:', error);
    res.status(500).json({ error: 'Failed to fetch pricing rules' });
  }
}

/**
 * Create a new pricing rule
 */
export async function createRule(req, res) {
  try {
    const ruleData = toBackendFormat(req.body);

    const newRule = await createPricingRule(ruleData);

    // Log the creation
    await logEvent({
      actor: req.user,
      action: 'pricing_rule.create',
      targetType: 'pricing_rule',
      targetId: newRule.id,
      details: { rateId: ruleData.rateId, ruleType: ruleData.ruleType },
    });

    res.status(201).json(toFrontendFormat(newRule));
  } catch (error) {
    console.error('Error creating pricing rule:', error);
    res.status(500).json({ error: error.message || 'Failed to create pricing rule' });
  }
}

/**
 * Update an existing pricing rule
 */
export async function updateRule(req, res) {
  try {
    const { id } = req.params;
    const updates = toBackendFormat(req.body);

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const updatedRule = await updatePricingRule(id, updates);

    // Log the update
    await logEvent({
      actor: req.user,
      action: 'pricing_rule.update',
      targetType: 'pricing_rule',
      targetId: id,
      details: { updates },
    });

    res.json(toFrontendFormat(updatedRule));
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    res.status(500).json({ error: error.message || 'Failed to update pricing rule' });
  }
}

/**
 * Delete a pricing rule
 */
export async function deleteRule(req, res) {
  try {
    const { id } = req.params;

    await deletePricingRule(id);

    // Log the deletion
    await logEvent({
      actor: req.user,
      action: 'pricing_rule.delete',
      targetType: 'pricing_rule',
      targetId: id,
    });

    res.json({ message: 'Pricing rule deleted successfully' });
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    res.status(500).json({ error: error.message || 'Failed to delete pricing rule' });
  }
}

/**
 * Toggle rule active status
 */
export async function toggleRuleStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedRule = await updatePricingRule(id, { is_active: isActive });

    await logEvent({
      actor: req.user,
      action: 'pricing_rule.toggle',
      targetType: 'pricing_rule',
      targetId: id,
      details: { isActive },
    });

    res.json(toFrontendFormat(updatedRule));
  } catch (error) {
    console.error('Error toggling pricing rule status:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle pricing rule status' });
  }
}

/**
 * Convert database format (snake_case) to frontend format (camelCase)
 */
function toFrontendFormat(rule) {
  return {
    id: rule.id,
    rateId: rule.rate_id,
    ruleType: rule.rule_type,
    conditions: rule.conditions,
    valueAdjustment: rule.value_adjustment,
    priority: rule.priority,
    isActive: rule.is_active,
    description: rule.description,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at,
  };
}

/**
 * Convert frontend format (camelCase) to database format (snake_case)
 */
function toBackendFormat(data) {
  const formatted = {};

  if (data.rateId !== undefined) formatted.rateId = data.rateId;
  if (data.ruleType !== undefined) formatted.ruleType = data.ruleType;
  if (data.conditions !== undefined) formatted.conditions = data.conditions;
  if (data.valueAdjustment !== undefined) formatted.valueAdjustment = data.valueAdjustment;
  if (data.priority !== undefined) formatted.priority = data.priority;
  if (data.isActive !== undefined) formatted.isActive = data.isActive;
  if (data.description !== undefined) formatted.description = data.description;

  return formatted;
}
