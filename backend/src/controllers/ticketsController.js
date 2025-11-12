import { supabase } from '../config/supabase.js';
import { v4 as uuid } from 'uuid';

const table = 'tickets';

function minutesBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 60000);
}

export default {
  async create(req, res) {
    try {
      const id = uuid();
      const payload = {
        id,
        vehicle_plate: req.body.vehicle_plate,
        vehicle_type: req.body.vehicle_type,
        entry_time: new Date().toISOString(),
        status: 'open',
        metadata: req.body.metadata || null,
      };
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) return res.status(500).json({ error });
      res.status(201).json(data);
    } catch (err) {
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
      const minutes = minutesBetween(ticket.entry_time, exitTime);

      // simplistic rate calculation: find a rate for vehicle_type with unit 'hora' or 'mês' fallback
      const ratesResp = await supabase
        .from('rates')
        .select('*')
        .eq('vehicle_type', ticket.vehicle_type);
      if (ratesResp.error) return res.status(500).json({ error: ratesResp.error });
      const rates = ratesResp.data || [];
      // choose first hourly rate
      const hourly = rates.find((r) => r.unit && r.unit.includes('hora')) || rates[0];
      let amount = 0;
      if (hourly) {
        const hours = Math.ceil(minutes / 60);
        amount = (hourly.value || 0) * hours;
      }

      const { data, error } = await supabase
        .from(table)
        .update({ exit_time: exitTime, duration_minutes: minutes, amount, status: 'closed' })
        .eq('id', id)
        .select()
        .single();
      if (error) return res.status(500).json({ error });

      // register payment record
      await supabase.from('payments').insert({
        id: uuid(),
        target_type: 'ticket',
        target_id: id,
        date: exitTime,
        value: amount,
        method: req.body.method || 'cash',
      });

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async get(req, res) {
    const { id } = req.params;
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) return res.status(404).json({ error });
    res.json(data);
  },
};
