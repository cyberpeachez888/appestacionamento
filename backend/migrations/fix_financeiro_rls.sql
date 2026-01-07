-- Migration to fix RLS policies for Financeiro module
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on tables if not already enabled
ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

-- 2. Policies for cash_register_sessions

-- Drop existing policies to avoid conflicts (clean slate for this table)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON cash_register_sessions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON cash_register_sessions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_select" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_insert" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_update" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_select_policy" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_insert_policy" ON cash_register_sessions;
DROP POLICY IF EXISTS "cash_register_update_policy" ON cash_register_sessions;

-- Criar políticas corretas (CORREÇÃO 4)
CREATE POLICY "cash_register_select_policy" 
ON cash_register_sessions FOR SELECT 
TO authenticated
USING (auth.uid() = operator_id);

CREATE POLICY "cash_register_insert_policy" 
ON cash_register_sessions FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "cash_register_update_policy" 
ON cash_register_sessions FOR UPDATE 
TO authenticated
USING (auth.uid() = operator_id)
WITH CHECK (auth.uid() = operator_id);

-- 3. Policies for monthly_reports

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON monthly_reports;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON monthly_reports;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON monthly_reports;

-- ALLOW SELECT
CREATE POLICY "Enable read access for authenticated users" 
ON monthly_reports FOR SELECT 
TO authenticated 
USING (true);

-- ALLOW INSERT (Generating a report)
CREATE POLICY "Enable insert access for authenticated users" 
ON monthly_reports FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = operator_id);

-- ALLOW UPDATE
CREATE POLICY "Enable update access for authenticated users" 
ON monthly_reports FOR UPDATE 
TO authenticated 
USING (auth.uid() = operator_id);

-- 4. Verify grants
GRANT ALL ON cash_register_sessions TO authenticated;
GRANT ALL ON monthly_reports TO authenticated;
GRANT ALL ON cash_transactions TO authenticated;
