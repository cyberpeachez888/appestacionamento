-- Printer jobs queue migration
-- Executar no Supabase para habilitar o Print Agent

CREATE TABLE IF NOT EXISTS printer_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL, -- ex.: 'ticket_receipt', 'manual_receipt', 'test'
  job_key TEXT, -- opcional, para idempotência (ex.: ticket_id)
  status TEXT NOT NULL DEFAULT 'queued', -- queued, assigned, printing, completed, failed, cancelled
  priority SMALLINT DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- dados do recibo/ticket
  printer_profile TEXT, -- ex.: 'default', 'balcao', etc.
  config_snapshot JSONB, -- cópia da configuração no momento da solicitação
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed_by TEXT, -- identificador do agente (hostname ou ID)
  claimed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_by_login TEXT,
  requested_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printer_jobs_status ON printer_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_printer_jobs_priority ON printer_jobs(priority DESC, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_printer_jobs_claimed ON printer_jobs(claimed_by, status);
CREATE INDEX IF NOT EXISTS idx_printer_jobs_created ON printer_jobs(created_at DESC);

COMMENT ON TABLE printer_jobs IS 'Fila de impressão consumida pelo Print Agent local.';
COMMENT ON COLUMN printer_jobs.payload IS 'Dados serializados do recibo, ticket ou teste a ser impresso.';
COMMENT ON COLUMN printer_jobs.config_snapshot IS 'Snapshot da configuração de impressora (company_config.printer_config).';

CREATE TABLE IF NOT EXISTS printer_job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES printer_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- queued, claimed, printing, completed, failed, cancelled, retry
  actor TEXT, -- agente ou usuário responsável
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printer_job_events_job ON printer_job_events(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_printer_job_events_type ON printer_job_events(event_type);

COMMENT ON TABLE printer_job_events IS 'Histórico de transições e auditoria dos jobs de impressão.';

