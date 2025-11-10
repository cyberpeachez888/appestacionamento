import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups', 'manual');

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function fetchTable(name) {
  const { data, error } = await supabase.from(name).select('*');
  if (error) throw error;
  return data || [];
}

export async function createFullBackup({ createdBy } = {}) {
  ensureDir();
  // Tables to export (mirror schema)
  const tables = [
    'rates',
    'monthly_customers',
    'tickets',
    'payments',
    'users',
    'company_config',
    'vehicle_types',
    'user_events',
    'monthly_reports',
    'receipts',
  ];

  const data = {};
  for (const t of tables) {
    try {
      data[t] = await fetchTable(t);
    } catch (err) {
      // If table doesn't exist, continue with empty
      data[t] = [];
    }
  }

  const metadata = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    created_by: createdBy || 'system',
    tables: tables,
  };

  const payload = { metadata, data };
  const json = JSON.stringify(payload, null, 2);

  const checksum = crypto.createHash('sha256').update(json).digest('hex');
  metadata.checksum = checksum;

  const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}_${metadata.created_by}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf-8');

  // return metadata with file info
  const stats = fs.statSync(filepath);
  return {
    id: filename,
    filename,
    path: filepath,
    size: stats.size,
    timestamp: metadata.timestamp,
    created_by: metadata.created_by,
    checksum,
  };
}

export function listBackups() {
  ensureDir();
  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const p = path.join(BACKUP_DIR, f);
    const stats = fs.statSync(p);
    return {
      id: f,
      filename: f,
      path: p,
      size: stats.size,
      timestamp: stats.mtime.toISOString(),
    };
  }).sort((a,b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export function getBackupPath(id) {
  const p = path.join(BACKUP_DIR, id);
  if (!fs.existsSync(p)) return null;
  return p;
}

export function deleteBackup(id) {
  const p = getBackupPath(id);
  if (!p) throw new Error('Backup not found');
  fs.unlinkSync(p);
  return true;
}

export async function previewBackupFile(filePath) {
  // Read and return basic counts without restoring
  const raw = fs.readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(raw);
  const summary = {};
  for (const t of Object.keys(payload.data || {})) {
    summary[t] = Array.isArray(payload.data[t]) ? payload.data[t].length : (payload.data[t] ? 1 : 0);
  }
  return { metadata: payload.metadata || {}, summary };
}

export async function restoreFromFile(filePath, { tables } = {}) {
  // WARNING: destructive operation. Caller must ensure permissions and confirmations.
  const raw = fs.readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(raw);
  const importedTables = Object.keys(payload.data || {});
  const toRestore = tables && tables.length ? tables : importedTables;

  // For each table, we perform delete and insert (simple approach)
  for (const t of toRestore) {
    if (!(t in payload.data)) continue;
    const rows = payload.data[t] || [];
    // delete existing
    await supabase.from(t).delete().neq('id', '');
    if (rows.length) {
      // chunk inserts to avoid large payloads
      const chunkSize = 500;
      for (let i=0;i<rows.length;i+=chunkSize) {
        const chunk = rows.slice(i, i+chunkSize);
        const { error } = await supabase.from(t).insert(chunk);
        if (error) throw error;
      }
    }
  }
  return { restored: toRestore.length };
}

export default { createFullBackup, listBackups, getBackupPath, deleteBackup, previewBackupFile, restoreFromFile };
