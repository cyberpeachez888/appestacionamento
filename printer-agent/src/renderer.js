import { format } from 'date-fns';

const defaultWidthByPaper = {
  '58mm': 32,
  '57mm': 32,
  '80mm': 48,
};

function resolveWidth(printerConfig = {}) {
  const paperWidth = (printerConfig.paperWidth || '').toLowerCase();
  return defaultWidthByPaper[paperWidth] || 42;
}

function centerText(text, width) {
  if (!text) return ''.padEnd(width, ' ');
  const trimmed = text.toString();
  if (trimmed.length >= width) return trimmed.slice(0, width);
  const leftPadding = Math.floor((width - trimmed.length) / 2);
  const rightPadding = width - trimmed.length - leftPadding;
  return `${' '.repeat(leftPadding)}${trimmed}${' '.repeat(rightPadding)}`;
}

function separator(width, char = '-') {
  return Array.from({ length: width }, () => char).join('');
}

function padLabelValue(label, value, width) {
  const safeLabel = label ? `${label}:` : '';
  const line = `${safeLabel} ${value ?? ''}`.trim();
  if (line.length <= width) return line;
  return line;
}

export function renderReceiptLines(payload, printerConfig = {}) {
  const width = resolveWidth(printerConfig);
  const lines = [];

  if (payload.company?.name) {
    lines.push(centerText(payload.company.name, width));
  }
  if (payload.company?.legalName) {
    lines.push(centerText(payload.company.legalName, width));
  }
  if (payload.company?.cnpj) {
    lines.push(centerText(`CNPJ: ${payload.company.cnpj}`, width));
  }
  if (payload.company?.address) {
    lines.push(centerText(payload.company.address, width));
  }
  if (payload.company?.phone) {
    lines.push(centerText(`Tel: ${payload.company.phone}`, width));
  }

  lines.push(separator(width, '='));

  if (payload.receiptNumber !== undefined && payload.receiptNumber !== null) {
    lines.push(centerText(`RECIBO Nº ${String(payload.receiptNumber).padStart(6, '0')}`, width));
    lines.push(separator(width));
  }

  const issuedDate = payload.issuedAt ? new Date(payload.issuedAt) : new Date();
  lines.push(padLabelValue('Data', format(issuedDate, 'dd/MM/yyyy'), width));
  lines.push(padLabelValue('Horário', format(issuedDate, 'HH:mm'), width));

  if (payload.vehicle?.plate) {
    lines.push(padLabelValue('Placa', payload.vehicle.plate, width));
  }

  if (payload.payment?.method) {
    lines.push(padLabelValue('Pagamento', payload.payment.method, width));
  }

  if (payload.totals?.amount !== undefined) {
    const amount = Number(payload.totals.amount).toFixed(2);
    lines.push(padLabelValue('Valor', `R$ ${amount}`, width));
  }

  if (payload.customFields?.length) {
    lines.push(separator(width));
    payload.customFields.forEach((field) => {
      if (field?.value) {
        lines.push(padLabelValue(field.label || field.name, field.value, width));
      }
    });
  }

  if (payload.observation) {
    lines.push(separator(width));
    lines.push('Observações:');
    const wrapped = wrapText(payload.observation, width);
    wrapped.forEach((line) => lines.push(line));
  }

  if (payload.template?.termsAndConditions) {
    lines.push(separator(width));
    lines.push('ATENÇÃO:');
    wrapText(payload.template.termsAndConditions, width).forEach((line) => lines.push(line));
  }

  if (payload.template?.footerText) {
    lines.push(separator(width));
    wrapText(payload.template.footerText, width).forEach((line) => lines.push(centerText(line, width)));
  }

  lines.push('');
  lines.push(centerText('_______________________________', width));
  lines.push(centerText('Assinatura do Responsável', width));
  lines.push('');
  return lines;
}

function wrapText(text, width) {
  if (!text) return [];
  const words = text.toString().split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    if (!word) return;
    const tentative = line ? `${line} ${word}` : word;
    if (tentative.length > width) {
      if (line) lines.push(line);
      if (word.length > width) {
        lines.push(word.slice(0, width));
        line = word.slice(width);
      } else {
        line = word;
      }
    } else {
      line = tentative;
    }
  });
  if (line) lines.push(line);
  return lines;
}

export function renderReceiptText(payload, printerConfig = {}) {
  return renderReceiptLines(payload, printerConfig).join('\n');
}

