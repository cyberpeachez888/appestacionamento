import { supabase } from '../config/supabase.js';

const holidaysController = {
  // List all holidays (with optional year filter)
  list: async (req, res) => {
    try {
      const { year } = req.query;
      let query = supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: true });

      if (year) {
        query = query.gte('holiday_date', `${year}-01-01`)
                     .lte('holiday_date', `${year}-12-31`);
      }

      const { data, error } = await query;

      if (error) throw error;

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error listing holidays:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list holidays',
        error: error.message
      });
    }
  },

  // Get holiday by ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error getting holiday:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get holiday',
        error: error.message
      });
    }
  },

  // Create new holiday
  create: async (req, res) => {
    try {
      const holidayData = req.body;

      // If recurring, extract month and day
      if (holidayData.is_recurring) {
        const date = new Date(holidayData.holiday_date);
        holidayData.recurring_month = date.getMonth() + 1;
        holidayData.recurring_day = date.getDate();
      }

      const { data, error } = await supabase
        .from('holidays')
        .insert([holidayData])
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: 'Holiday created successfully'
      });
    } catch (error) {
      console.error('Error creating holiday:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create holiday',
        error: error.message
      });
    }
  },

  // Update holiday
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const holidayData = req.body;

      // If recurring, update month and day
      if (holidayData.is_recurring) {
        const date = new Date(holidayData.holiday_date);
        holidayData.recurring_month = date.getMonth() + 1;
        holidayData.recurring_day = date.getDate();
      } else {
        holidayData.recurring_month = null;
        holidayData.recurring_day = null;
      }

      holidayData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('holidays')
        .update(holidayData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: 'Holiday updated successfully'
      });
    } catch (error) {
      console.error('Error updating holiday:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update holiday',
        error: error.message
      });
    }
  },

  // Delete holiday
  delete: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Holiday deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting holiday:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete holiday',
        error: error.message
      });
    }
  },

  // Check if a specific date is a holiday
  checkDate: async (req, res) => {
    try {
      const { date } = req.params;
      const checkDate = new Date(date);
      const month = checkDate.getMonth() + 1;
      const day = checkDate.getDate();

      // Check for exact date match OR recurring holiday
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .or(`holiday_date.eq.${date},and(is_recurring.eq.true,recurring_month.eq.${month},recurring_day.eq.${day})`);

      if (error) throw error;

      const isHoliday = data && data.length > 0;

      res.json({
        success: true,
        isHoliday,
        holidays: data || []
      });
    } catch (error) {
      console.error('Error checking holiday date:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check holiday date',
        error: error.message
      });
    }
  },

  // Get upcoming holidays
  getUpcoming: async (req, res) => {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const nextYear = currentYear + 1;

      // Get all holidays for current and next year
      const { data: allHolidays, error } = await supabase
        .from('holidays')
        .select('*')
        .or(`holiday_date.gte.${today.toISOString().split('T')[0]},is_recurring.eq.true`);

      if (error) throw error;

      // Process holidays to calculate next occurrence
      const upcomingHolidays = allHolidays.map(holiday => {
        let nextDate;
        
        if (holiday.is_recurring) {
          // For recurring holidays, find next occurrence
          const thisYearDate = new Date(currentYear, holiday.recurring_month - 1, holiday.recurring_day);
          const nextYearDate = new Date(nextYear, holiday.recurring_month - 1, holiday.recurring_day);
          
          if (thisYearDate >= today) {
            nextDate = thisYearDate;
          } else {
            nextDate = nextYearDate;
          }
        } else {
          nextDate = new Date(holiday.holiday_date);
        }

        const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

        return {
          ...holiday,
          next_date: nextDate.toISOString().split('T')[0],
          days_until: daysUntil
        };
      })
      .filter(h => h.days_until >= 0)
      .sort((a, b) => a.days_until - b.days_until)
      .slice(0, 10);

      res.json({
        success: true,
        data: upcomingHolidays
      });
    } catch (error) {
      console.error('Error getting upcoming holidays:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get upcoming holidays',
        error: error.message
      });
    }
  }
};

export default holidaysController;
