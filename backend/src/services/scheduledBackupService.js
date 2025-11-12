import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups', 'automatic');

let scheduledTask = null;
let backupConfig = {
  enabled: false,
  schedule: '0 2 * * *', // Default: 2 AM daily
  retentionDays: 30,
};

function ensureDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function fetchTable(name) {
  const { data, error } = await supabase.from(name).select('*');
  if (error) throw error;
  return data || [];
}

async function createAutoBackup() {
  try {
    console.log('[Auto Backup] Starting automatic backup...');
    ensureDir();

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
        console.warn(`[Auto Backup] Failed to fetch table ${t}:`, err.message);
        data[t] = [];
      }
    }

    const metadata = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      created_by: 'automatic',
      tables: tables,
      type: 'automatic',
    };

    const payload = { metadata, data };
    const json = JSON.stringify(payload, null, 2);
    const checksum = crypto.createHash('sha256').update(json).digest('hex');
    metadata.checksum = checksum;

    const filename = `auto_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf-8');

    const stats = fs.statSync(filepath);
    console.log(`[Auto Backup] Created: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);

    // Clean old backups
    await cleanOldBackups();

    return {
      success: true,
      filename,
      size: stats.size,
      timestamp: metadata.timestamp,
    };
  } catch (err) {
    console.error('[Auto Backup] Failed:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}

async function cleanOldBackups() {
  try {
    ensureDir();
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json'));
    const now = Date.now();
    const maxAge = backupConfig.retentionDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    for (const file of files) {
      const filepath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filepath);
      const age = now - stats.mtime.getTime();

      if (age > maxAge) {
        fs.unlinkSync(filepath);
        deletedCount++;
        console.log(`[Auto Backup] Deleted old backup: ${file}`);
      }
    }

    if (deletedCount > 0) {
      console.log(`[Auto Backup] Cleaned ${deletedCount} old backup(s)`);
    }
  } catch (err) {
    console.error('[Auto Backup] Failed to clean old backups:', err);
  }
}

export function startScheduledBackups(config = {}) {
  // Merge config
  backupConfig = { ...backupConfig, ...config };

  if (!backupConfig.enabled) {
    console.log('[Auto Backup] Scheduled backups are disabled');
    return;
  }

  // Stop existing task if any
  if (scheduledTask) {
    scheduledTask.stop();
  }

  // Validate cron expression
  if (!cron.validate(backupConfig.schedule)) {
    console.error('[Auto Backup] Invalid cron schedule:', backupConfig.schedule);
    return;
  }

  // Schedule the task
  scheduledTask = cron.schedule(backupConfig.schedule, async () => {
    console.log('[Auto Backup] Triggered by schedule:', backupConfig.schedule);
    await createAutoBackup();
  });

  console.log(
    `[Auto Backup] Scheduled: ${backupConfig.schedule} (Retention: ${backupConfig.retentionDays} days)`
  );
}

export function stopScheduledBackups() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Auto Backup] Stopped scheduled backups');
  }
}

export function getBackupConfig() {
  return { ...backupConfig };
}

export async function updateBackupConfig(newConfig) {
  const oldEnabled = backupConfig.enabled;
  backupConfig = { ...backupConfig, ...newConfig };

  // Restart scheduler if enabled status changed or schedule changed
  if (backupConfig.enabled && (!oldEnabled || newConfig.schedule)) {
    startScheduledBackups(backupConfig);
  } else if (!backupConfig.enabled && oldEnabled) {
    stopScheduledBackups();
  }

  // Save to company_config table for persistence
  try {
    const { error } = await supabase
      .from('company_config')
      .update({
        backup_enabled: backupConfig.enabled,
        backup_schedule: backupConfig.schedule,
        backup_retention_days: backupConfig.retentionDays,
      })
      .eq('id', 'default');

    if (error) console.warn('[Auto Backup] Failed to persist config:', error.message);
  } catch (err) {
    console.warn('[Auto Backup] Failed to persist config:', err.message);
  }

  return { ...backupConfig };
}

export async function loadBackupConfig() {
  try {
    const { data, error } = await supabase
      .from('company_config')
      .select('backup_enabled, backup_schedule, backup_retention_days')
      .eq('id', 'default')
      .single();

    if (!error && data) {
      if (data.backup_enabled !== undefined) backupConfig.enabled = data.backup_enabled;
      if (data.backup_schedule) backupConfig.schedule = data.backup_schedule;
      if (data.backup_retention_days) backupConfig.retentionDays = data.backup_retention_days;
    }
  } catch (err) {
    console.warn('[Auto Backup] Could not load config from DB, using defaults');
  }

  // Start if enabled
  if (backupConfig.enabled) {
    startScheduledBackups(backupConfig);
  }
}

export default {
  startScheduledBackups,
  stopScheduledBackups,
  getBackupConfig,
  updateBackupConfig,
  loadBackupConfig,
  createAutoBackup,
};
