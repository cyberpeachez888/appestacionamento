import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { generateTicketNumber, calculateDuration, calculateParkingFee } from '../utils/calculations.js';

// In-memory storage fallback
let inMemoryTickets = [];

export const createTicket = async (req, res, next) => {
  try {
    const { vehicle_plate, vehicle_type, is_monthly_client, monthly_client_id } = req.body;
    
    const ticketData = {
      ticket_number: generateTicketNumber(),
      vehicle_plate,
      vehicle_type,
      entry_time: new Date().toISOString(),
      is_monthly_client: is_monthly_client || false,
      monthly_client_id: monthly_client_id || null,
      status: 'active'
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tickets')
        .insert([ticketData])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const ticket = {
        id: Date.now().toString(),
        ...ticketData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemoryTickets.push(ticket);
      return res.status(201).json({
        success: true,
        data: ticket
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getTickets = async (req, res, next) => {
  try {
    const { status, start_date, end_date, vehicle_plate } = req.query;

    if (isSupabaseConfigured()) {
      let query = supabase.from('tickets').select('*');

      if (status) query = query.eq('status', status);
      if (vehicle_plate) query = query.ilike('vehicle_plate', `%${vehicle_plate}%`);
      if (start_date) query = query.gte('entry_time', start_date);
      if (end_date) query = query.lte('entry_time', end_date);

      query = query.order('entry_time', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      let filtered = [...inMemoryTickets];
      
      if (status) filtered = filtered.filter(t => t.status === status);
      if (vehicle_plate) filtered = filtered.filter(t => 
        t.vehicle_plate.toLowerCase().includes(vehicle_plate.toLowerCase())
      );
      
      filtered.sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));
      
      return res.json({
        success: true,
        data: filtered
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Ticket not found'
          });
        }
        throw error;
      }

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const ticket = inMemoryTickets.find(t => t.id === id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Ticket not found'
        });
      }
      
      return res.json({
        success: true,
        data: ticket
      });
    }
  } catch (error) {
    next(error);
  }
};

export const checkoutTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exitTime = new Date().toISOString();

    if (isSupabaseConfigured()) {
      // Get the ticket
      const { data: ticket, error: fetchError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Ticket not found'
          });
        }
        throw fetchError;
      }

      if (ticket.status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Ticket already completed'
        });
      }

      // Calculate parking fee
      let amount = 0;
      if (!ticket.is_monthly_client) {
        // Get the appropriate rate
        const { data: rates, error: ratesError } = await supabase
          .from('rates')
          .select('*')
          .eq('vehicle_type', ticket.vehicle_type)
          .eq('rate_type', 'hourly')
          .eq('is_active', true)
          .limit(1);

        if (ratesError) throw ratesError;

        if (rates && rates.length > 0) {
          const duration = calculateDuration(ticket.entry_time, exitTime);
          amount = calculateParkingFee(duration, parseFloat(rates[0].amount), 'hourly');
        }
      }

      // Update ticket
      const { data: updatedTicket, error: updateError } = await supabase
        .from('tickets')
        .update({
          exit_time: exitTime,
          status: 'completed'
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.json({
        success: true,
        data: {
          ...updatedTicket,
          calculated_amount: amount
        }
      });
    } else {
      // In-memory fallback
      const ticketIndex = inMemoryTickets.findIndex(t => t.id === id);
      if (ticketIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Ticket not found'
        });
      }

      const ticket = inMemoryTickets[ticketIndex];
      if (ticket.status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Ticket already completed'
        });
      }

      ticket.exit_time = exitTime;
      ticket.status = 'completed';
      ticket.updated_at = new Date().toISOString();

      return res.json({
        success: true,
        data: {
          ...ticket,
          calculated_amount: 0
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(204).send();
    } else {
      // In-memory fallback
      const initialLength = inMemoryTickets.length;
      inMemoryTickets = inMemoryTickets.filter(t => t.id !== id);
      
      if (inMemoryTickets.length === initialLength) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Ticket not found'
        });
      }
      
      return res.status(204).send();
    }
  } catch (error) {
    next(error);
  }
};
