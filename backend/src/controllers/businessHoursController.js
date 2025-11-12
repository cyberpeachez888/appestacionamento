import { supabase } from '../config/supabase.js';

const businessHoursController = {
  // List all business hours
  async list(req, res) {
    try {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (error) throw error;

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      console.error('Error listing business hours:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to list business hours',
        error: err.message || err,
      });
    }
  },

  // Get business hour by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      console.error('Error getting business hour:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to get business hour',
        error: err.message || err,
      });
    }
  },

  // Update business hours
  async update(req, res) {
    try {
      const { id } = req.params;
      const payload = req.body;
      payload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('business_hours')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: 'Business hours updated successfully',
      });
    } catch (err) {
      console.error('Error updating business hours:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to update business hours',
        error: err.message || err,
      });
    }
  },

  // Get current operational status
  async getCurrentStatus(req, res) {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
      const today = now.toISOString().split('T')[0];

      // Get today's business hours
      const { data: todayHours, error: hoursError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .single();

      if (hoursError) throw hoursError;

      // Check if today is a holiday
      const { data: holidays, error: holidayError } = await supabase
        .from('holidays')
        .select('*')
        .or(
          `holiday_date.eq.${today},and(is_recurring.eq.true,recurring_month.eq.${now.getMonth() + 1},recurring_day.eq.${now.getDate()})`
        );

      const isHoliday = holidays && holidays.length > 0;

      // Check for active special events
      const { data: events, error: eventsError } = await supabase
        .from('special_events')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today);

      const activeEvents = events || [];

      // Determine if open
      let isOpen = false;
      let reason = '';

      if (isHoliday && holidays[0].is_closed) {
        isOpen = false;
        reason = `Fechado - Feriado: ${holidays[0].holiday_name}`;
      } else if (!todayHours.is_open) {
        isOpen = false;
        reason = 'Fechado - Dia não operacional';
      } else if (currentTime >= todayHours.open_time && currentTime < todayHours.close_time) {
        isOpen = true;
        reason = 'Aberto - Horário normal';
      } else if (todayHours.allow_after_hours) {
        isOpen = true;
        reason = `Aberto - Fora do horário (+${todayHours.after_hours_surcharge_value}% acréscimo)`;
      } else {
        isOpen = false;
        reason = 'Fechado - Fora do horário';
      }

      res.json({
        success: true,
        data: {
          isOpen,
          reason,
          currentDay: dayOfWeek,
          currentTime,
          todayHours,
          isHoliday,
          holidays: holidays || [],
          activeEvents,
        },
      });
    } catch (err) {
      console.error('Error getting current status:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to get current status',
        error: err.message || err,
      });
    }
  },
};

export default businessHoursController;
