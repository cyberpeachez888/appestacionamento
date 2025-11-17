-- Migration: Add Expenses and Manual Revenues tables
-- Run this in your Supabase SQL Editor

-- Expenses table for financial management
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL CHECK (value >= 0),
  due_date DATE NOT NULL,
  payment_date DATE,
  category TEXT NOT NULL CHECK (category IN ('Contas', 'Manutenção', 'Pró-labore', 'Impostos')),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'weekly', 'yearly')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manual Revenues table (for sublocação and other manual income)
CREATE TABLE IF NOT EXISTS manual_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  value NUMERIC NOT NULL CHECK (value >= 0),
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Sublocação', 'Outros')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_date ON expenses(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_recurring ON expenses(is_recurring) WHERE is_recurring = TRUE;

CREATE INDEX IF NOT EXISTS idx_manual_revenues_date ON manual_revenues(date);
CREATE INDEX IF NOT EXISTS idx_manual_revenues_category ON manual_revenues(category);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_revenues_updated_at
  BEFORE UPDATE ON manual_revenues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

