#!/usr/bin/env node

/**
 * Export Yearly Summary
 * Creates backup files of all monthly reports for a specific year
 * 
 * Usage: node export-yearly-summary.js --year 2025
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

async function exportYearlySummary() {
  // Get year from command line
  const yearArg = process.argv.find(arg => arg.startsWith('--year='));
  const year = yearArg ? parseInt(yearArg.split('=')[1]) : new Date().getFullYear();

  console.log(`\n📊 Exporting yearly summary for ${year}...\n`);

  try {
    // Fetch all reports for the year
    const { data: reports, error } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('report_year', year)
      .order('report_month', { ascending: true });

    if (error) {
      console.error('❌ Error fetching reports:', error.message);
      return;
    }

    if (!reports || reports.length === 0) {
      console.log(`ℹ️  No reports found for year ${year}`);
      return;
    }

    console.log(`✅ Found ${reports.length} reports for ${year}\n`);

    // Calculate totals
    const yearlyTotals = {
      totalRevenue: 0,
      avulsosRevenue: 0,
      mensalistasRevenue: 0,
      cashTotal: 0,
      pixTotal: 0,
      debitCardTotal: 0,
      creditCardTotal: 0,
      totalTickets: 0,
      ticketsClosed: 0
    };

    reports.forEach(r => {
      yearlyTotals.totalRevenue += Number(r.total_revenue) || 0;
      yearlyTotals.avulsosRevenue += Number(r.avulsos_revenue) || 0;
      yearlyTotals.mensalistasRevenue += Number(r.mensalistas_revenue) || 0;
      yearlyTotals.cashTotal += Number(r.cash_total) || 0;
      yearlyTotals.pixTotal += Number(r.pix_total) || 0;
      yearlyTotals.debitCardTotal += Number(r.debit_card_total) || 0;
      yearlyTotals.creditCardTotal += Number(r.credit_card_total) || 0;
      yearlyTotals.totalTickets += Number(r.total_tickets) || 0;
      yearlyTotals.ticketsClosed += Number(r.tickets_closed) || 0;
    });

    // === 1. Create Text Summary ===
    const textSummary = generateTextSummary(year, reports, yearlyTotals);
    const textFilename = `reports_${year}_summary.txt`;
    fs.writeFileSync(textFilename, textSummary, 'utf-8');
    console.log(`✅ Created: ${textFilename}`);

    // === 2. Create JSON Backup ===
    const jsonFilename = `reports_${year}_full_data.json`;
    fs.writeFileSync(jsonFilename, JSON.stringify(reports, null, 2), 'utf-8');
    console.log(`✅ Created: ${jsonFilename}`);

    // === 3. Create CSV of Payments ===
    const csvContent = generatePaymentsCSV(reports);
    const csvFilename = `reports_${year}_payments.csv`;
    fs.writeFileSync(csvFilename, csvContent, 'utf-8');
    console.log(`✅ Created: ${csvFilename}`);

    console.log('\n═══════════════════════════════════════');
    console.log('✨ Yearly export completed successfully!');
    console.log('═══════════════════════════════════════\n');
    console.log(`📁 Files created in: ${process.cwd()}`);
    console.log(`📊 Total Revenue ${year}: R$ ${yearlyTotals.totalRevenue.toFixed(2)}`);
    console.log(`🎫 Total Tickets: ${yearlyTotals.totalTickets}\n`);

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

function generateTextSummary(year, reports, totals) {
  let summary = `
═══════════════════════════════════════════════════════════
            RELATÓRIO ANUAL - ${year}
═══════════════════════════════════════════════════════════

RESUMO GERAL DO ANO:
-------------------
Receita Total:        R$ ${totals.totalRevenue.toFixed(2)}
  • Avulsos:          R$ ${totals.avulsosRevenue.toFixed(2)}
  • Mensalistas:      R$ ${totals.mensalistasRevenue.toFixed(2)}

Formas de Pagamento:
  • Dinheiro:         R$ ${totals.cashTotal.toFixed(2)}
  • PIX:              R$ ${totals.pixTotal.toFixed(2)}
  • Cartão Débito:    R$ ${totals.debitCardTotal.toFixed(2)}
  • Cartão Crédito:   R$ ${totals.creditCardTotal.toFixed(2)}

Tickets Processados:  ${totals.totalTickets}
Tickets Finalizados:  ${totals.ticketsClosed}

═══════════════════════════════════════════════════════════
            DETALHAMENTO MENSAL
═══════════════════════════════════════════════════════════

`;

  reports.forEach(r => {
    const monthName = MONTHS[r.report_month - 1];
    summary += `
${monthName}/${year}:
  Receita Total:        R$ ${Number(r.total_revenue).toFixed(2)}
  • Avulsos:            R$ ${Number(r.avulsos_revenue).toFixed(2)}
  • Mensalistas:        R$ ${Number(r.mensalistas_revenue).toFixed(2)}
  Tickets:              ${r.total_tickets}
  Gerado em:            ${new Date(r.generated_at).toLocaleString('pt-BR')}
  Operador:             ${r.operator_name}
-----------------------------------------------------------
`;
  });

  summary += `
═══════════════════════════════════════════════════════════
Exportado em: ${new Date().toLocaleString('pt-BR')}
═══════════════════════════════════════════════════════════
`;

  return summary;
}

function generatePaymentsCSV(reports) {
  let csv = 'Mês,Ano,Data Geração,Receita Total,Avulsos,Mensalistas,Dinheiro,PIX,Débito,Crédito,Tickets,Operador\n';
  
  reports.forEach(r => {
    csv += [
      MONTHS[r.report_month - 1],
      r.report_year,
      new Date(r.generated_at).toLocaleDateString('pt-BR'),
      Number(r.total_revenue).toFixed(2),
      Number(r.avulsos_revenue).toFixed(2),
      Number(r.mensalistas_revenue).toFixed(2),
      Number(r.cash_total).toFixed(2),
      Number(r.pix_total).toFixed(2),
      Number(r.debit_card_total).toFixed(2),
      Number(r.credit_card_total).toFixed(2),
      r.total_tickets,
      r.operator_name
    ].join(',') + '\n';
  });

  return csv;
}

// Run the export
exportYearlySummary();
