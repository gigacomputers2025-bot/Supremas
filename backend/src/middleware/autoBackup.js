import { getDb } from '../database.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync, statSync } from 'fs';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = join(__dirname, '..', 'backups');
if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

export function createSnapshotBackup(password = 'auto-snapshot') {
  try {
    const db = getDb();
    const tables = ['products', 'price_lists', 'payment_methods', 'sales_channels', 'delivery_zones', 'customers', 'orders', 'settings', 'categories', 'combo_items', 'price_list_labels', 'audit_log'];

    const backup = { _metadata: { exported_at: new Date().toISOString(), version: '2.0', app: 'Supremas', type: 'auto-snapshot' } };
    for (const table of tables) {
      try { backup[table] = db.prepare(`SELECT * FROM ${table}`).all(); } catch (e) { backup[table] = []; }
    }

    const jsonStr = JSON.stringify(backup, null, 2);
    const salt = crypto.randomBytes(16);
    const key = deriveKey(password, salt);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
    const payload = Buffer.concat([salt, iv, encrypted]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot-${timestamp}.enc`;
    writeFileSync(join(BACKUP_DIR, filename), payload);
    return { success: true, filename };
  } catch (err) {
    console.error('Auto-backup error:', err.message);
    return { success: false, error: err.message };
  }
}

// Middleware that creates an auto-backup before destructive operations
export function preMutationBackup(req, res, next) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const backup = createSnapshotBackup();
    if (backup.success) {
      console.log(`[AutoBackup] Pre-mutation snapshot: ${backup.filename}`);
    }
  }
  next();
}

// Retention: keep only last N backups
export function applyRetentionPolicy(maxCount = 20) {
  try {
    if (!existsSync(BACKUP_DIR)) return;
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.enc'))
      .map(f => ({ name: f, time: statSync(join(BACKUP_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > maxCount) {
      const toRemove = files.slice(maxCount);
      for (const f of toRemove) {
        unlinkSync(join(BACKUP_DIR, f.name));
        console.log(`[AutoBackup] Retention: removed ${f.name}`);
      }
    }
  } catch (err) {
    console.error('Retention policy error:', err.message);
  }
}

// Scheduled backup function
export function runScheduledBackup(password = 'auto-snapshot') {
  const result = createSnapshotBackup(password);
  if (result.success) {
    console.log(`[AutoBackup] Scheduled backup: ${result.filename}`);
    applyRetentionPolicy();
  } else {
    console.error(`[AutoBackup] Scheduled backup failed: ${result.error}`);
  }
}
