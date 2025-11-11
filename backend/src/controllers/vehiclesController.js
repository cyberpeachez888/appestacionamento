import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';
import { logEvent } from '../middleware/auditLogger.js';

// This controller provides a vehicles endpoint for frontend compatibility
// It maps to tickets in the backend

const ticketsTable = 'tickets';

export default {
  async list(req, res) {
    try {
      const { data, error } = await supabase.from(ticketsTable).select('*');
      if (error) return res.status(500).json({ error });
      
      // Map ticket data to vehicle format for frontend
      const vehicles = (data || []).map(ticket => ({
        id: ticket.id,
        plate: ticket.vehicle_plate,
        vehicleType: ticket.vehicle_type,
        entryDate: ticket.entry_time ? new Date(ticket.entry_time).toISOString().split('T')[0] : '',
        entryTime: ticket.entry_time ? new Date(ticket.entry_time).toTimeString().slice(0, 5) : '',
        exitDate: ticket.exit_time ? new Date(ticket.exit_time).toISOString().split('T')[0] : undefined,
        exitTime: ticket.exit_time ? new Date(ticket.exit_time).toTimeString().slice(0, 5) : undefined,
        status: ticket.status === 'closed' ? 'Concluído' : 'Em andamento',
        totalValue: ticket.amount || 0,
        paymentMethod: ticket.metadata?.paymentMethod,
        rateId: ticket.metadata?.rateId || '',
      }));
      
      res.json(vehicles);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async create(req, res) {
    try {
      const id = uuid();
      const entryDateTime = new Date(`${req.body.entryDate}T${req.body.entryTime}`);
      
      const payload = {
        id,
        vehicle_plate: req.body.plate,
        vehicle_type: req.body.vehicleType,
        entry_time: entryDateTime.toISOString(),
        status: 'open',
        metadata: {
          rateId: req.body.rateId,
        },
      };

  const { data, error } = await supabase.from(ticketsTable).insert(payload).select().single();
      if (error) return res.status(500).json({ error });

      // Return in vehicle format
      const vehicle = {
        id: data.id,
        plate: data.vehicle_plate,
        vehicleType: data.vehicle_type,
        entryDate: req.body.entryDate,
        entryTime: req.body.entryTime,
        status: 'Em andamento',
        totalValue: 0,
        rateId: req.body.rateId,
      };

      await logEvent({ actor: req.user, action: 'ticket.create', targetType: 'ticket', targetId: id, details: { plate: req.body.plate } });
      res.status(201).json(vehicle);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      
      // Build update payload
      const updatePayload = {};
      // Desfazer finalização: status 'Em andamento'
      if (req.body.status === 'Em andamento') {
        updatePayload.status = 'open';
        updatePayload.exit_time = null;
        updatePayload.amount = 0;
        updatePayload.metadata = {};
      }
      // Finalizar saída normalmente
      if (req.body.exitDate && req.body.exitTime) {
        const exitDateTime = new Date(`${req.body.exitDate}T${req.body.exitTime}`);
        updatePayload.exit_time = exitDateTime.toISOString();
        updatePayload.status = 'closed';
      }
      if (req.body.totalValue !== undefined) {
        updatePayload.amount = req.body.totalValue;
      }
      if (req.body.paymentMethod) {
        updatePayload.metadata = { paymentMethod: req.body.paymentMethod };
      }

  const { data, error } = await supabase.from(ticketsTable).update(updatePayload).eq('id', id).select().single();
      if (error) return res.status(500).json({ error });

      // Return in vehicle format
      const vehicle = {
        id: data.id,
        plate: data.vehicle_plate,
        vehicleType: data.vehicle_type,
        entryDate: data.entry_time ? new Date(data.entry_time).toISOString().split('T')[0] : '',
        entryTime: data.entry_time ? new Date(data.entry_time).toTimeString().slice(0, 5) : '',
        exitDate: data.exit_time ? new Date(data.exit_time).toISOString().split('T')[0] : undefined,
        exitTime: data.exit_time ? new Date(data.exit_time).toTimeString().slice(0, 5) : undefined,
        status: data.status === 'closed' ? 'Concluído' : 'Em andamento',
        totalValue: data.amount || 0,
        paymentMethod: data.metadata?.paymentMethod,
      };

  // If ticket got closed here (exit handled via /vehicles update), ensure payment record exists
      if (vehicle.status === 'Concluído') {
        try {
          const paymentsResp = await supabase
            .from('payments')
            .select('id')
            .eq('target_type', 'ticket')
            .eq('target_id', id)
            .limit(1);
          const alreadyHasPayment = paymentsResp.data && paymentsResp.data.length > 0;
          if (!alreadyHasPayment) {
            await supabase.from('payments').insert({
              id: uuid(),
              target_type: 'ticket',
              target_id: id,
              date: data.exit_time || new Date().toISOString(),
              value: vehicle.totalValue || 0,
              method: vehicle.paymentMethod || 'cash'
            });
          }
        } catch (paymentErr) {
          console.error('Failed to ensure payment for ticket', id, paymentErr);
          // Do not block response to frontend
        }
      }

      await logEvent({ actor: req.user, action: vehicle.status === 'Concluído' ? 'ticket.close' : 'ticket.update', targetType: 'ticket', targetId: id, details: updatePayload });
      res.json(vehicle);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async remove(req, res) {
    const { id } = req.params;
    const { error } = await supabase.from(ticketsTable).delete().eq('id', id);
    if (error) return res.status(500).json({ error });
    await logEvent({ actor: req.user, action: 'ticket.delete', targetType: 'ticket', targetId: id });
    res.sendStatus(204);
  },
};
