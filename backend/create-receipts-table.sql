-- Create receipts table for storing reimbursement receipt data
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  receipt_type VARCHAR(50) NOT NULL DEFAULT 'simple',
  client_name VARCHAR(255),
  client_cpf VARCHAR(14),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups by ticket_id
CREATE INDEX IF NOT EXISTS idx_receipts_ticket_id ON receipts(ticket_id);

-- Add index for created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);

-- Comments for documentation
COMMENT ON TABLE receipts IS 'Stores receipt data for parking tickets, including reimbursement receipts';
COMMENT ON COLUMN receipts.receipt_type IS 'Type of receipt: simple, reimbursement';
COMMENT ON COLUMN receipts.client_name IS 'Customer name for reimbursement receipt';
COMMENT ON COLUMN receipts.client_cpf IS 'Customer CPF for reimbursement receipt';
COMMENT ON COLUMN receipts.notes IS 'Additional notes or details for the receipt';
