-- Analytics Dashboard Settings System
-- Manages dashboard customization, KPI monitoring, reporting schedules, and data retention

-- 1. Dashboard Settings (Global preferences)
CREATE TABLE IF NOT EXISTS dashboard_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- General preferences
  refresh_interval INTEGER DEFAULT 300, -- seconds (5 minutes default)
  default_date_range VARCHAR(20) DEFAULT 'last_7_days', -- last_7_days, last_30_days, this_month, custom
  currency_format VARCHAR(10) DEFAULT 'BRL',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  
  -- Display preferences
  theme VARCHAR(20) DEFAULT 'light', -- light, dark, auto
  chart_style VARCHAR(20) DEFAULT 'modern', -- modern, classic, minimal
  show_trends BOOLEAN DEFAULT TRUE,
  show_comparisons BOOLEAN DEFAULT TRUE,
  
  -- Data retention
  data_retention_months INTEGER DEFAULT 24, -- How many months to keep detailed data
  archive_old_data BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- 2. Dashboard Widgets (User's selected widgets and their layout)
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Widget configuration
  widget_type VARCHAR(50) NOT NULL, -- revenue_chart, occupancy_rate, top_vehicles, recent_activity, etc.
  title VARCHAR(100),
  position INTEGER NOT NULL, -- Display order
  
  -- Layout
  size VARCHAR(20) DEFAULT 'medium', -- small, medium, large, full
  is_visible BOOLEAN DEFAULT TRUE,
  
  -- Widget-specific settings (JSON)
  settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON dashboard_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_position ON dashboard_widgets(user_id, position);

-- 3. KPI Thresholds (Alerts and monitoring)
CREATE TABLE IF NOT EXISTS kpi_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- KPI identification
  kpi_type VARCHAR(50) NOT NULL, -- daily_revenue, occupancy_rate, average_ticket, monthly_customers_paid
  kpi_name VARCHAR(100) NOT NULL,
  
  -- Threshold configuration
  threshold_type VARCHAR(20) NOT NULL CHECK (threshold_type IN ('minimum', 'maximum', 'range')),
  min_value DECIMAL(10,2),
  max_value DECIMAL(10,2),
  target_value DECIMAL(10,2),
  
  -- Alert settings
  alert_enabled BOOLEAN DEFAULT TRUE,
  alert_method VARCHAR(20) DEFAULT 'in_app', -- in_app, email, both
  alert_frequency VARCHAR(20) DEFAULT 'immediate', -- immediate, daily_digest, weekly_digest
  
  -- Time-based rules
  applies_to_days VARCHAR(50) DEFAULT 'all', -- all, weekdays, weekends, custom
  time_window VARCHAR(50) DEFAULT 'daily', -- hourly, daily, weekly, monthly
  
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_thresholds_user ON kpi_thresholds(user_id);
CREATE INDEX IF NOT EXISTS idx_kpi_thresholds_active ON kpi_thresholds(user_id, is_active);

-- 4. Report Schedules (Automated reporting)
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Report configuration
  report_name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- daily_summary, weekly_summary, monthly_summary, custom
  
  -- Schedule settings
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  schedule_time TIME DEFAULT '08:00:00', -- What time to send (in user's timezone)
  day_of_week INTEGER, -- For weekly reports (0=Sunday, 6=Saturday)
  day_of_month INTEGER, -- For monthly reports (1-31)
  
  -- Delivery settings
  delivery_method VARCHAR(20) DEFAULT 'email', -- email, in_app, both
  email_recipients TEXT[], -- Array of email addresses
  
  -- Report content
  include_charts BOOLEAN DEFAULT TRUE,
  include_tables BOOLEAN DEFAULT TRUE,
  metrics_to_include TEXT[], -- Array of metric names
  date_range VARCHAR(20) DEFAULT 'previous_period', -- yesterday, last_week, last_month, custom
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_user ON report_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_active ON report_schedules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_send ON report_schedules(next_send_at) WHERE is_active = TRUE;

-- 5. Alert History (Track KPI alerts)
CREATE TABLE IF NOT EXISTS kpi_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_id UUID REFERENCES kpi_thresholds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Alert details
  kpi_type VARCHAR(50) NOT NULL,
  actual_value DECIMAL(10,2) NOT NULL,
  threshold_value DECIMAL(10,2),
  alert_message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning', -- info, warning, critical
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_user ON kpi_alert_history(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_unread ON kpi_alert_history(user_id, is_read) WHERE is_dismissed = FALSE;

-- Insert default dashboard settings for all existing users
INSERT INTO dashboard_settings (user_id)
SELECT id FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM dashboard_settings WHERE dashboard_settings.user_id = users.id
);

-- Insert default dashboard widgets (example widget set)
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM users LOOP
    -- Only add if user doesn't have widgets yet
    IF NOT EXISTS (SELECT 1 FROM dashboard_widgets WHERE user_id = user_record.id) THEN
      -- Widget 1: Revenue Chart
      INSERT INTO dashboard_widgets (user_id, widget_type, title, position, size)
      VALUES (user_record.id, 'revenue_chart', 'Receita Diária', 1, 'large');
      
      -- Widget 2: Occupancy Rate
      INSERT INTO dashboard_widgets (user_id, widget_type, title, position, size)
      VALUES (user_record.id, 'occupancy_rate', 'Taxa de Ocupação', 2, 'medium');
      
      -- Widget 3: Recent Activity
      INSERT INTO dashboard_widgets (user_id, widget_type, title, position, size)
      VALUES (user_record.id, 'recent_activity', 'Atividade Recente', 3, 'medium');
      
      -- Widget 4: Monthly Customers Status
      INSERT INTO dashboard_widgets (user_id, widget_type, title, position, size)
      VALUES (user_record.id, 'monthly_customers', 'Mensalistas', 4, 'medium');
    END IF;
  END LOOP;
END $$;

-- Insert default KPI thresholds (example thresholds)
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM users LOOP
    -- Only add if user doesn't have thresholds yet
    IF NOT EXISTS (SELECT 1 FROM kpi_thresholds WHERE user_id = user_record.id) THEN
      -- Threshold 1: Minimum daily revenue
      INSERT INTO kpi_thresholds (
        user_id, kpi_type, kpi_name, threshold_type, 
        min_value, alert_enabled, alert_method
      )
      VALUES (
        user_record.id, 'daily_revenue', 'Receita Mínima Diária', 
        'minimum', 500.00, TRUE, 'in_app'
      );
      
      -- Threshold 2: Occupancy rate warning
      INSERT INTO kpi_thresholds (
        user_id, kpi_type, kpi_name, threshold_type, 
        max_value, alert_enabled, alert_method
      )
      VALUES (
        user_record.id, 'occupancy_rate', 'Taxa de Ocupação Máxima', 
        'maximum', 95.00, TRUE, 'both'
      );
    END IF;
  END LOOP;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dashboard_settings_updated_at
  BEFORE UPDATE ON dashboard_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_kpi_thresholds_updated_at
  BEFORE UPDATE ON kpi_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER trigger_report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_updated_at();

-- Helper function to calculate next send time for report schedules
CREATE OR REPLACE FUNCTION calculate_next_report_send(
  p_frequency VARCHAR,
  p_schedule_time TIME,
  p_day_of_week INTEGER,
  p_day_of_month INTEGER
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  next_send TIMESTAMP WITH TIME ZONE;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      next_send := DATE_TRUNC('day', current_time) + p_schedule_time;
      IF next_send <= current_time THEN
        next_send := next_send + INTERVAL '1 day';
      END IF;
      
    WHEN 'weekly' THEN
      next_send := DATE_TRUNC('week', current_time) + (p_day_of_week || ' days')::INTERVAL + p_schedule_time;
      IF next_send <= current_time THEN
        next_send := next_send + INTERVAL '1 week';
      END IF;
      
    WHEN 'monthly' THEN
      next_send := DATE_TRUNC('month', current_time) + ((p_day_of_month - 1) || ' days')::INTERVAL + p_schedule_time;
      IF next_send <= current_time THEN
        next_send := next_send + INTERVAL '1 month';
      END IF;
      
    ELSE
      next_send := current_time + INTERVAL '1 day';
  END CASE;
  
  RETURN next_send;
END;
$$ LANGUAGE plpgsql;

-- Update next_send_at for all active schedules
UPDATE report_schedules
SET next_send_at = calculate_next_report_send(
  frequency,
  schedule_time,
  day_of_week,
  day_of_month
)
WHERE is_active = TRUE AND next_send_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE dashboard_settings IS 'User-specific dashboard preferences and data retention policies';
COMMENT ON TABLE dashboard_widgets IS 'User-configured dashboard widgets and their layout';
COMMENT ON TABLE kpi_thresholds IS 'KPI monitoring thresholds and alert configurations';
COMMENT ON TABLE report_schedules IS 'Automated report generation and delivery schedules';
COMMENT ON TABLE kpi_alert_history IS 'History of triggered KPI alerts for auditing';
