import {
  createJob,
  listJobs,
  getJobById,
  listJobEvents,
  claimNextJob,
  markJobPrinting,
  completeJob,
  failJob,
  cancelJob,
  PrinterJobStatus,
} from '../services/printerJobService.js';

const DEFAULT_LIMIT = 50;

function parseArrayParam(value) {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return undefined;
}

export default {
  async enqueue(req, res) {
    try {
      const { jobType, payload, printerProfile, priority, scheduledFor, jobKey, maxRetries } = req.body || {};
      if (!jobType || !payload) {
        return res.status(400).json({ error: 'jobType and payload are required' });
      }

      const user = req.user || {};
      const { job, duplicate } = await createJob({
        jobType,
        payload,
        printerProfile,
        priority,
        scheduledFor,
        jobKey,
        maxRetries,
        requestedBy: user.id,
        requestedByLogin: user.login,
        requestedByName: user.name,
      });

      res.status(duplicate ? 200 : 201).json({ job, duplicate });
    } catch (error) {
      console.error('enqueue printer job error:', error);
      res.status(500).json({ error: error.message || 'Failed to enqueue printer job' });
    }
  },

  async list(req, res) {
    try {
      const status = parseArrayParam(req.query.status);
      const jobType = parseArrayParam(req.query.jobType);
      const limit = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
      const since = req.query.since;
      const search = req.query.search;

      const jobs = await listJobs({ status, jobType, limit, since, search });
      res.json({ jobs });
    } catch (error) {
      console.error('list printer jobs error:', error);
      res.status(500).json({ error: error.message || 'Failed to list printer jobs' });
    }
  },

  async get(req, res) {
    try {
      const { id } = req.params;
      const [job, events] = await Promise.all([getJobById(id), listJobEvents(id, 50)]);
      res.json({ job, events });
    } catch (error) {
      console.error('get printer job error:', error);
      res.status(404).json({ error: error.message || 'Printer job not found' });
    }
  },

  async cancel(req, res) {
    try {
      const { id } = req.params;
      const reason = req.body?.reason;
      const user = req.user || {};
      const job = await cancelJob(id, {
        actor: user.login || user.name || user.id,
        reason,
      });
      res.json({ job });
    } catch (error) {
      console.error('cancel printer job error:', error);
      res.status(500).json({ error: error.message || 'Failed to cancel printer job' });
    }
  },

  async claim(req, res) {
    try {
      const agentId = req.printerAgentId || req.body?.agentId;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }

      const jobTypes = parseArrayParam(req.body?.jobTypes);
      const printerProfiles = parseArrayParam(req.body?.printerProfiles);
      const includeAssigned = Boolean(req.body?.includeAssigned);

      const { job } = await claimNextJob({ agentId, jobTypes, printerProfiles, includeAssigned });
      res.json({ job });
    } catch (error) {
      console.error('claim printer job error:', error);
      res.status(500).json({ error: error.message || 'Failed to claim printer job' });
    }
  },

  async markPrinting(req, res) {
    try {
      const { id } = req.params;
      const agentId = req.printerAgentId || req.body?.agentId;
      const details = req.body?.details;
      const job = await markJobPrinting(id, { agentId, details });
      res.json({ job });
    } catch (error) {
      console.error('mark printing job error:', error);
      res.status(500).json({ error: error.message || 'Failed to mark printer job as printing' });
    }
  },

  async complete(req, res) {
    try {
      const { id } = req.params;
      const agentId = req.printerAgentId || req.body?.agentId;
      const details = req.body?.details;
      const job = await completeJob(id, { agentId, details });
      res.json({ job });
    } catch (error) {
      console.error('complete printer job error:', error);
      res.status(500).json({ error: error.message || 'Failed to complete printer job' });
    }
  },

  async fail(req, res) {
    try {
      const { id } = req.params;
      const agentId = req.printerAgentId || req.body?.agentId;
      const errorMessage = req.body?.error || req.body?.errorMessage;
      const retryDelaySeconds = req.body?.retryDelaySeconds;
      const job = await failJob(id, { agentId, errorMessage, retryDelaySeconds });
      res.json({ job });
    } catch (error) {
      console.error('fail printer job error:', error);
      res.status(500).json({ error: error.message || 'Failed to update printer job failure state' });
    }
  },

  async statuses(req, res) {
    res.json({ statuses: PrinterJobStatus });
  },
};

