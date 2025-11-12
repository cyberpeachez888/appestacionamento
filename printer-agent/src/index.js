#!/usr/bin/env node
import { Command } from 'commander';
import pino from 'pino';
import 'dotenv/config';
import { startAgent } from './agent.js';

const program = new Command();

program
  .description('Agente de impressão térmica do App Estacionamento')
  .option('--once', 'Processa apenas um job e encerra')
  .option('--interval <ms>', 'Intervalo de polling em milissegundos', (value) => Number(value), undefined)
  .option('--log-level <level>', 'Nível de log (fatal, error, warn, info, debug)', process.env.PRINTER_AGENT_LOG_LEVEL || 'info');

program.parse(process.argv);

const options = program.opts();

const logger = pino({
  name: 'parking-print-agent',
  level: options.logLevel,
});

startAgent({
  once: Boolean(options.once),
  pollIntervalOverride: options.interval,
  logger,
}).catch((error) => {
  logger.error({ err: error }, 'Print Agent encerrado com erro');
  process.exit(1);
});

