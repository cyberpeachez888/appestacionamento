/**
 * Advanced Pricing Calculator Service
 * Applies time-based pricing rules to calculate final ticket price
 * 
 * Supports:
 * - First hour pricing
 * - Daily maximum caps
 * - Time range multipliers (peak hours)
 * - Hourly progression (different prices for different hour ranges)
 */

import { supabase } from '../config/supabase.js';

/**
 * Calculate ticket price with advanced pricing rules
 * @param {Object} vehicle - Vehicle data with entryDate and entryTime
 * @param {Object} rate - Base rate configuration
 * @param {string} exitDate - Exit date (YYYY-MM-DD)
 * @param {string} exitTime - Exit time (HH:MM)
 * @returns {Promise<{price: number, appliedRules: Array}>}
 */
export async function calculateAdvancedPrice(vehicle, rate, exitDate, exitTime) {
  const entry = new Date(`${vehicle.entryDate}T${vehicle.entryTime}`);
  const exit = new Date(`${exitDate}T${exitTime}`);
  const diffMinutes = Math.floor((exit.getTime() - entry.getTime()) / 60000);
  const diffHours = diffMinutes / 60;

  // Get all active pricing rules for this rate
  const rules = await getPricingRules(rate.id);
  
  // Calculate base price (without rules)
  let basePrice = calculateBasePrice(vehicle, rate, diffMinutes, diffHours);
  let finalPrice = basePrice;
  const appliedRules = [];

  // Apply rules in priority order (lower number = higher priority)
  for (const rule of rules.sort((a, b) => a.priority - b.priority)) {
    const shouldApply = checkRuleConditions(rule, entry, exit, diffHours);
    
    if (shouldApply) {
      const result = applyRule(finalPrice, basePrice, rule, diffHours, diffMinutes, rate);
      finalPrice = result.price;
      appliedRules.push({
        ruleId: rule.id,
        ruleType: rule.rule_type,
        description: rule.description,
        adjustment: result.adjustment
      });
    }
  }

  return {
    price: Math.max(finalPrice, 0), // Never negative
    basePrice,
    appliedRules,
    duration: { hours: Math.floor(diffHours), minutes: diffMinutes % 60 }
  };
}

/**
 * Get active pricing rules for a rate
 */
async function getPricingRules(rateId) {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('rate_id', rateId)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching pricing rules:', error);
    return [];
  }

  return data || [];
}

/**
 * Calculate base price (original logic without rules)
 */
function calculateBasePrice(vehicle, rate, diffMinutes, diffHours) {
  switch (rate.rate_type || rate.rateType) {
    case 'Hora/Fração': {
      const hours = Math.floor(diffMinutes / 60);
      const remainingMinutes = diffMinutes % 60;
      let fractions = hours;
      const courtesyMinutes = rate.courtesy_minutes || rate.courtesyMinutes || 0;
      
      if (remainingMinutes > courtesyMinutes) {
        fractions += 1;
      }
      
      return Math.max(fractions, 1) * (rate.value || 0);
    }
    
    case 'Diária': {
      const days = Math.ceil(diffHours / 24);
      return days * (rate.value || 0);
    }
    
    case 'Pernoite': {
      return rate.value || 0;
    }
    
    case 'Semanal':
    case 'Quinzenal':
    case 'Mensal': {
      // These are typically fixed prices
      return rate.value || 0;
    }
    
    default:
      return 0;
  }
}

/**
 * Check if rule conditions are met
 */
function checkRuleConditions(rule, entryDate, exitDate, diffHours) {
  const conditions = rule.conditions || {};

  // Time range conditions (e.g., peak hours)
  if (rule.rule_type === 'time_range') {
    const exitHour = exitDate.getHours();
    const exitDay = exitDate.getDay(); // 0=Sunday, 1=Monday, etc.

    // Check hour range
    if (conditions.hour_start !== undefined && conditions.hour_end !== undefined) {
      if (exitHour < conditions.hour_start || exitHour >= conditions.hour_end) {
        return false;
      }
    }

    // Check days of week
    if (conditions.days_of_week && Array.isArray(conditions.days_of_week)) {
      if (!conditions.days_of_week.includes(exitDay)) {
        return false;
      }
    }
  }

  // First hour rule - always check
  if (rule.rule_type === 'first_hour') {
    // Only applies if stay is <= 1 hour (with some tolerance)
    return diffHours <= 1.1; // 1 hour + 6 minutes tolerance
  }

  // Daily max - always applicable (will be checked in applyRule)
  if (rule.rule_type === 'daily_max') {
    return true;
  }

  // Hourly progression - always applicable
  if (rule.rule_type === 'hourly_progression') {
    return true;
  }

  return true;
}

/**
 * Apply a pricing rule
 */
function applyRule(currentPrice, basePrice, rule, diffHours, diffMinutes, rate) {
  const adjustment = rule.value_adjustment || {};

  switch (rule.rule_type) {
    case 'first_hour': {
      // Override price for first hour
      if (adjustment.type === 'override') {
        return {
          price: adjustment.value || 0,
          adjustment: `Primeira hora: R$ ${adjustment.value}`
        };
      }
      return { price: currentPrice, adjustment: 'N/A' };
    }

    case 'daily_max': {
      // Cap the price at maximum
      if (adjustment.type === 'cap') {
        const cappedPrice = Math.min(currentPrice, adjustment.value || Infinity);
        return {
          price: cappedPrice,
          adjustment: currentPrice > cappedPrice 
            ? `Limitado ao máximo diário: R$ ${adjustment.value}` 
            : 'Dentro do limite'
        };
      }
      return { price: currentPrice, adjustment: 'N/A' };
    }

    case 'time_range': {
      // Multiply price (e.g., 1.5x for peak hours)
      if (adjustment.type === 'multiplier') {
        const multipliedPrice = currentPrice * (adjustment.value || 1);
        return {
          price: multipliedPrice,
          adjustment: `Multiplicador ${adjustment.value}x aplicado`
        };
      }
      return { price: currentPrice, adjustment: 'N/A' };
    }

    case 'hourly_progression': {
      // Different prices for different hour ranges
      // Example: 1-2h = R$5/h, 3-5h = R$4/h, 6h+ = R$3/h
      if (adjustment.type === 'progressive' && adjustment.ranges) {
        const hours = Math.ceil(diffHours);
        let totalPrice = 0;
        
        for (const range of adjustment.ranges) {
          const rangeStart = range.from || 0;
          const rangeEnd = range.to || Infinity;
          const rangeValue = range.value || 0;

          if (hours > rangeStart) {
            const hoursInRange = Math.min(hours, rangeEnd) - rangeStart;
            if (hoursInRange > 0) {
              totalPrice += hoursInRange * rangeValue;
            }
          }
        }

        return {
          price: totalPrice,
          adjustment: `Preço progressivo aplicado: R$ ${totalPrice.toFixed(2)}`
        };
      }
      return { price: currentPrice, adjustment: 'N/A' };
    }

    default:
      return { price: currentPrice, adjustment: 'Unknown rule type' };
  }
}

/**
 * Get all pricing rules for a rate (for UI display)
 */
export async function getRulesForRate(rateId) {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('rate_id', rateId)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error fetching rules:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a new pricing rule
 */
export async function createPricingRule(ruleData) {
  const { data, error } = await supabase
    .from('pricing_rules')
    .insert([{
      rate_id: ruleData.rateId,
      rule_type: ruleData.ruleType,
      conditions: ruleData.conditions || {},
      value_adjustment: ruleData.valueAdjustment,
      priority: ruleData.priority || 0,
      description: ruleData.description,
      is_active: ruleData.isActive !== false
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create pricing rule: ${error.message}`);
  }

  return data;
}

/**
 * Update a pricing rule
 */
export async function updatePricingRule(ruleId, updates) {
  const { data, error } = await supabase
    .from('pricing_rules')
    .update(updates)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update pricing rule: ${error.message}`);
  }

  return data;
}

/**
 * Delete a pricing rule
 */
export async function deletePricingRule(ruleId) {
  const { error } = await supabase
    .from('pricing_rules')
    .delete()
    .eq('id', ruleId);

  if (error) {
    throw new Error(`Failed to delete pricing rule: ${error.message}`);
  }

  return true;
}
