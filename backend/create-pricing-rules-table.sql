-- Create pricing_rules table for advanced time-based pricing
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID REFERENCES rates(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('first_hour', 'daily_max', 'time_range', 'hourly_progression')),
  
  -- Conditions for when to apply the rule
  conditions JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- first_hour: {}
  -- daily_max: {}
  -- time_range: { "hour_start": 8, "hour_end": 18, "days_of_week": [1,2,3,4,5] }
  -- hourly_progression: { "ranges": [{"from": 1, "to": 2, "value": 5}, {"from": 3, "to": 5, "value": 4}] }
  
  -- How to adjust the price
  value_adjustment JSONB NOT NULL,
  -- Examples:
  -- first_hour: { "type": "override", "value": 10 }
  -- daily_max: { "type": "cap", "value": 50 }
  -- time_range: { "type": "multiplier", "value": 1.5 }
  -- hourly_progression: { "type": "progressive", "ranges": [...] }
  
  priority INTEGER NOT NULL DEFAULT 0,
  -- Lower number = higher priority (applied first)
  -- Suggested: first_hour=1, hourly_progression=2, time_range=3, daily_max=99
  
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT, -- Human-readable description
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_pricing_rules_rate_id ON pricing_rules(rate_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active) WHERE is_active = TRUE;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_pricing_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pricing_rules_updated_at_trigger
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_rules_updated_at();

-- Insert default example rules (commented out - uncomment to use)
/*
-- Example 1: First hour is R$ 10 for 'Hora/Fração' rates
INSERT INTO pricing_rules (rate_id, rule_type, conditions, value_adjustment, priority, description)
SELECT 
  id,
  'first_hour',
  '{}',
  '{"type": "override", "value": 10}',
  1,
  'Primeira hora: R$ 10,00'
FROM rates 
WHERE rate_type = 'Hora/Fração'
LIMIT 1;

-- Example 2: Daily maximum of R$ 50
INSERT INTO pricing_rules (rate_id, rule_type, conditions, value_adjustment, priority, description)
SELECT 
  id,
  'daily_max',
  '{}',
  '{"type": "cap", "value": 50}',
  99,
  'Valor máximo diário: R$ 50,00'
FROM rates 
WHERE rate_type = 'Hora/Fração'
LIMIT 1;

-- Example 3: Peak hours (8-18h weekdays) with 1.5x multiplier
INSERT INTO pricing_rules (rate_id, rule_type, conditions, value_adjustment, priority, description)
SELECT 
  id,
  'time_range',
  '{"hour_start": 8, "hour_end": 18, "days_of_week": [1,2,3,4,5]}',
  '{"type": "multiplier", "value": 1.5}',
  3,
  'Horário de pico (8h-18h): 1.5x'
FROM rates 
WHERE rate_type = 'Hora/Fração'
LIMIT 1;
*/

-- Grant permissions (adjust according to your RLS policies)
-- ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view pricing rules" ON pricing_rules FOR SELECT USING (true);
-- CREATE POLICY "Admins can manage pricing rules" ON pricing_rules FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
