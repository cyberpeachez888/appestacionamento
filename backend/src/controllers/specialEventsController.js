import { supabase } from '../config/supabase.js';

const specialEventsController = {
  // List all special events
  list: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('special_events')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error listing special events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list special events',
        error: error.message
      });
    }
  },

  // Get event by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('special_events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error getting special event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get special event',
        error: error.message
      });
    }
  },

  // Create new special event
  create: async (req, res) => {
    try {
      const eventData = req.body;

      const { data, error } = await supabase
        .from('special_events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: 'Special event created successfully'
      });
    } catch (error) {
      console.error('Error creating special event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create special event',
        error: error.message
      });
    }
  },

  // Update special event
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const eventData = req.body;
      eventData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('special_events')
        .update(eventData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: 'Special event updated successfully'
      });
    } catch (error) {
      console.error('Error updating special event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update special event',
        error: error.message
      });
    }
  },

  // Delete special event
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('special_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Special event deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting special event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete special event',
        error: error.message
      });
    }
  },

  // Get currently active events
  getActive: async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('special_events')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today);

      if (error) throw error;

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error getting active events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active events',
        error: error.message
      });
    }
  },

  // Check if a specific date has special events
  checkDate: async (req, res) => {
    try {
      const { date } = req.params;

      const { data, error } = await supabase
        .from('special_events')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', date)
        .gte('end_date', date);

      if (error) throw error;

      res.json({
        success: true,
        hasEvents: data && data.length > 0,
        events: data || []
      });
    } catch (error) {
      console.error('Error checking special event date:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check special event date',
        error: error.message
      });
    }
  }
};

export default specialEventsController;
