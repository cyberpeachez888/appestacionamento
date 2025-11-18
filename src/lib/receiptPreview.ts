import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ReceiptCompanyInfo {
  name?: string;
  legalName?: string;
  cnpj?: string;
  address?: string;
  phone?: string;
}

export interface ReceiptTemplateCustomField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea';
  required: boolean;
  defaultValue: string;
}

export interface ThermalReceiptTemplate {
  templateType: 'parking_ticket' | 'monthly_payment' | 'general_receipt';
  headerText?: string;
  footerText?: string;
  termsAndConditions?: string;
  barcodeType?: string;
  qrCodeData?: string;
  barcodeData?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  isDefault?: boolean;
  // visibility flags
  showLogo?: boolean;
  showCompanyName?: boolean;
  showCompanyDetails?: boolean;
  showReceiptNumber?: boolean;
  showDate?: boolean;
  showTime?: boolean;
  showPlate?: boolean;
  showVehicleType?: boolean;
  showEntryTime?: boolean;
  showExitTime?: boolean;
  showDuration?: boolean;
  showRate?: boolean;
  showValue?: boolean;
  showPaymentMethod?: boolean;
  showOperator?: boolean;
  showQrCode?: boolean;
  showBarcode?: boolean;
  showSignatureLine?: boolean;
  customFields?: ReceiptTemplateCustomField[];
}

export interface ThermalSampleData {
  receiptNumber?: string;
  issuedAt?: Date | string;
  vehicle?: {
    plate?: string;
    model?: string;
  };
  rate?: {
    name?: string;
  };
  payment?: {
    amount?: number;
    method?: string;
    paidAt?: Date | string;
    dueDate?: Date | string;
    receivedBy?: string;
    transactionId?: string;
  };
  plan?: {
    name?: string;
    reference?: string;
  };
  contract?: {
    number?: string;
    start?: Date | string;
    end?: Date | string;
  };
  slot?: string;
  notes?: string;
  customFieldValues?: Record<string, string>;
}

export const FALLBACK_COMPANY: ReceiptCompanyInfo = {
  name: 'Estacionamento Modelo',
  legalName: 'Estacionamento Modelo LTDA',
  cnpj: '12.345.678/0001-90',
  address: 'Av. Central, 123 - Centro - São Paulo/SP',
  phone: '(11) 3333-0000',
};

export function formatCurrencyBR(value: number | undefined | null) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return 'R$ 0,00';
  }
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function toDate(value: Date | string | undefined | null) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return new Date(value);
}

export function formatDateBR(value: Date | string | undefined | null) {
  return toDate(value).toLocaleDateString('pt-BR');
}

export function formatTimeBR(value: Date | string | undefined | null) {
  return toDate(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function wrapText(text: string, width: number) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    if (!word) return;
    const tentative = line ? `${line} ${word}` : word;
    if (tentative.length > width) {
      if (line) lines.push(line);
      line = word.length > width ? word.slice(0, width) : word;
    } else {
      line = tentative;
    }
  });
  if (line) lines.push(line);
  return lines;
}

export function resolveCustomFieldValue(
  field: ReceiptTemplateCustomField,
  sample: ThermalSampleData
) {
  if (!field) return null;
  const map = sample?.customFieldValues || {};
  if (map[field.name]) return map[field.name];
  if (field.defaultValue) return field.defaultValue;
  return '';
}

export function generateThermalPreview(
  template: ThermalReceiptTemplate,
  sample: ThermalSampleData,
  companyConfig: ReceiptCompanyInfo | null | undefined
) {
  const width = 32;
  const company = companyConfig || FALLBACK_COMPANY;
  const lines: string[] = [];
  const separator = '-'.repeat(width);
  const push = (value: string = '') => lines.push(value);
  const center = (value: string) => {
    if (!value) return;
    const trimmed = value.slice(0, width);
    const padding = Math.floor((width - trimmed.length) / 2);
    push(`${' '.repeat(Math.max(padding, 0))}${trimmed}`);
  };

  // Header ProParking
  center('════════════════════');
  center('🚗 PROPARKING APP');
  center('       2025');
  center('════════════════════');
  push('');
  
  if (template.showLogo) {
    center('[ LOGO ]');
  }
  if (template.showCompanyName && company?.name) {
    center(company.name);
  }
  if (template.showCompanyDetails) {
    if (company?.legalName) center(company.legalName);
    if (company?.cnpj) center(`CNPJ: ${company.cnpj}`);
    if (company?.address) center(company.address);
    if (company?.phone) center(`Tel: ${company.phone}`);
  }
  if (template.headerText) {
    wrapText(template.headerText, width).forEach(center);
  }

  push(separator);

  if (template.showReceiptNumber && sample.receiptNumber) {
    push(`RECIBO: ${sample.receiptNumber}`);
  }

  const baseDate = sample.payment?.paidAt || sample.issuedAt;
  if (template.showDate && baseDate) {
    push(`Data: ${formatDateBR(baseDate)}`);
  }
  if (template.showTime && baseDate) {
    push(`Hora: ${formatTimeBR(baseDate)}`);
  }
  if (template.showPlate && sample.vehicle?.plate) {
    push(`Placa: ${sample.vehicle.plate}`);
  }
  if (template.showVehicleType && sample.vehicle?.model) {
    push(`Veículo: ${sample.vehicle.model}`);
  }
  if (template.showEntryTime && sample.customFieldValues?.entryTime) {
    push(`Entrada: ${sample.customFieldValues.entryTime}`);
  }
  if (template.showExitTime && sample.customFieldValues?.exitTime) {
    push(`Saída: ${sample.customFieldValues.exitTime}`);
  }
  if (template.showDuration && sample.customFieldValues?.duration) {
    push(`Permanência: ${sample.customFieldValues.duration}`);
  }
  if (template.showRate && sample.rate?.name) {
    push(`Tarifa: ${sample.rate.name}`);
  }

  if (template.templateType === 'monthly_payment') {
    if (sample.plan?.name) {
      push(`Plano: ${sample.plan.name}`);
    }
    if (sample.plan?.reference) {
      push(`Referência: ${sample.plan.reference}`);
    }
    if (sample.contract?.number) {
      push(`Contrato: ${sample.contract.number}`);
    }
    if (sample.payment?.dueDate) {
      push(`Venc.: ${formatDateBR(sample.payment.dueDate)}`);
    }
    if (sample.slot) {
      push(`Vaga: ${sample.slot}`);
    }
  }

  if (template.showValue) {
    push(`Valor: ${formatCurrencyBR(sample.payment?.amount)}`);
  }
  if (template.showPaymentMethod && sample.payment?.method) {
    push(`Pagamento: ${sample.payment.method}`);
  }
  if (template.showOperator && sample.payment?.receivedBy) {
    push(`Operador: ${sample.payment.receivedBy}`);
  }

  if (template.customFields?.length) {
    push(separator);
    template.customFields.forEach((field) => {
      const value = resolveCustomFieldValue(field, sample);
      if (value) {
        wrapText(`${field.label || field.name}: ${value}`, width).forEach(push);
      }
    });
  }

  if (sample.notes) {
    push(separator);
    wrapText(sample.notes, width).forEach(push);
  }

  if (template.termsAndConditions) {
    push(separator);
    wrapText(template.termsAndConditions, width).forEach(push);
  }

  if (template.footerText) {
    push(separator);
    wrapText(template.footerText, width).forEach(center);
  }

  if (template.showSignatureLine) {
    push('');
    push('____________________________');
    push('Assinatura do Responsável');
  }

  push('');
  return lines.join('\n');
}

