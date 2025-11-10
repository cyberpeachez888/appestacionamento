#!/usr/bin/env node

/**
 * Delete Test Report
 * Removes the most recent monthly report so you can test generation again
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function deleteLastReport() {
  console.log('\n🗑️  Deleting most recent report...\n');

  try {
    // Get the most recent report
    const { data: reports, error: fetchError } = await supabase
      .from('monthly_reports')
      .select('id, report_month, report_year, generated_at')
      .order('generated_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('❌ Error fetching reports:', fetchError.message);
      return;
    }

    if (!reports || reports.length === 0) {
      console.log('ℹ️  No reports found to delete.');
      return;
    }

    console.log('📋 Found reports:');
    reports.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.report_month}/${r.report_year} - ${new Date(r.generated_at).toLocaleString('pt-BR')}`);
    });

    const reportToDelete = reports[0];
    console.log(`\n🎯 Deleting: ${reportToDelete.report_month}/${reportToDelete.report_year}\n`);

    // Delete archived tickets for this report
    const { error: deleteArchivedError } = await supabase
      .from('archived_tickets')
      .delete()
      .eq('report_id', reportToDelete.id);

    if (deleteArchivedError) {
      console.log('⚠️  Warning: Could not delete archived tickets:', deleteArchivedError.message);
    } else {
      console.log('✅ Archived tickets deleted');
    }

    // Delete the report
    const { error: deleteReportError } = await supabase
      .from('monthly_reports')
      .delete()
      .eq('id', reportToDelete.id);

    if (deleteReportError) {
      console.error('❌ Error deleting report:', deleteReportError.message);
      return;
    }

    console.log('✅ Report deleted successfully!\n');
    console.log('You can now generate a new report to test the clearing functionality.\n');

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

deleteLastReport();
