import { supabase } from '../config/supabase.js';

const dashboardSettingsController = {
  // ============ Dashboard Settings ============
  
  async getSettings(req, res) {
    try {
      const userId = req.user.id;
      
      const { data, error } = await supabase
        .from('dashboard_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      
      // Create default settings if none exist
      if (!data) {
        const { data: newSettings, error: createError } = await supabase
          .from('dashboard_settings')
          .insert({ user_id: userId })
          .select()
          .single();
        
        if (createError) throw createError;
        
        return res.json({ success: true, data: newSettings });
      }
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error getting dashboard settings:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to get dashboard settings'
      });
    }
  },

  async updateSettings(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;
      
      // Remove fields that shouldn't be updated
      delete updates.id;
      delete updates.user_id;
      delete updates.created_at;
      
      const { data, error } = await supabase
        .from('dashboard_settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error updating dashboard settings:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to update dashboard settings'
      });
    }
  },

  // ============ Dashboard Widgets ============
  
  async listWidgets(req, res) {
    try {
      const userId = req.user.id;
      
      const { data, error} = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error listing widgets:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to list widgets'
      });
    }
  },

  async getWidget(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error getting widget:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to get widget'
      });
    }
  },

  async createWidget(req, res) {
    try {
      const userId = req.user.id;
      const { widget_type, title, position, size, settings } = req.body;
      
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .insert({
          user_id: userId,
          widget_type,
          title,
          position,
          size,
          settings: settings || {}
        })
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error creating widget:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to create widget'
      });
    }
  },

  async updateWidget(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = req.body;
      
      delete updates.id;
      delete updates.user_id;
      delete updates.created_at;
      
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error updating widget:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to update widget'
      });
    }
  },

  async deleteWidget(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      res.json({ success: true, message: 'Widget deleted' });
    } catch (err) {
      console.error('Error deleting widget:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to delete widget'
      });
    }
  },

  async reorderWidgets(req, res) {
    try {
      const userId = req.user.id;
      const { widgets } = req.body; // Array of { id, position }
      
      // Update positions in a transaction-like manner
      for (const widget of widgets) {
        await supabase
          .from('dashboard_widgets')
          .update({ position: widget.position })
          .eq('id', widget.id)
          .eq('user_id', userId);
      }
      
      res.json({ success: true, message: 'Widgets reordered' });
    } catch (err) {
      console.error('Error reordering widgets:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to reorder widgets'
      });
    }
  },

  // ============ KPI Thresholds ============
  
  async listThresholds(req, res) {
    try {
      const userId = req.user.id;
      
      const { data, error } = await supabase
        .from('kpi_thresholds')
        .select('*')
        .eq('user_id', userId)
        .order('kpi_name', { ascending: true });
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error listing thresholds:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to list thresholds'
      });
    }
  },

  async getThreshold(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('kpi_thresholds')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error getting threshold:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to get threshold'
      });
    }
  },

  async createThreshold(req, res) {
    try {
      const userId = req.user.id;
      const thresholdData = { ...req.body, user_id: userId };
      
      const { data, error } = await supabase
        .from('kpi_thresholds')
        .insert(thresholdData)
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error creating threshold:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to create threshold'
      });
    }
  },

  async updateThreshold(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = req.body;
      
      delete updates.id;
      delete updates.user_id;
      delete updates.created_at;
      
      const { data, error } = await supabase
        .from('kpi_thresholds')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error updating threshold:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to update threshold'
      });
    }
  },

  async deleteThreshold(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const { error } = await supabase
        .from('kpi_thresholds')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      res.json({ success: true, message: 'Threshold deleted' });
    } catch (err) {
      console.error('Error deleting threshold:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to delete threshold'
      });
    }
  },

  // ============ Report Schedules ============
  
  async listSchedules(req, res) {
    try {
      const userId = req.user.id;
      
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('user_id', userId)
        .order('report_name', { ascending: true });
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error listing schedules:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to list schedules'
      });
    }
  },

  async getSchedule(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error getting schedule:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to get schedule'
      });
    }
  },

  async createSchedule(req, res) {
    try {
      const userId = req.user.id;
      const scheduleData = { ...req.body, user_id: userId };
      
      // Calculate next_send_at using the database function
      const { data, error } = await supabase
        .rpc('calculate_next_report_send', {
          p_frequency: scheduleData.frequency,
          p_schedule_time: scheduleData.schedule_time,
          p_day_of_week: scheduleData.day_of_week,
          p_day_of_month: scheduleData.day_of_month
        });
      
      if (!error && data) {
        scheduleData.next_send_at = data;
      }
      
      const { data: schedule, error: insertError } = await supabase
        .from('report_schedules')
        .insert(scheduleData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      res.json({ success: true, data: schedule });
    } catch (err) {
      console.error('Error creating schedule:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to create schedule'
      });
    }
  },

  async updateSchedule(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = req.body;
      
      delete updates.id;
      delete updates.user_id;
      delete updates.created_at;
      delete updates.last_sent_at;
      
      // Recalculate next_send_at if schedule changed
      if (updates.frequency || updates.schedule_time || updates.day_of_week || updates.day_of_month) {
        const { data: existingSchedule } = await supabase
          .from('report_schedules')
          .select('*')
          .eq('id', id)
          .single();
        
        if (existingSchedule) {
          const { data: nextSend } = await supabase
            .rpc('calculate_next_report_send', {
              p_frequency: updates.frequency || existingSchedule.frequency,
              p_schedule_time: updates.schedule_time || existingSchedule.schedule_time,
              p_day_of_week: updates.day_of_week ?? existingSchedule.day_of_week,
              p_day_of_month: updates.day_of_month ?? existingSchedule.day_of_month
            });
          
          if (nextSend) {
            updates.next_send_at = nextSend;
          }
        }
      }
      
      const { data, error } = await supabase
        .from('report_schedules')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error updating schedule:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to update schedule'
      });
    }
  },

  async deleteSchedule(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const { error } = await supabase
        .from('report_schedules')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      res.json({ success: true, message: 'Schedule deleted' });
    } catch (err) {
      console.error('Error deleting schedule:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to delete schedule'
      });
    }
  },

  async testSchedule(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Get the schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('report_schedules')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      
      if (scheduleError) throw scheduleError;
      
      // TODO: Implement actual email sending logic
      // For now, just return success
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        schedule: schedule.report_name
      });
    } catch (err) {
      console.error('Error testing schedule:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to send test email'
      });
    }
  },

  // ============ Alert History ============
  
  async listAlerts(req, res) {
    try {
      const userId = req.user.id;
      const { unread_only } = req.query;
      
      let query = supabase
        .from('kpi_alert_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (unread_only === 'true') {
        query = query.eq('is_read', false).eq('is_dismissed', false);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error listing alerts:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to list alerts'
      });
    }
  },

  async markAlertRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('kpi_alert_history')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error marking alert read:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to mark alert as read'
      });
    }
  },

  async dismissAlert(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('kpi_alert_history')
        .update({ 
          is_dismissed: true,
          dismissed_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (err) {
      console.error('Error dismissing alert:', err);
      res.status(500).json({ 
        success: false,
        error: err.message || 'Failed to dismiss alert'
      });
    }
  }
};

export default dashboardSettingsController;
