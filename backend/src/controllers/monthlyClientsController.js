import { supabase, isSupabaseConfigured } from '../config/supabase.js';

// In-memory storage fallback
let inMemoryClients = [];

export const createMonthlyClient = async (req, res, next) => {
  try {
    const clientData = {
      ...req.body,
      is_active: req.body.is_active !== undefined ? req.body.is_active : true
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('monthly_clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const client = {
        id: Date.now().toString(),
        ...clientData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemoryClients.push(client);
      return res.status(201).json({
        success: true,
        data: client
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getMonthlyClients = async (req, res, next) => {
  try {
    const { is_active, vehicle_plate } = req.query;

    if (isSupabaseConfigured()) {
      let query = supabase.from('monthly_clients').select('*');

      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }
      if (vehicle_plate) {
        query = query.ilike('vehicle_plate', `%${vehicle_plate}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      let filtered = [...inMemoryClients];
      
      if (is_active !== undefined) {
        filtered = filtered.filter(c => c.is_active === (is_active === 'true'));
      }
      if (vehicle_plate) {
        filtered = filtered.filter(c => 
          c.vehicle_plate.toLowerCase().includes(vehicle_plate.toLowerCase())
        );
      }
      
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      return res.json({
        success: true,
        data: filtered
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getMonthlyClientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('monthly_clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Monthly client not found'
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
      const client = inMemoryClients.find(c => c.id === id);
      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Monthly client not found'
        });
      }
      
      return res.json({
        success: true,
        data: client
      });
    }
  } catch (error) {
    next(error);
  }
};

export const updateMonthlyClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('monthly_clients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Monthly client not found'
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
      const clientIndex = inMemoryClients.findIndex(c => c.id === id);
      if (clientIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Monthly client not found'
        });
      }

      inMemoryClients[clientIndex] = {
        ...inMemoryClients[clientIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };

      return res.json({
        success: true,
        data: inMemoryClients[clientIndex]
      });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteMonthlyClient = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('monthly_clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(204).send();
    } else {
      // In-memory fallback
      const initialLength = inMemoryClients.length;
      inMemoryClients = inMemoryClients.filter(c => c.id !== id);
      
      if (inMemoryClients.length === initialLength) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Monthly client not found'
        });
      }
      
      return res.status(204).send();
    }
  } catch (error) {
    next(error);
  }
};

export const getMonthlyClientHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured()) {
      // Get client tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('monthly_client_id', id)
        .order('entry_time', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Get client payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('monthly_client_id', id)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      return res.json({
        success: true,
        data: {
          tickets: tickets || [],
          payments: payments || []
        }
      });
    } else {
      // In-memory fallback
      return res.json({
        success: true,
        data: {
          tickets: [],
          payments: []
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
