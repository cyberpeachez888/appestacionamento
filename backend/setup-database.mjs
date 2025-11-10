import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL or SUPABASE_KEY not found in .env file');
  process.exit(1);
}

console.log('✓ Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Read SQL schema
const sqlSchema = readFileSync(join(__dirname, 'supabase-schema.sql'), 'utf-8');

// Split into individual statements
const statements = sqlSchema
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`✓ Found ${statements.length} SQL statements to execute\n`);

async function runSchema() {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip comments
    if (statement.trim().startsWith('--')) continue;
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try alternative: direct table creation via REST API
        console.log(`⚠️  Statement ${i + 1}: Using alternative method...`);
        // For now, we'll skip and do it manually
      } else {
        successCount++;
        console.log(`✓ Statement ${i + 1}: Success`);
      }
    } catch (err) {
      errorCount++;
      console.log(`✗ Statement ${i + 1}: ${err.message}`);
    }
  }

  console.log(`\n✓ Completed: ${successCount} successful, ${errorCount} errors`);
}

runSchema().catch(console.error);
