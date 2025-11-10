-- Monthly Financial Reports Table
-- Stores comprehensive end-of-month financial cycle closures
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Report Metadata
  report_month INTEGER NOT NULL, -- 1-12
  report_year INTEGER NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Company Information (snapshot at time of report)
  company_name TEXT,
  company_legal_name TEXT,
  company_cnpj TEXT,
  company_address TEXT,
  company_phone TEXT,
  
  -- Operator Information
  operator_id UUID REFERENCES users(id),
  operator_name TEXT NOT NULL,
  
  -- Financial Summary
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  avulsos_revenue NUMERIC NOT NULL DEFAULT 0,
  mensalistas_revenue NUMERIC NOT NULL DEFAULT 0,
  
  -- Payment Methods Breakdown
  cash_total NUMERIC DEFAULT 0,
  pix_total NUMERIC DEFAULT 0,
  debit_card_total NUMERIC DEFAULT 0,
  credit_card_total NUMERIC DEFAULT 0,
  
  -- Operational Statistics
  total_tickets INTEGER DEFAULT 0,
  tickets_closed INTEGER DEFAULT 0,
  monthly_customers_count INTEGER DEFAULT 0,
  monthly_payments_count INTEGER DEFAULT 0,
  
  -- Archived Data (JSONB for flexibility)
  tickets_data JSONB, -- All tickets from the period
  payments_data JSONB, -- All payments from the period
  monthly_customers_data JSONB, -- Snapshot of monthly customers
  
  -- Report Document
  report_json JSONB, -- Full structured report for programmatic access
  
  -- Status
  status TEXT DEFAULT 'completed', -- 'completed', 'archived'
  
  -- Additional Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_reports_period ON monthly_reports(report_year, report_month);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_generated ON monthly_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_operator ON monthly_reports(operator_id);

-- Unique constraint: only one report per month/year
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_reports_unique_period 
  ON monthly_reports(report_year, report_month);

-- Comments for documentation
COMMENT ON TABLE monthly_reports IS 'Stores comprehensive monthly financial closure reports';
COMMENT ON COLUMN monthly_reports.report_month IS 'Month number (1-12)';
COMMENT ON COLUMN monthly_reports.report_year IS 'Year (e.g., 2025)';
COMMENT ON COLUMN monthly_reports.tickets_data IS 'Archived tickets from operational table';
COMMENT ON COLUMN monthly_reports.payments_data IS 'All payments made during the period';
COMMENT ON COLUMN monthly_reports.report_json IS 'Full structured report data for programmatic access';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_monthly_reports_timestamp ON monthly_reports;
CREATE TRIGGER trigger_update_monthly_reports_timestamp
  BEFORE UPDATE ON monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_reports_updated_at();

-- Optional: Archived Tickets Table (for better data organization)
-- If you prefer to keep tickets in a separate archive table instead of JSONB

CREATE TABLE IF NOT EXISTS archived_tickets (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES monthly_reports(id) ON DELETE CASCADE,
  original_ticket_id UUID NOT NULL,
  
  -- Ticket data
  vehicle_plate TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  exit_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  amount NUMERIC,
  status TEXT,
  metadata JSONB,
  
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archived_tickets_report ON archived_tickets(report_id);
CREATE INDEX IF NOT EXISTS idx_archived_tickets_original ON archived_tickets(original_ticket_id);

COMMENT ON TABLE archived_tickets IS 'Archived operational tickets moved during monthly closure';
COMMENT ON COLUMN archived_tickets.report_id IS 'Reference to the monthly report this ticket belongs to';
COMMENT ON COLUMN archived_tickets.original_ticket_id IS 'Original ID from the tickets table before archival';
