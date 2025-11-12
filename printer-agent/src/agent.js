import axios from 'axios';
import os from 'os';
import process from 'process';
import { dispatchPrint } from './printer.js';
import { sleep } from './utils.js';

const VERSION = '0.1.0';

const REQUIRED_ENV = ['PRINTER_AGENT_SECRET'];

function validateEnv(logger) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    logger.error({ missing }, 'Variáveis obrigatórias ausentes para o Print Agent');
    throw new Error('Configure as variáveis de ambiente do Print Agent antes de iniciar.');
  }
}

export async function startAgent({ once = false, pollIntervalOverride, logger = console } = {}) {
  validateEnv(logger);

  const baseURL = process.env.PRINTER_AGENT_API_URL || 'http://localhost:3000';
  const agentSecret = process.env.PRINTER_AGENT_SECRET;
  const agentId = process.env.PRINTER_AGENT_ID || os.hostname();
  const printerProfile = process.env.PRINTER_AGENT_PROFILE || 'default';
  const pollInterval = pollIntervalOverride
    ? Number(pollIntervalOverride)
    : Number(process.env.PRINTER_AGENT_POLL_INTERVAL || 5000);
  const retryDelaySeconds = Number(process.env.PRINTER_AGENT_RETRY_DELAY || 30);
  const jobTypesEnv = (process.env.PRINTER_AGENT_JOB_TYPES || 'manual_receipt,ticket_receipt').split(',');
  const jobTypes = jobTypesEnv.map((type) => type.trim()).filter(Boolean);

  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'x-printer-agent-key': agentSecret,
      'x-printer-agent-id': agentId,
    },
  });

  logger.info({
    baseURL,
    agentId,
    printerProfile,
    pollInterval,
    jobTypes,
    version: VERSION,
  }, 'Print Agent iniciado');

  async function claimJob() {
    const { data } = await client.post('/printer-agent/claim', {
      agentId,
      jobTypes,
      printerProfiles: [printerProfile],
      includeAssigned: true,
    });
    return data?.job || null;
  }

  async function markPrinting(jobId) {
    await client.post(`/printer-agent/jobs/${jobId}/printing`, {
      agentId,
      details: { agentId, version: VERSION },
    });
  }

  async function markComplete(jobId) {
    await client.post(`/printer-agent/jobs/${jobId}/complete`, {
      agentId,
      details: { agentId, version: VERSION },
    });
  }

  async function markFailed(jobId, error) {
    await client.post(`/printer-agent/jobs/${jobId}/fail`, {
      agentId,
      error: error.message || String(error),
      retryDelaySeconds,
    });
  }

  let running = true;
  process.on('SIGINT', () => {
    logger.info('Encerrando Print Agent (SIGINT)');
    running = false;
  });
  process.on('SIGTERM', () => {
    logger.info('Encerrando Print Agent (SIGTERM)');
    running = false;
  });

  do {
    try {
      const job = await claimJob();
      if (!job) {
        if (once) {
          logger.info('Nenhum job encontrado. Encerrando (modo once).');
          return;
        }
        await sleep(pollInterval);
        continue;
      }

      logger.info({ jobId: job.id, jobType: job.job_type }, 'Job de impressão recebido');
      await markPrinting(job.id);

      try {
        await dispatchPrint(job, logger);
        await markComplete(job.id);
      } catch (printError) {
        logger.error({ err: printError, jobId: job.id }, 'Falha durante impressão');
        await markFailed(job.id, printError);
      }

      if (once) {
        logger.info('Job processado em modo once. Encerrando.');
        return;
      }
    } catch (error) {
      logger.error({ err: error }, 'Erro no loop principal do Print Agent');
      if (once) throw error;
      await sleep(Math.max(pollInterval, 5000));
    }
  } while (running);

  logger.info('Print Agent finalizado.');
}

