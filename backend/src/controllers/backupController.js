import fs from 'fs';
import path from 'path';
import backupService from '../services/backupService.js';
import scheduledBackupService from '../services/scheduledBackupService.js';
import { logEvent } from '../middleware/auditLogger.js';

export default {
  async create(req, res) {
    try {
      const actor = req.user;
      const result = await backupService.createFullBackup({ createdBy: actor?.login || 'unknown' });
      await logEvent({ actor, action: 'backup.create', targetType: 'backup', targetId: result.id, details: { size: result.size } });
      res.status(201).json(result);
    } catch (err) {
      console.error('Backup create error', err);
      res.status(500).json({ error: err.message || err });
    }
  },

  list(req, res) {
    try {
      const items = backupService.listBackups();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  download(req, res) {
    try {
      const { id } = req.params;
      const p = backupService.getBackupPath(id);
      if (!p) return res.status(404).json({ error: 'Not found' });
      res.download(p);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  delete(req, res) {
    try {
      const { id } = req.params;
      backupService.deleteBackup(id);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async preview(req, res) {
    try {
      const { id } = req.params;
      const p = backupService.getBackupPath(id);
      if (!p) return res.status(404).json({ error: 'Not found' });
      const preview = await backupService.previewBackupFile(p);
      res.json(preview);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async restore(req, res) {
    try {
      const { id } = req.params;
      const { tables } = req.body || {};
      const p = backupService.getBackupPath(id);
      if (!p) return res.status(404).json({ error: 'Not found' });
      // NOTE: This operation is destructive; caller must have proper permissions (middleware)
      const result = await backupService.restoreFromFile(p, { tables });
      await logEvent({ actor: req.user, action: 'backup.restore', targetType: 'backup', targetId: id, details: { tables: result.restored } });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  getConfig(req, res) {
    try {
      const config = scheduledBackupService.getBackupConfig();
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async updateConfig(req, res) {
    try {
      const { enabled, schedule, retentionDays } = req.body || {};
      const config = await scheduledBackupService.updateBackupConfig({
        ...(enabled !== undefined && { enabled }),
        ...(schedule && { schedule }),
        ...(retentionDays !== undefined && { retentionDays }),
      });
      await logEvent({ actor: req.user, action: 'backup.config.update', targetType: 'config', details: config });
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  },

  async triggerAutoBackup(req, res) {
    try {
      const result = await scheduledBackupService.createAutoBackup();
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }
};
