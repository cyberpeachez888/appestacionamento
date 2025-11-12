import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DOTENV_PATH = path.join(projectRoot, '.env');

if (fs.existsSync(DOTENV_PATH)) {
  dotenv.config({ path: DOTENV_PATH });
}

const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'JWT_SECRET',
  'FRONTEND_URL',
  'SEED_ADMIN_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM'
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('\n❌ Variáveis de ambiente ausentes:');
  missing.forEach((key) => {
    console.error(`  - ${key}`);
  });
  console.error('\nDefina-as antes de continuar com deploy ou seeds.\n');
  process.exit(1);
} else {
  console.log('✅ Todas as variáveis críticas estão definidas.');
}

