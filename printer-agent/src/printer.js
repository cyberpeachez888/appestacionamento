import fs from 'fs';
import path from 'path';
import { renderReceiptLines, renderReceiptText } from './renderer.js';
import { ensureDirectory, parseHexOrDecimal } from './utils.js';

const OUTPUT_DIR = process.env.PRINTER_AGENT_OUTPUT_DIR || path.resolve(process.cwd(), 'out');

async function loadEscposModules(connectionType) {
  try {
    const escposCore = await import('@node-escpos/core');
    if (connectionType === 'usb') {
      const escposUsb = await import('@node-escpos/usb');
      return { escposCore: escposCore.default, escposDevice: escposUsb.default };
    }
    if (connectionType === 'network') {
      const escposNet = await import('@node-escpos/network');
      return { escposCore: escposCore.default, escposDevice: escposNet.default };
    }
    return { escposCore: escposCore.default };
  } catch (error) {
    throw new Error(
      `Dependências ESC/POS não instaladas. Execute "npm install" dentro de printer-agent. Erro: ${error.message}`
    );
  }
}

async function printWithUsb(lines, config, logger) {
  const { escposCore, escposDevice } = await loadEscposModules('usb');
  const vendorId = parseHexOrDecimal(config?.usbVendorId) ?? parseHexOrDecimal(process.env.PRINTER_AGENT_USB_VENDOR_ID);
  const productId =
    parseHexOrDecimal(config?.usbProductId) ?? parseHexOrDecimal(process.env.PRINTER_AGENT_USB_PRODUCT_ID);

  const device = new escposDevice(vendorId, productId);
  const printer = await escposCore.Printer.create(device, { width: lines[0]?.length || 32 });

  try {
    lines.forEach((line) => {
      printer.text(line);
    });
    printer.newLine();

    if (config?.enableCut !== false) {
      printer.cut();
    }
    if (config?.enableBeep) {
      printer.beep();
    }
    if (config?.enableDrawer) {
      printer.cashdraw();
    }
  } finally {
    await printer.close();
  }
  logger.info('Job impresso via USB');
}

async function printWithNetwork(lines, config, logger) {
  const { escposCore, escposDevice } = await loadEscposModules('network');
  const host = config?.networkHost || process.env.PRINTER_AGENT_NETWORK_HOST;
  const port = config?.networkPort || Number(process.env.PRINTER_AGENT_NETWORK_PORT) || 9100;

  if (!host) {
    throw new Error('Configuração de rede ausente (host).');
  }

  const device = new escposDevice(host, port);
  const printer = await escposCore.Printer.create(device, { width: lines[0]?.length || 32 });

  try {
    lines.forEach((line) => {
      printer.text(line);
    });
    printer.newLine();

    if (config?.enableCut !== false) {
      printer.cut();
    }
    if (config?.enableBeep) {
      printer.beep();
    }
    if (config?.enableDrawer) {
      printer.cashdraw();
    }
  } finally {
    await printer.close();
  }
  logger.info({ host, port }, 'Job impresso via rede');
}

async function printToFile(lines, fileName, logger) {
  await ensureDirectory(fs, OUTPUT_DIR);
  const filePath = path.join(OUTPUT_DIR, fileName);
  await fs.promises.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
  logger.info({ filePath }, 'Arquivo de recibo gerado (modo arquivo)');
}

export async function dispatchPrint(job, logger = console) {
  const payload = job.payload || {};
  const printerConfig = job.config_snapshot || payload.printerConfig || {};
  const connectionType =
    (printerConfig.connectionType || process.env.PRINTER_AGENT_CONNECTION_TYPE || 'mock').toLowerCase();

  const lines = renderReceiptLines(payload, printerConfig);
  const printableText = renderReceiptText(payload, printerConfig);

  switch (connectionType) {
    case 'usb':
      return printWithUsb(lines, printerConfig, logger);
    case 'network':
      return printWithNetwork(lines, printerConfig, logger);
    case 'file':
      return printToFile(lines, `receipt-${job.id}.txt`, logger);
    case 'console':
    case 'mock':
    default:
      logger.info('--- INÍCIO DO RECIBO (modo console/mock) ---');
      logger.info(`Job ${job.id}`);
      logger.info(printableText);
      logger.info('--- FIM DO RECIBO ---');
  }
}

