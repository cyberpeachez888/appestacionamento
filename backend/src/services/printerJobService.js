import { supabase } from '../config/supabase.js';

const STATUS = {
  QUEUED: 'queued',
  ASSIGNED: 'assigned',
  PRINTING: 'printing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

const EVENT = {
  QUEUED: 'queued',
  CLAIMED: 'claimed',
  PRINTING: 'printing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRY: 'retry',
  CANCELLED: 'cancelled',
};

const DEFAULT_PROFILE = 'default';

function normalizePayload(payload) {
  if (!payload) return {};
  if (typeof payload === 'object' && !Array.isArray(payload)) return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return { raw: payload };
  }
}

async function recordEvent(jobId, eventType, actor, details = {}) {
  const payload = {
    job_id: jobId,
    event_type: eventType,
    actor: actor || null,
    details,
  };
  const { error } = await supabase.from('printer_job_events').insert(payload);
  if (error) {
    console.error('Failed to record printer job event:', error);
  }
}

async function fetchPrinterConfigSnapshot(profile = DEFAULT_PROFILE) {
  try {
    const { data, error } = await supabase
      .from('company_config')
      .select('printer_config')
      .eq('id', 'default')
      .single();
    if (error) {
      console.error('Failed to fetch printer config snapshot:', error);
      return null;
    }

    const config = data?.printer_config || null;
    if (config && profile && profile !== DEFAULT_PROFILE && config?.profiles?.[profile]) {
      return config.profiles[profile];
    }
    return config;
  } catch (err) {
    console.error('Unexpected error fetching printer config snapshot:', err);
    return null;
  }
}

export async function createJob({
  jobType,
  payload,
  printerProfile = DEFAULT_PROFILE,
  priority = 0,
  scheduledFor,
  requestedBy,
  requestedByLogin,
  requestedByName,
  jobKey,
  maxRetries = 3,
  configSnapshot,
}) {
  if (!jobType) {
    throw new Error('jobType is required');
  }

  const normalizedPayload = normalizePayload(payload);
  const scheduledAt = scheduledFor ? new Date(scheduledFor).toISOString() : new Date().toISOString();
  const snapshot = configSnapshot ?? (await fetchPrinterConfigSnapshot(printerProfile));

  if (jobKey) {
    const { data: existing, error: existingErr } = await supabase
      .from('printer_jobs')
      .select('*')
      .eq('job_type', jobType)
      .eq('job_key', jobKey)
      .in('status', [STATUS.QUEUED, STATUS.ASSIGNED, STATUS.PRINTING])
      .limit(1);

    if (existingErr) {
      console.error('Printer job lookup error:', existingErr);
    } else if (existing && existing.length) {
      return { job: existing[0], duplicate: true };
    }
  }

  const insertPayload = {
    job_type: jobType,
    job_key: jobKey || null,
    status: STATUS.QUEUED,
    priority,
    payload: normalizedPayload,
    printer_profile: printerProfile,
    config_snapshot: snapshot,
    scheduled_for: scheduledAt,
    max_retries: maxRetries,
    requested_by: requestedBy || null,
    requested_by_login: requestedByLogin || null,
    requested_by_name: requestedByName || null,
  };

  const { data, error } = await supabase.from('printer_jobs').insert(insertPayload).select().single();
  if (error) {
    throw new Error(error.message || 'Failed to enqueue printer job');
  }

  await recordEvent(data.id, EVENT.QUEUED, requestedByLogin || requestedByName || requestedBy, {
    priority,
    printerProfile,
  });

  return { job: data, duplicate: false };
}

export async function listJobs({ status, jobType, limit = 50, since, search } = {}) {
  let query = supabase.from('printer_jobs').select('*').order('created_at', { ascending: false }).limit(limit);

  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    query = query.in('status', statuses);
  }

  if (jobType) {
    const jobTypes = Array.isArray(jobType) ? jobType : [jobType];
    query = query.in('job_type', jobTypes);
  }

  if (since) {
    query = query.gte('created_at', new Date(since).toISOString());
  }

  if (search) {
    query = query.ilike('requested_by_login', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to list printer jobs');
  }
  return data || [];
}

export async function getJobById(id) {
  const { data, error } = await supabase.from('printer_jobs').select('*').eq('id', id).single();
  if (error) {
    throw new Error(error.message || 'Printer job not found');
  }
  return data;
}

export async function listJobEvents(jobId, limit = 25) {
  const { data, error } = await supabase
    .from('printer_job_events')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message || 'Failed to load job events');
  }
  return data || [];
}

export async function claimNextJob({ agentId, jobTypes, printerProfiles, includeAssigned = false } = {}) {
  if (!agentId) {
    throw new Error('agentId is required to claim jobs');
  }

  const filters = [];

  let query = supabase
    .from('printer_jobs')
    .select('*')
    .lte('scheduled_for', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(10);

  if (jobTypes?.length) {
    query = query.in('job_type', jobTypes);
  }
  if (printerProfiles?.length) {
    query = query.in('printer_profile', printerProfiles);
  }

  if (includeAssigned) {
    filters.push(STATUS.ASSIGNED);
  }
  filters.push(STATUS.QUEUED);
  query = query.in('status', filters);

  const { data: candidates, error } = await query;
  if (error) {
    throw new Error(error.message || 'Failed to fetch printer jobs to claim');
  }

  if (!candidates?.length) {
    return { job: null };
  }

  for (const candidate of candidates) {
    const nowIso = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from('printer_jobs')
      .update({
        status: STATUS.ASSIGNED,
        claimed_by: agentId,
        claimed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', candidate.id)
      .eq('status', candidate.status)
      .select()
      .single();

    if (updateError) {
      console.warn('Failed to claim printer job (will retry next candidate):', updateError);
      continue;
    }

    if (updated) {
      await recordEvent(candidate.id, EVENT.CLAIMED, agentId, {
        previousStatus: candidate.status,
      });
      return { job: updated };
    }
  }

  return { job: null };
}

export async function markJobPrinting(jobId, { agentId, details } = {}) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('printer_jobs')
    .update({
      status: STATUS.PRINTING,
      updated_at: nowIso,
    })
    .eq('id', jobId)
    .in('status', [STATUS.ASSIGNED, STATUS.PRINTING])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to mark job as printing');
  }

  await recordEvent(jobId, EVENT.PRINTING, agentId || null, details || {});
  return data;
}

export async function completeJob(jobId, { agentId, details } = {}) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('printer_jobs')
    .update({
      status: STATUS.COMPLETED,
      completed_at: nowIso,
      updated_at: nowIso,
      error_message: null,
    })
    .eq('id', jobId)
    .in('status', [STATUS.ASSIGNED, STATUS.PRINTING])
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to complete printer job');
  }

  await recordEvent(jobId, EVENT.COMPLETED, agentId || null, details || {});
  return data;
}

export async function failJob(jobId, { agentId, errorMessage, retryDelaySeconds = 30 } = {}) {
  const job = await getJobById(jobId);
  const nextRetryCount = (job.retry_count || 0) + 1;

  const canRetry = nextRetryCount <= (job.max_retries || 0);
  const nextScheduled =
    canRetry && retryDelaySeconds
      ? new Date(Date.now() + retryDelaySeconds * 1000).toISOString()
      : new Date().toISOString();

  const newStatus = canRetry ? STATUS.QUEUED : STATUS.FAILED;

  const { data, error } = await supabase
    .from('printer_jobs')
    .update({
      status: newStatus,
      retry_count: nextRetryCount,
      scheduled_for: canRetry ? nextScheduled : job.scheduled_for,
      updated_at: new Date().toISOString(),
      error_message: errorMessage || null,
      claimed_by: canRetry ? null : job.claimed_by,
      claimed_at: canRetry ? null : job.claimed_at,
    })
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to update printer job failure state');
  }

  await recordEvent(
    jobId,
    canRetry ? EVENT.RETRY : EVENT.FAILED,
    agentId || null,
    {
      errorMessage,
      retryCount: nextRetryCount,
      maxRetries: job.max_retries,
      scheduled_for: nextScheduled,
    },
  );

  return data;
}

export async function cancelJob(jobId, { actor, reason } = {}) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('printer_jobs')
    .update({
      status: STATUS.CANCELLED,
      updated_at: nowIso,
    })
    .eq('id', jobId)
    .not('status', 'in', `(${STATUS.COMPLETED},${STATUS.CANCELLED})`)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to cancel printer job');
  }

  await recordEvent(jobId, EVENT.CANCELLED, actor || null, { reason });
  return data;
}

export const PrinterJobStatus = STATUS;
export const PrinterJobEvent = EVENT;

