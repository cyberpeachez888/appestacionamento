-- Business Hours & Holidays Management System
-- Manages operational schedules, holidays, special events, and after-hours pricing

-- 1. Business Hours Configuration
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  is_open BOOLEAN DEFAULT TRUE,
  open_time TIME NOT NULL DEFAULT '08:00:00',
  close_time TIME NOT NULL DEFAULT '18:00:00',
  
  -- After-hours settings
  allow_after_hours BOOLEAN DEFAULT FALSE,
  after_hours_surcharge_type VARCHAR(20) DEFAULT 'percentage' CHECK (after_hours_surcharge_type IN ('percentage', 'fixed')),
  after_hours_surcharge_value DECIMAL(10,2) DEFAULT 0.00,
  
  -- Break/lunch period (optional)
  has_break BOOLEAN DEFAULT FALSE,
  break_start_time TIME,
  break_end_time TIME,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(day_of_week)
);

-- Index for day lookup
CREATE INDEX IF NOT EXISTS idx_business_hours_day ON business_hours(day_of_week);

-- 2. Holidays Calendar
CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_name VARCHAR(255) NOT NULL,
  holiday_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE, -- If true, repeats every year (e.g., Christmas)
  recurring_month INTEGER CHECK (recurring_month >= 1 AND recurring_month <= 12),
  recurring_day INTEGER CHECK (recurring_day >= 1 AND recurring_day <= 31),
  
  -- Operation on holiday
  is_closed BOOLEAN DEFAULT TRUE,
  special_hours BOOLEAN DEFAULT FALSE,
  special_open_time TIME,
  special_close_time TIME,
  
  -- Special pricing
  has_special_pricing BOOLEAN DEFAULT FALSE,
  special_pricing_type VARCHAR(20) DEFAULT 'percentage' CHECK (special_pricing_type IN ('percentage', 'fixed', 'multiplier')),
  special_pricing_value DECIMAL(10,2) DEFAULT 0.00,
  
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for date lookup
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_recurring ON holidays(is_recurring, recurring_month, recurring_day);

-- 3. Special Events
CREATE TABLE IF NOT EXISTS special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Time range (optional - all day if null)
  start_time TIME,
  end_time TIME,
  
  -- Affects operation
  is_closed BOOLEAN DEFAULT FALSE,
  
  -- Special pricing during event
  has_special_pricing BOOLEAN DEFAULT FALSE,
  special_pricing_type VARCHAR(20) DEFAULT 'multiplier' CHECK (special_pricing_type IN ('percentage', 'fixed', 'multiplier')),
  special_pricing_value DECIMAL(10,2) DEFAULT 1.5, -- e.g., 1.5x normal price
  
  -- Event details
  description TEXT,
  requires_reservation BOOLEAN DEFAULT FALSE,
  max_capacity INTEGER,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for date range lookup
CREATE INDEX IF NOT EXISTS idx_special_events_dates ON special_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_special_events_active ON special_events(is_active);

-- 4. Operational Status Log (for tracking when business was opened/closed)
CREATE TABLE IF NOT EXISTS operational_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'closed', 'after_hours', 'holiday', 'special_event')),
  reason TEXT,
  
  -- Who made the change
  user_id UUID,
  
  -- Timestamps
  status_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Related entities
  holiday_id UUID REFERENCES holidays(id) ON DELETE SET NULL,
  event_id UUID REFERENCES special_events(id) ON DELETE SET NULL,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for status tracking
CREATE INDEX IF NOT EXISTS idx_operational_status_time ON operational_status_log(status_time DESC);
CREATE INDEX IF NOT EXISTS idx_operational_status_status ON operational_status_log(status);

-- 5. Insert Default Business Hours (Mon-Fri: 8am-6pm, Sat: 8am-2pm, Sun: Closed)
INSERT INTO business_hours (day_of_week, is_open, open_time, close_time, allow_after_hours, after_hours_surcharge_type, after_hours_surcharge_value) VALUES
  (0, FALSE, '08:00:00', '18:00:00', FALSE, 'percentage', 0.00), -- Sunday - Closed
  (1, TRUE, '08:00:00', '18:00:00', TRUE, 'percentage', 20.00),  -- Monday
  (2, TRUE, '08:00:00', '18:00:00', TRUE, 'percentage', 20.00),  -- Tuesday
  (3, TRUE, '08:00:00', '18:00:00', TRUE, 'percentage', 20.00),  -- Wednesday
  (4, TRUE, '08:00:00', '18:00:00', TRUE, 'percentage', 20.00),  -- Thursday
  (5, TRUE, '08:00:00', '18:00:00', TRUE, 'percentage', 20.00),  -- Friday
  (6, TRUE, '08:00:00', '14:00:00', TRUE, 'percentage', 30.00)   -- Saturday - Half day
ON CONFLICT (day_of_week) DO NOTHING;

-- 6. Insert Common Brazilian Holidays (examples)
INSERT INTO holidays (holiday_name, holiday_date, is_recurring, recurring_month, recurring_day, is_closed, description) VALUES
  ('Ano Novo', '2025-01-01', TRUE, 1, 1, TRUE, 'Confraternização Universal'),
  ('Carnaval 2025', '2025-03-04', FALSE, NULL, NULL, TRUE, 'Carnaval'),
  ('Sexta-feira Santa 2025', '2025-04-18', FALSE, NULL, NULL, TRUE, 'Paixão de Cristo'),
  ('Tiradentes', '2025-04-21', TRUE, 4, 21, TRUE, 'Dia de Tiradentes'),
  ('Dia do Trabalho', '2025-05-01', TRUE, 5, 1, TRUE, 'Dia Mundial do Trabalho'),
  ('Corpus Christi 2025', '2025-06-19', FALSE, NULL, NULL, TRUE, 'Corpus Christi'),
  ('Independência do Brasil', '2025-09-07', TRUE, 9, 7, TRUE, 'Independência do Brasil'),
  ('Nossa Senhora Aparecida', '2025-10-12', TRUE, 10, 12, TRUE, 'Padroeira do Brasil'),
  ('Finados', '2025-11-02', TRUE, 11, 2, TRUE, 'Dia de Finados'),
  ('Proclamação da República', '2025-11-15', TRUE, 11, 15, TRUE, 'Proclamação da República'),
  ('Natal', '2025-12-25', TRUE, 12, 25, TRUE, 'Natal')
ON CONFLICT DO NOTHING;

-- 7. Helper Function: Check if currently open
CREATE OR REPLACE FUNCTION is_currently_open()
RETURNS BOOLEAN AS $$
DECLARE
  current_day INTEGER;
  current_time_value TIME;
  hours_config RECORD;
  today_holiday RECORD;
  active_event RECORD;
BEGIN
  current_day := EXTRACT(DOW FROM NOW());
  current_time_value := NOW()::TIME;
  
  -- Check for holidays today
  SELECT * INTO today_holiday FROM holidays
  WHERE holiday_date = CURRENT_DATE AND is_closed = TRUE
  LIMIT 1;
  
  IF FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check for special events today
  SELECT * INTO active_event FROM special_events
  WHERE start_date <= CURRENT_DATE 
    AND end_date >= CURRENT_DATE
    AND is_closed = TRUE
    AND is_active = TRUE
  LIMIT 1;
  
  IF FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check regular business hours
  SELECT * INTO hours_config FROM business_hours
  WHERE day_of_week = current_day;
  
  IF NOT FOUND OR NOT hours_config.is_open THEN
    RETURN FALSE;
  END IF;
  
  -- Check if within hours (considering break time)
  IF current_time_value >= hours_config.open_time AND current_time_value < hours_config.close_time THEN
    IF hours_config.has_break AND current_time_value >= hours_config.break_start_time AND current_time_value < hours_config.break_end_time THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;
  
  -- Check if after hours allowed
  IF hours_config.allow_after_hours THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 8. Helper Function: Get current operational status
CREATE OR REPLACE FUNCTION get_operational_status()
RETURNS TABLE(
  status VARCHAR(20),
  is_open BOOLEAN,
  reason TEXT,
  surcharge_type VARCHAR(20),
  surcharge_value DECIMAL(10,2),
  special_pricing BOOLEAN,
  pricing_type VARCHAR(20),
  pricing_value DECIMAL(10,2)
) AS $$
DECLARE
  current_day INTEGER;
  current_time_value TIME;
  hours_config RECORD;
  today_holiday RECORD;
  active_event RECORD;
BEGIN
  current_day := EXTRACT(DOW FROM NOW());
  current_time_value := NOW()::TIME;
  
  -- Check for holidays today
  SELECT * INTO today_holiday FROM holidays
  WHERE holiday_date = CURRENT_DATE
  LIMIT 1;
  
  IF FOUND THEN
    IF today_holiday.is_closed THEN
      RETURN QUERY SELECT 
        'holiday'::VARCHAR(20),
        FALSE,
        today_holiday.holiday_name,
        NULL::VARCHAR(20),
        0.00::DECIMAL(10,2),
        today_holiday.has_special_pricing,
        today_holiday.special_pricing_type::VARCHAR(20),
        today_holiday.special_pricing_value;
      RETURN;
    END IF;
  END IF;
  
  -- Check for special events
  SELECT * INTO active_event FROM special_events
  WHERE start_date <= CURRENT_DATE 
    AND end_date >= CURRENT_DATE
    AND is_active = TRUE
  ORDER BY has_special_pricing DESC
  LIMIT 1;
  
  IF FOUND THEN
    IF active_event.is_closed THEN
      RETURN QUERY SELECT 
        'special_event'::VARCHAR(20),
        FALSE,
        active_event.event_name,
        NULL::VARCHAR(20),
        0.00::DECIMAL(10,2),
        active_event.has_special_pricing,
        active_event.special_pricing_type::VARCHAR(20),
        active_event.special_pricing_value;
      RETURN;
    END IF;
  END IF;
  
  -- Check regular business hours
  SELECT * INTO hours_config FROM business_hours
  WHERE day_of_week = current_day;
  
  IF NOT FOUND OR NOT hours_config.is_open THEN
    RETURN QUERY SELECT 
      'closed'::VARCHAR(20),
      FALSE,
      'Fechado - Dia não operacional'::TEXT,
      NULL::VARCHAR(20),
      0.00::DECIMAL(10,2),
      FALSE,
      NULL::VARCHAR(20),
      0.00::DECIMAL(10,2);
    RETURN;
  END IF;
  
  -- Check if within break time
  IF hours_config.has_break AND current_time_value >= hours_config.break_start_time AND current_time_value < hours_config.break_end_time THEN
    RETURN QUERY SELECT 
      'closed'::VARCHAR(20),
      FALSE,
      'Intervalo de almoço'::TEXT,
      NULL::VARCHAR(20),
      0.00::DECIMAL(10,2),
      FALSE,
      NULL::VARCHAR(20),
      0.00::DECIMAL(10,2);
    RETURN;
  END IF;
  
  -- Check if within regular hours
  IF current_time_value >= hours_config.open_time AND current_time_value < hours_config.close_time THEN
    -- Check for special event pricing
    IF active_event.has_special_pricing IS TRUE THEN
      RETURN QUERY SELECT 
        'special_event'::VARCHAR(20),
        TRUE,
        active_event.event_name,
        NULL::VARCHAR(20),
        0.00::DECIMAL(10,2),
        TRUE,
        active_event.special_pricing_type::VARCHAR(20),
        active_event.special_pricing_value;
      RETURN;
    END IF;
    
    RETURN QUERY SELECT 
      'open'::VARCHAR(20),
      TRUE,
      'Horário normal de funcionamento'::TEXT,
      NULL::VARCHAR(20),
      0.00::DECIMAL(10,2),
      FALSE,
      NULL::VARCHAR(20),
      0.00::DECIMAL(10,2);
    RETURN;
  END IF;
  
  -- After hours
  IF hours_config.allow_after_hours THEN
    RETURN QUERY SELECT 
      'after_hours'::VARCHAR(20),
      TRUE,
      'Fora do horário - Taxa adicional aplicada'::TEXT,
      hours_config.after_hours_surcharge_type::VARCHAR(20),
      hours_config.after_hours_surcharge_value,
      FALSE,
      NULL::VARCHAR(20),
      0.00::DECIMAL(10,2);
    RETURN;
  END IF;
  
  -- Closed
  RETURN QUERY SELECT 
    'closed'::VARCHAR(20),
    FALSE,
    'Fora do horário de funcionamento'::TEXT,
    NULL::VARCHAR(20),
    0.00::DECIMAL(10,2),
    FALSE,
    NULL::VARCHAR(20),
    0.00::DECIMAL(10,2);
END;
$$ LANGUAGE plpgsql;

-- 9. Comments for documentation
COMMENT ON TABLE business_hours IS 'Regular weekly business hours with after-hours surcharge configuration';
COMMENT ON TABLE holidays IS 'Holiday calendar with special hours and pricing';
COMMENT ON TABLE special_events IS 'Special events with custom hours and pricing (concerts, sports, etc.)';
COMMENT ON TABLE operational_status_log IS 'Historical log of operational status changes';

COMMENT ON FUNCTION is_currently_open IS 'Returns TRUE if business is currently open for operations';
COMMENT ON FUNCTION get_operational_status IS 'Returns detailed current operational status including pricing adjustments';
