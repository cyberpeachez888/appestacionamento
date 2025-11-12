import { supabase } from '../config/supabase.js';

const WINDOW_TYPES = {
  DAILY: 'daily',
  OVERNIGHT: 'overnight',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
};

const MINUTES_IN_DAY = 24 * 60;

/**
 * Calcula o valor total aplicando as regras avançadas de tarifação.
 * Retorna não só o valor final, mas também sugestões (ex.: migrar para diária).
 */
export async function calculateAdvancedPrice(ticket, rate, exitDate, exitTime, options = {}) {
  const entry = parseDateTime(ticket.entryDate, ticket.entryTime);
  const exit = parseDateTime(exitDate, exitTime);

  if (exit <= entry) {
    throw new Error('Exit time must be after entry time');
  }

  const caches = {
    context: new Map(), // rate.id -> context
    hourlyRates: new Map(), // vehicleType -> hourly rate
  };

  const baseResult = await computeForRate(rate, ticket.vehicleType, entry, exit, caches);
  const suggestions = await evaluateThresholds(baseResult, ticket.vehicleType, entry, exit, caches);

  let appliedResult = baseResult;
  let autoApplied = null;
  const autoCandidate = suggestions
    .filter((s) => s.autoApply && s.targetPrice < appliedResult.total)
    .sort((a, b) => a.targetPrice - b.targetPrice)[0];

  if (autoCandidate) {
    appliedResult = autoCandidate.targetResult;
    autoApplied = { from: baseResult.rate.id, to: autoCandidate.rateId };
  }

  return {
    price: appliedResult.total,
    duration: appliedResult.duration,
    breakdown: appliedResult.breakdown,
    extras: appliedResult.extras,
    appliedRate: {
      id: appliedResult.rate.id,
      type: appliedResult.rate.rate_type,
    },
    suggestions: suggestions.map((s) => ({
      rateId: s.rateId,
      rateType: s.rateType,
      thresholdAmount: s.thresholdAmount,
      targetPrice: s.targetPrice,
      currentPrice: s.currentPrice,
      savings: s.savings,
      autoApply: s.autoApply,
    })),
    autoApplied,
    baseCalculation: {
      rateId: baseResult.rate.id,
      rateType: baseResult.rate.rate_type,
      price: baseResult.total,
    },
  };
}

// ---------------------------------------------------------------------------
// CRUD helpers for pricing rules (mantidos para compatibilidade com o controller)
// ---------------------------------------------------------------------------

export async function getRulesForRate(rateId) {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('rate_id', rateId)
    .order('priority', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch pricing rules: ${error.message}`);
  }
  return data || [];
}

export async function createPricingRule(ruleData) {
  const payload = {
    rate_id: ruleData.rateId,
    rule_type: ruleData.ruleType,
    conditions: ruleData.conditions || {},
    value_adjustment: ruleData.valueAdjustment || null,
    priority: ruleData.priority || 0,
    description: ruleData.description || null,
    is_active: ruleData.isActive !== false,
  };

  const { data, error } = await supabase.from('pricing_rules').insert(payload).select().single();
  if (error) {
    throw new Error(`Failed to create pricing rule: ${error.message}`);
  }
  return data;
}

export async function updatePricingRule(ruleId, updates) {
  const formatted = {};
  if (updates.rateId !== undefined) formatted.rate_id = updates.rateId;
  if (updates.ruleType !== undefined) formatted.rule_type = updates.ruleType;
  if (updates.conditions !== undefined) formatted.conditions = updates.conditions;
  if (updates.valueAdjustment !== undefined) formatted.value_adjustment = updates.valueAdjustment;
  if (updates.priority !== undefined) formatted.priority = updates.priority;
  if (updates.isActive !== undefined) formatted.is_active = updates.isActive;
  if (updates.description !== undefined) formatted.description = updates.description;

  const { data, error } = await supabase
    .from('pricing_rules')
    .update(formatted)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update pricing rule: ${error.message}`);
  }
  return data;
}

export async function deletePricingRule(ruleId) {
  const { error } = await supabase.from('pricing_rules').delete().eq('id', ruleId);
  if (error) {
    throw new Error(`Failed to delete pricing rule: ${error.message}`);
  }
  return true;
}

async function computeForRate(rate, vehicleType, entry, exit, caches) {
  const context = await buildRateContext(rate, vehicleType, caches);
  const calculation = calculateRateAmount(context, entry, exit);
  calculation.rate = context.rate;
  calculation.context = context;
  return calculation;
}

async function buildRateContext(rate, vehicleType, caches) {
  if (caches.context.has(rate.id)) {
    return caches.context.get(rate.id);
  }

  const rateConfig =
    typeof rate.config === 'string' ? safeJsonParse(rate.config, {}) : rate.config || {};

  const [windowsResp, thresholdsResp, rulesResp] = await Promise.all([
    supabase.from('rate_time_windows').select('*').eq('rate_id', rate.id).eq('is_active', true),
    supabase.from('rate_thresholds').select('*').eq('source_rate_id', rate.id),
    supabase.from('pricing_rules').select('*').eq('rate_id', rate.id).eq('is_active', true),
  ]);

  const timeWindows = windowsResp.data || [];
  const thresholdsRaw = thresholdsResp.data || [];
  const pricingRules = rulesResp.data || [];

  const relatedRateIds = new Set();
  for (const window of timeWindows) {
    if (window.extra_rate_id) relatedRateIds.add(window.extra_rate_id);
  }
  for (const threshold of thresholdsRaw) {
    if (threshold.target_rate_id) relatedRateIds.add(threshold.target_rate_id);
  }

  let relatedRatesMap = {};
  if (relatedRateIds.size > 0) {
    const { data: relatedRates } = await supabase
      .from('rates')
      .select('*')
      .in('id', Array.from(relatedRateIds));

    if (relatedRates) {
      relatedRatesMap = Object.fromEntries(relatedRates.map((r) => [r.id, r]));
    }
  }

  const hourlyRate = await fetchHourlyRate(vehicleType, caches, relatedRatesMap);

  const context = {
    rate,
    rateConfig,
    windowsByType: groupWindowsByType(timeWindows),
    thresholds: thresholdsRaw.map((t) => ({
      ...t,
      threshold_amount: Number(t.threshold_amount),
      targetRate: relatedRatesMap[t.target_rate_id],
    })),
    rules: pricingRules,
    relatedRatesMap,
    hourlyRate,
  };

  caches.context.set(rate.id, context);
  return context;
}

async function fetchHourlyRate(vehicleType, caches, relatedRatesMap = {}) {
  if (caches.hourlyRates.has(vehicleType)) {
    return caches.hourlyRates.get(vehicleType);
  }

  const existing = Object.values(relatedRatesMap).find(
    (rate) =>
      normalizeText(rate.vehicle_type) === normalizeText(vehicleType) &&
      normalizeText(rate.rate_type) === 'hora/fracao'
  );

  if (existing) {
    caches.hourlyRates.set(vehicleType, existing);
    return existing;
  }

  const { data } = await supabase
    .from('rates')
    .select('*')
    .eq('vehicle_type', vehicleType)
    .eq('rate_type', 'Hora/Fração')
    .maybeSingle();

  caches.hourlyRates.set(vehicleType, data || null);
  return data || null;
}

function calculateRateAmount(context, entry, exit) {
  const breakdown = [];
  const extras = [];
  let total = 0;

  const rateType = normalizeText(context.rate.rate_type);
  const durationMinutes = minutesBetween(entry, exit);
  const duration = {
    hours: Math.floor(durationMinutes / 60),
    minutes: durationMinutes % 60,
    totalMinutes: durationMinutes,
  };

  switch (rateType) {
    case 'hora/fracao':
    case 'hora-fracao':
    case 'hourly': {
      const hourly = calculateHourlyCharge(context.rate, entry, exit);
      total += hourly.baseAmount + hourly.extraAmount;
      breakdown.push(...hourly.breakdown);
      extras.push(...hourly.extras);
      break;
    }

    case 'diaria':
    case 'daily': {
      const daily = calculateDailyCharge(context, entry, exit);
      total += daily.baseAmount + daily.extraAmount;
      breakdown.push(...daily.breakdown);
      extras.push(...daily.extras);
      break;
    }

    case 'pernoite':
    case 'overnight': {
      const overnight = calculateOvernightCharge(context, entry, exit);
      total += overnight.baseAmount + overnight.extraAmount;
      breakdown.push(...overnight.breakdown);
      extras.push(...overnight.extras);
      break;
    }

    case 'semanal':
    case 'weekly': {
      const weekly = calculatePeriodCharge(context, entry, exit, WINDOW_TYPES.WEEKLY);
      total += weekly.baseAmount + weekly.extraAmount;
      breakdown.push(...weekly.breakdown);
      extras.push(...weekly.extras);
      break;
    }

    case 'quinzenal':
    case 'biweekly': {
      const biweekly = calculatePeriodCharge(context, entry, exit, WINDOW_TYPES.BIWEEKLY);
      total += biweekly.baseAmount + biweekly.extraAmount;
      breakdown.push(...biweekly.breakdown);
      extras.push(...biweekly.extras);
      break;
    }

    case 'mensal':
    case 'mensalista':
    case 'monthly': {
      const mensal = calculateMensalCharge(context, entry, exit);
      total += mensal.baseAmount;
      breakdown.push(...mensal.breakdown);
      break;
    }

    default: {
      const fallback = {
        baseAmount: Number(context.rate.value || 0),
        breakdown: [
          {
            type: 'fixed',
            description: `Tarifa ${context.rate.rate_type}`,
            amount: Number(context.rate.value || 0),
          },
        ],
      };
      total += fallback.baseAmount;
      breakdown.push(...fallback.breakdown);
    }
  }

  return {
    total,
    breakdown,
    extras,
    duration,
  };
}

function calculateHourlyCharge(rate, entry, exit) {
  const minutes = minutesBetween(entry, exit);
  const hourly = calculateHourlyFromMinutes(rate, minutes);

  return {
    baseAmount: hourly.amount,
    extraAmount: 0,
    breakdown: [
      {
        type: 'hourly',
        minutes,
        fractions: hourly.fractions,
        amount: hourly.amount,
        description: 'Tarifa por hora/fração',
      },
    ],
    extras: [],
  };
}

function calculateDailyCharge(context, entry, exit) {
  const dailyWindows = context.windowsByType[WINDOW_TYPES.DAILY] || [];
  const rateValue = Number(context.rate.value || 0);
  const breakdown = [];
  const extras = [];
  let baseAmount = 0;
  let extraAmount = 0;
  let lastWindowEnd = null;

  if (!dailyWindows.length) {
    const days = Math.max(1, Math.ceil(minutesBetween(entry, exit) / MINUTES_IN_DAY));
    baseAmount = days * rateValue;
    breakdown.push({
      type: 'daily',
      amount: baseAmount,
      days,
      description: 'Tarifa diária (padrão)',
    });
    return { baseAmount, extraAmount, breakdown, extras };
  }

  let dayPointer = startOfDay(entry);
  const endDay = startOfDay(exit);

  while (dayPointer <= endDay) {
    const nextDay = addDays(dayPointer, 1);
    let charged = false;

    for (const window of dailyWindows) {
      const { start, end } = materializeWindow(window, dayPointer);
      const overlapMinutes = minutesOverlap(entry, exit, start, end);
      if (overlapMinutes > 0) {
        baseAmount += rateValue;
        breakdown.push({
          type: 'daily',
          windowId: window.id,
          day: dayPointer.toISOString(),
          minutes: overlapMinutes,
          amount: rateValue,
          description: 'Diária aplicada',
        });
        charged = true;
        lastWindowEnd = end;
        break;
      }
    }

    // Se nenhum horário foi aplicado mas estamos no dia inicial e o cliente ainda está estacionado,
    // cobramos uma diária para cobrir o dia.
    if (
      !charged &&
      dayPointer.getTime() === startOfDay(entry).getTime() &&
      entry < nextDay &&
      exit > dayPointer
    ) {
      baseAmount += rateValue;
      breakdown.push({
        type: 'daily',
        day: dayPointer.toISOString(),
        amount: rateValue,
        description: 'Diária aplicada (janela padrão)',
      });
    }

    dayPointer = nextDay;
  }

  // Caso o cliente permaneça além do horário final da diária no último dia, cobrar hora extra.
  if (lastWindowEnd && exit > lastWindowEnd && isSameDay(lastWindowEnd, exit)) {
    const extraMinutes = minutesBetween(lastWindowEnd, exit);
    if (extraMinutes > 0) {
      const hourlyRate = context.hourlyRate || context.rate;
      const hourly = calculateHourlyFromMinutes(hourlyRate, extraMinutes);
      extraAmount += hourly.amount;
      extras.push({
        type: 'daily_extra',
        minutes: extraMinutes,
        fractions: hourly.fractions,
        amount: hourly.amount,
        description: 'Horas extras além da diária',
      });
    }
  }

  return { baseAmount, extraAmount, breakdown, extras };
}

function calculateOvernightCharge(context, entry, exit) {
  const overnightWindows = context.windowsByType[WINDOW_TYPES.OVERNIGHT] || [];
  const rateValue = Number(context.rate.value || 0);
  const breakdown = [];
  const extras = [];
  let baseAmount = 0;
  let extraAmount = 0;

  if (!overnightWindows.length) {
    baseAmount = rateValue;
    breakdown.push({
      type: 'overnight',
      amount: rateValue,
      description: 'Tarifa pernoite (padrão)',
    });
    return { baseAmount, extraAmount, breakdown, extras };
  }

  let dayPointer = startOfDay(entry);
  const lastDay = startOfDay(exit);

  while (dayPointer <= lastDay) {
    const nextDay = addDays(dayPointer, 1);
    let charged = false;

    for (const window of overnightWindows) {
      const { start, end } = materializeWindow(window, dayPointer);
      const overlapMinutes = minutesOverlap(entry, exit, start, end);
      if (overlapMinutes > 0) {
        baseAmount += rateValue;
        breakdown.push({
          type: 'overnight',
          windowId: window.id,
          start: start.toISOString(),
          end: end.toISOString(),
          amount: rateValue,
          description: 'Pernoite aplicada',
        });
        charged = true;

        if (exit > end) {
          const extraMinutes = minutesBetween(end, exit);
          if (extraMinutes > 0) {
            const extraRate =
              (window.extra_rate_id && context.relatedRatesMap[window.extra_rate_id]) ||
              context.hourlyRate ||
              context.rate;
            const hourly = calculateHourlyFromMinutes(extraRate, extraMinutes);
            extraAmount += hourly.amount;
            extras.push({
              type: 'overnight_extra',
              minutes: extraMinutes,
              fractions: hourly.fractions,
              amount: hourly.amount,
              description: 'Horas extras após fim do pernoite',
            });
          }
        }

        break;
      }
    }

    if (
      !charged &&
      dayPointer.getTime() === startOfDay(entry).getTime() &&
      entry < nextDay &&
      exit > dayPointer
    ) {
      baseAmount += rateValue;
      breakdown.push({
        type: 'overnight',
        amount: rateValue,
        description: 'Pernoite aplicada (janela padrão)',
      });
    }

    dayPointer = nextDay;
  }

  return { baseAmount, extraAmount, breakdown, extras };
}

function calculatePeriodCharge(context, entry, exit, periodType) {
  const windows =
    context.windowsByType[periodType] || context.windowsByType[WINDOW_TYPES.WEEKLY] || [];
  const rateValue = Number(context.rate.value || 0);
  const breakdown = [];
  const extras = [];

  const durationMinutes = minutesBetween(entry, exit);
  let limitMinutes = null;

  if (windows.length) {
    const window = windows[0];
    limitMinutes =
      window.duration_limit_minutes ??
      computePeriodLimit(window, periodType === WINDOW_TYPES.WEEKLY ? 7 : 14);
  } else {
    limitMinutes = (periodType === WINDOW_TYPES.WEEKLY ? 7 : 14) * MINUTES_IN_DAY;
  }

  let baseAmount = rateValue;
  let extraAmount = 0;

  breakdown.push({
    type: periodType,
    amount: rateValue,
    limitMinutes,
    actualMinutes: durationMinutes,
    description: `Tarifa ${periodType}`,
  });

  if (durationMinutes > limitMinutes) {
    const extraMinutes = durationMinutes - limitMinutes;
    const hourlyRate = context.hourlyRate || context.rate;
    const hourly = calculateHourlyFromMinutes(hourlyRate, extraMinutes);
    extraAmount += hourly.amount;
    extras.push({
      type: `${periodType}_extra`,
      minutes: extraMinutes,
      fractions: hourly.fractions,
      amount: hourly.amount,
      description: 'Horas extras além da tarifa contratada',
    });
  }

  return { baseAmount, extraAmount, breakdown, extras };
}

function calculateMensalCharge(context, entry, exit) {
  const rateValue = Number(context.rate.value || 0);
  return {
    baseAmount: rateValue,
    extraAmount: 0,
    breakdown: [
      {
        type: 'monthly',
        amount: rateValue,
        description: 'Tarifa mensal',
      },
    ],
    extras: [],
  };
}

async function evaluateThresholds(baseResult, vehicleType, entry, exit, caches) {
  const suggestions = [];

  for (const threshold of baseResult.context.thresholds) {
    if (!threshold.targetRate || threshold.targetRate.id === baseResult.rate.id) continue;

    if (baseResult.total >= threshold.threshold_amount) {
      const targetResult = await computeForRate(
        threshold.targetRate,
        vehicleType,
        entry,
        exit,
        caches
      );
      const suggestion = {
        rateId: threshold.targetRate.id,
        rateType: threshold.targetRate.rate_type,
        thresholdAmount: threshold.threshold_amount,
        targetPrice: targetResult.total,
        currentPrice: baseResult.total,
        savings: baseResult.total - targetResult.total,
        autoApply: threshold.auto_apply,
        targetResult,
      };
      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

function calculateHourlyFromMinutes(rate, minutes, courtesyOverride) {
  const courtesy =
    courtesyOverride ??
    rate?.courtesy_minutes ??
    (typeof rate?.config === 'object' ? rate.config?.courtesyMinutes : 0) ??
    0;

  if (minutes <= 0) {
    return { amount: 0, fractions: 0, minutes: 0, courtesy };
  }

  let fractions = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (fractions === 0) {
    fractions = remaining > 0 ? 1 : 0;
  }

  if (remaining > courtesy) {
    fractions += 1;
  }

  const amount = Number(rate?.value || 0) * Math.max(fractions, 1);
  return { amount, fractions: Math.max(fractions, 1), minutes, courtesy };
}

function groupWindowsByType(windows) {
  const grouped = {
    [WINDOW_TYPES.DAILY]: [],
    [WINDOW_TYPES.OVERNIGHT]: [],
    [WINDOW_TYPES.WEEKLY]: [],
    [WINDOW_TYPES.BIWEEKLY]: [],
  };

  for (const window of windows) {
    const type = normalizeText(window.window_type);
    if (type.includes('daily') || type.includes('diaria')) {
      grouped[WINDOW_TYPES.DAILY].push(window);
    } else if (type.includes('overnight') || type.includes('pernoite')) {
      grouped[WINDOW_TYPES.OVERNIGHT].push(window);
    } else if (type.includes('weekly') || type.includes('semanal')) {
      grouped[WINDOW_TYPES.WEEKLY].push(window);
    } else if (type.includes('biweekly') || type.includes('quinzenal')) {
      grouped[WINDOW_TYPES.BIWEEKLY].push(window);
    }
  }

  return grouped;
}

function materializeWindow(window, dayStart) {
  const start = setTimeOnDate(dayStart, window.start_time);
  let end;

  if (window.end_time) {
    end = setTimeOnDate(dayStart, window.end_time);
    if (end <= start) {
      end = addDays(end, 1);
    }
  } else if (window.duration_limit_minutes) {
    end = addMinutes(start, window.duration_limit_minutes);
  } else {
    end = addMinutes(start, MINUTES_IN_DAY);
  }

  return { start, end };
}

function computePeriodLimit(window, periodDays) {
  if (window.duration_limit_minutes) {
    return window.duration_limit_minutes;
  }

  const startMinutes =
    (window.start_day ?? 0) * MINUTES_IN_DAY + parseTimeToMinutes(window.start_time);
  let endMinutes =
    (window.end_day ?? periodDays - 1) * MINUTES_IN_DAY + parseTimeToMinutes(window.end_time);

  let diff = endMinutes - startMinutes;
  if (diff <= 0) {
    diff += periodDays * MINUTES_IN_DAY;
  }
  return diff;
}

function parseDateTime(dateStr, timeStr = '00:00') {
  if (!dateStr) {
    throw new Error('Date string is required');
  }
  const normalizedTime = timeStr && timeStr.length ? timeStr : '00:00';
  const isoCandidate = normalizedTime.length === 5 ? `${normalizedTime}:00` : normalizedTime;
  const dateTimeString = `${dateStr}T${isoCandidate}`;
  const parsed = new Date(dateTimeString);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date/time combination: ${dateStr} ${timeStr}`);
  }
  return parsed;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map((part) => parseInt(part, 10) || 0);
  return hours * 60 + minutes;
}

function setTimeOnDate(baseDate, timeStr) {
  const result = new Date(baseDate.getTime());
  if (!timeStr) {
    result.setHours(0, 0, 0, 0);
    return result;
  }
  const [hours = '0', minutes = '0', seconds = '0'] = timeStr.split(':');
  result.setHours(Number(hours), Number(minutes), Number(seconds), 0);
  return result;
}

function addDays(date, amount) {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + amount);
  return result;
}

function addMinutes(date, amount) {
  const result = new Date(date.getTime());
  result.setMinutes(result.getMinutes() + amount);
  return result;
}

function startOfDay(date) {
  const result = new Date(date.getTime());
  result.setHours(0, 0, 0, 0);
  return result;
}

function minutesBetween(start, end) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function minutesOverlap(entry, exit, start, end) {
  const overlap =
    Math.min(exit.getTime(), end.getTime()) - Math.max(entry.getTime(), start.getTime());
  return overlap > 0 ? Math.round(overlap / 60000) : 0;
}

function normalizeText(value) {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
