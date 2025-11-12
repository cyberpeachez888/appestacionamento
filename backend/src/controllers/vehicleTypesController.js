import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

// Transform snake_case to camelCase for frontend
function toFrontendFormat(type) {
  return {
    id: type.id,
    name: type.name,
    isDefault: type.is_default,
    createdAt: type.created_at,
  };
}

// Get all vehicle types
export async function getVehicleTypes(req, res) {
  try {
    const { data, error } = await supabase
      .from('vehicle_types')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    const formatted = data.map(toFrontendFormat);
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching vehicle types:', err);
    res.status(500).json({ error: err.message });
  }
}

// Create new vehicle type
export async function createVehicleType(req, res) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Vehicle type name is required' });
    }

    const newType = {
      id: uuidv4(),
      name: name.trim(),
      is_default: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('vehicle_types').insert(newType).select().single();

    if (error) {
      if (error.message?.includes('unique') || error.message?.includes('duplicate')) {
        return res.status(409).json({ error: 'Este tipo de veículo já existe' });
      }
      throw error;
    }

    res.status(201).json(toFrontendFormat(data));
  } catch (err) {
    console.error('Error creating vehicle type:', err);
    res.status(500).json({ error: err.message });
  }
}

// Delete vehicle type (only non-default)
export async function deleteVehicleType(req, res) {
  try {
    const { id } = req.params;

    // Check if it's a default type
    const { data: existing } = await supabase
      .from('vehicle_types')
      .select('is_default')
      .eq('id', id)
      .single();

    if (existing?.is_default) {
      return res.status(403).json({ error: 'Não é possível excluir tipos de veículo padrão' });
    }

    const { error } = await supabase.from('vehicle_types').delete().eq('id', id);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    console.error('Error deleting vehicle type:', err);
    res.status(500).json({ error: err.message });
  }
}
