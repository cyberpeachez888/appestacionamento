import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../middleware/auditLogger.js';
import { calculateAdvancedPrice } from '../services/pricingCalculator.js';

const table = 'tickets';

function minutesBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 60000);
}

function isoParts(isoString) {
  const [datePart, timePart = '00:00:00'] = isoString.split('T');
  return {
    date: datePart,
    time: timePart.slice(0, 8),
  };
}

export default {
  async create(req, res) {
    try {
      const id = uuid();

      const rate = await resolveRate({
        rateId: req.body.tariffId,
        vehicleType: req.body.vehicle_type,
      });

      const entryTimeIso = req.body.entry_time
        ? new Date(req.body.entry_time).toISOString()
        : new Date().toISOString();
      const payload = {
        id,
        vehicle_plate: req.body.vehicle_plate,
        vehicle_type: req.body.vehicle_type,
        entry_time: entryTimeIso,
        status: 'open',
        metadata: req.body.metadata || {},
        tariff_id: rate?.id || null,
        tariff_type: rate?.rate_type || null,
      };

      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) return res.status(500).json({ error });

      await createTicketCoupon({
        ticketId: id,
        type: 'entry',
        metadata: {
          operator: req.user?.login,
          rateId: rate?.id || null,
          rateType: rate?.rate_type || null,
        },
      });

      await logEvent({
        actor: req.user,
        action: 'ticket.create',
        targetType: 'ticket',
        targetId: id,
        details: {
          vehiclePlate: payload.vehicle_plate,
          vehicleType: payload.vehicle_type,
          tariffId: payload.tariff_id,
          tariffType: payload.tariff_type,
        },
      });

      res.status(201).json(data);
    } catch (err) {
      console.error('Ticket create error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async exit(req, res) {
    try {
      const { id } = req.params;
      const ticketResp = await supabase.from(table).select('*').eq('id', id).single();
      if (ticketResp.error) return res.status(404).json({ error: 'Ticket not found' });
      const ticket = ticketResp.data;
      if (ticket.status !== 'open') return res.status(400).json({ error: 'Ticket already closed' });

      const exitTime = new Date().toISOString();
      const rate = await resolveRate({
        rateId: ticket.tariff_id,
        vehicleType: ticket.vehicle_type,
      });

      if (!rate) {
        return res.status(400).json({
          error: 'No rate found for this vehicle type. Configure tarifas antes de finalizar.',
        });
      }

      const entryParts = isoParts(ticket.entry_time);
      const exitParts = isoParts(exitTime);

      const priceResult = await calculateAdvancedPrice(
        {
          entryDate: entryParts.date,
          entryTime: entryParts.time,
          vehicleType: ticket.vehicle_type,
        },
        rate,
        exitParts.date,
        exitParts.time
      );

      const appliedRateId = priceResult.appliedRate?.id || rate.id;
      const appliedRateType = priceResult.appliedRate?.type || rate.rate_type;

      const metadata = ticket.metadata || {};
      metadata.billing = {
        calculatedAt: exitTime,
        baseRateId: rate.id,
        appliedRateId,
        breakdown: priceResult.breakdown,
        extras: priceResult.extras,
        suggestions: priceResult.suggestions,
        autoApplied: priceResult.autoApplied,
      };

      const updatePayload = {
        exit_time: exitTime,
        duration_minutes: minutesBetween(ticket.entry_time, exitTime),
        amount: priceResult.price,
        status: 'closed',
        metadata,
        tariff_id: appliedRateId,
        tariff_type: appliedRateType,
      };

      const { data, error } = await supabase
        .from(table)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) return res.status(500).json({ error });

      await supabase.from('payments').insert({
        id: uuid(),
        target_type: 'ticket',
        target_id: id,
        date: exitTime,
        value: priceResult.price,
        method: req.body.method || 'cash',
        metadata: {
          autoApplied: priceResult.autoApplied,
        },
      });

      await logEvent({
        actor: req.user,
        action: 'ticket.close',
        targetType: 'ticket',
        targetId: id,
        details: {
          amount: priceResult.price,
          durationMinutes: updatePayload.duration_minutes,
          appliedRateId,
          autoApplied: priceResult.autoApplied,
        },
      });

      res.json(data);
    } catch (err) {
      console.error('Ticket exit error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  async get(req, res) {
    const { id } = req.params;
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error });
    res.json(data);
  },

  async changeTariff(req, res) {
    try {
      const { id } = req.params;
      const { rateId, reason } = req.body;

      if (!rateId) return res.status(400).json({ error: 'rateId é obrigatório' });

      const ticketResp = await supabase.from(table).select('*').eq('id', id).single();
      if (ticketResp.error) return res.status(404).json({ error: 'Ticket não encontrado' });
      const ticket = ticketResp.data;
      if (ticket.status !== 'open') {
        return res
          .status(400)
          .json({ error: 'Apenas tickets abertos podem ter a tarifa alterada' });
      }
      if (ticket.tariff_id === rateId) {
        return res.status(400).json({ error: 'Tarifa já aplicada neste ticket' });
      }

      const newRate = await resolveRate({ rateId });
      if (!newRate) return res.status(404).json({ error: 'Tarifa informada não encontrada' });

      const activeCouponsResp = await supabase
        .from('ticket_coupons')
        .select('*')
        .eq('ticket_id', id)
        .eq('type', 'entry')
        .eq('status', 'active');

      const activeCoupons = activeCouponsResp.data || [];
      let lastCouponId = null;
      const now = new Date().toISOString();

      for (const coupon of activeCoupons) {
        await supabase
          .from('ticket_coupons')
          .update({
            status: 'void_tariff_change',
            reissued_reason: reason || 'Troca de tarifa',
            metadata: {
              ...(coupon.metadata || {}),
              voidedAt: now,
              voidedBy: req.user?.login,
            },
          })
          .eq('id', coupon.id);
        lastCouponId = coupon.id;
      }

      const newCoupon = await createTicketCoupon({
        ticketId: id,
        type: 'entry',
        metadata: {
          operator: req.user?.login,
          rateId: newRate.id,
          rateType: newRate.rate_type,
          reissuedReason: reason || 'Troca de tarifa',
        },
        reissuedFrom: lastCouponId,
        reissuedReason: reason || 'Troca de tarifa',
      });

      const metadata = ticket.metadata || {};
      const history = Array.isArray(metadata.tariffHistory) ? metadata.tariffHistory : [];
      history.push({
        changedAt: now,
        changedBy: req.user?.login,
        previousRateId: ticket.tariff_id,
        newRateId: newRate.id,
        reason: reason || 'Troca de tarifa',
        newCouponId: newCoupon.id,
      });
      metadata.tariffHistory = history;

      const updatePayload = {
        tariff_id: newRate.id,
        tariff_type: newRate.rate_type,
        metadata,
        reissued_reason: reason || null,
      };

      const { data, error } = await supabase
        .from(table)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) return res.status(500).json({ error });

      await logEvent({
        actor: req.user,
        action: 'ticket.tariff_change',
        targetType: 'ticket',
        targetId: id,
        details: {
          previousRateId: ticket.tariff_id,
          newRateId: newRate.id,
          reason,
          reissuedCouponId: newCoupon.id,
        },
      });

      res.json(data);
    } catch (err) {
      console.error('Ticket changeTariff error:', err);
      res.status(500).json({ error: err.message || err });
    }
  },
};

async function resolveRate({ rateId, vehicleType }) {
  if (rateId) {
    const { data, error } = await supabase.from('rates').select('*').eq('id', rateId).maybeSingle();
    if (error) throw error;
    return data || null;
  }

  if (!vehicleType) return null;
  const { data, error } = await supabase
    .from('rates')
    .select('*')
    .eq('vehicle_type', vehicleType)
    .order('rate_type', { ascending: true });
  if (error) throw error;
  if (!data || !data.length) return null;

  const hourly =
    data.find((rate) => normalize(rate.rate_type) === 'hora/fracao') ||
    data.find((rate) => normalize(rate.rate_type).includes('hora')) ||
    data[0];
  return hourly;
}

async function createTicketCoupon({ ticketId, type, metadata, reissuedFrom, reissuedReason }) {
  const payload = {
    id: uuid(),
    ticket_id: ticketId,
    type,
    status: 'active',
    metadata: metadata || {},
    reissued_from: reissuedFrom || null,
    reissued_reason: reissuedReason || null,
  };
  const { data, error } = await supabase.from('ticket_coupons').insert(payload).select().single();
  if (error) throw error;
  return data;
}

function normalize(value) {
  if (!value) return '';
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
