ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS tariff_id UUID,
ADD COLUMN IF NOT EXISTS tariff_type TEXT,
ADD COLUMN IF NOT EXISTS reissued_from UUID,
ADD COLUMN IF NOT EXISTS reissued_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_tickets_tariff ON tickets(tariff_id);
CREATE INDEX IF NOT EXISTS idx_tickets_reissued_from ON tickets(reissued_from);

CREATE TABLE IF NOT EXISTS ticket_coupons (
  id UUID PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  metadata JSONB,
  reissued_from UUID REFERENCES ticket_coupons(id),
  reissued_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_coupons_ticket ON ticket_coupons(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_coupons_status ON ticket_coupons(status);

