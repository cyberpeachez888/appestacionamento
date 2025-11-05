import { supabase, isSupabaseConfigured } from '../config/supabase.js';

// In-memory storage fallback
let inMemoryRates = [
  { id: '1', vehicle_type: 'car', rate_type: 'hourly', amount: 6.00, description: 'Hourly rate for cars', is_active: true },
  { id: '2', vehicle_type: 'motorcycle', rate_type: 'hourly', amount: 4.00, description: 'Hourly rate for motorcycles', is_active: true },
  { id: '3', vehicle_type: 'truck', rate_type: 'hourly', amount: 10.00, description: 'Hourly rate for trucks', is_active: true },
  { id: '4', vehicle_type: 'car', rate_type: 'daily', amount: 50.00, description: 'Daily rate for cars', is_active: true },
  { id: '5', vehicle_type: 'car', rate_type: 'monthly', amount: 400.00, description: 'Monthly rate for cars', is_active: true }
];

export const createRate = async (req, res, next) => {
  try {
    const rateData = {
      ...req.body,
      is_active: req.body.is_active !== undefined ? req.body.is_active : true
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('rates')
        .insert([rateData])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const rate = {
        id: Date.now().toString(),
        ...rateData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemoryRates.push(rate);
      return res.status(201).json({
        success: true,
        data: rate
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getRates = async (req, res, next) => {
  try {
    const { vehicle_type, rate_type, is_active } = req.query;

    if (isSupabaseConfigured()) {
      let query = supabase.from('rates').select('*');

      if (vehicle_type) query = query.eq('vehicle_type', vehicle_type);
      if (rate_type) query = query.eq('rate_type', rate_type);
      if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      let filtered = [...inMemoryRates];
      
      if (vehicle_type) filtered = filtered.filter(r => r.vehicle_type === vehicle_type);
      if (rate_type) filtered = filtered.filter(r => r.rate_type === rate_type);
      if (is_active !== undefined) filtered = filtered.filter(r => r.is_active === (is_active === 'true'));
      
      filtered.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      
      return res.json({
        success: true,
        data: filtered
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getRateById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('rates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Rate not found'
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
      const rate = inMemoryRates.find(r => r.id === id);
      if (!rate) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Rate not found'
        });
      }
      
      return res.json({
        success: true,
        data: rate
      });
    }
  } catch (error) {
    next(error);
  }
};

export const updateRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('rates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'Rate not found'
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
      const rateIndex = inMemoryRates.findIndex(r => r.id === id);
      if (rateIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Rate not found'
        });
      }

      inMemoryRates[rateIndex] = {
        ...inMemoryRates[rateIndex],
        ...updateData,
        updated_at: new Date().toISOString()
      };

      return res.json({
        success: true,
        data: inMemoryRates[rateIndex]
      });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteRate = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('rates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(204).send();
    } else {
      // In-memory fallback
      const initialLength = inMemoryRates.length;
      inMemoryRates = inMemoryRates.filter(r => r.id !== id);
      
      if (inMemoryRates.length === initialLength) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Rate not found'
        });
      }
      
      return res.status(204).send();
    }
  } catch (error) {
    next(error);
  }
};

export const getActiveRates = async (req, res, next) => {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('rates')
        .select('*')
        .eq('is_active', true)
        .order('vehicle_type', { ascending: true })
        .order('rate_type', { ascending: true });

      if (error) throw error;

      return res.json({
        success: true,
        data
      });
    } else {
      // In-memory fallback
      const activeRates = inMemoryRates.filter(r => r.is_active);
      
      return res.json({
        success: true,
        data: activeRates
      });
    }
  } catch (error) {
    next(error);
  }
};
