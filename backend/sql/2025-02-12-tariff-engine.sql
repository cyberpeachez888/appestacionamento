-- Tariff engine extended schema (Diária, Pernoite, Semanal, Quinzenal, teto Hora/Fração)

ALTER TABLE rates
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  value_adjustment JSONB,
  priority INTEGER DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_rate ON pricing_rules(rate_id);

CREATE TABLE IF NOT EXISTS rate_time_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
  window_type TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  start_day SMALLINT,
  end_day SMALLINT,
  duration_limit_minutes INTEGER,
  extra_rate_id UUID REFERENCES rates(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_time_windows_rate ON rate_time_windows(rate_id);
CREATE INDEX IF NOT EXISTS idx_rate_time_windows_type ON rate_time_windows(window_type);

CREATE TABLE IF NOT EXISTS rate_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_rate_id UUID NOT NULL REFERENCES rates(id) ON DELETE CASCADE,
  target_rate_id UUID NOT NULL REFERENCES rates(id),
  threshold_amount NUMERIC NOT NULL,
  auto_apply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_thresholds_unique
ON rate_thresholds (source_rate_id, target_rate_id);

