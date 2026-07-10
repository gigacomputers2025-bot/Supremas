import { Router } from 'express';
import { getDb } from '../database.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync, statSync } from 'fs';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = join(__dirname, '..', 'backups');

if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

const router = Router();

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

// Create encrypted backup
router.post('/create', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const db = getDb();
    const tables = ['products', 'price_lists', 'payment_methods', 'sales_channels', 'delivery_zones', 'customers', 'orders', 'settings', 'categories', 'combo_items', 'price_list_labels'];

    const backup = {
      _metadata: {
        exported_at: new Date().toISOString(),
        version: '2.0',
        app: 'Supremas',
        type: 'manual',
      }
    };
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
    const filename = `backup-${timestamp}.enc`;
    writeFileSync(join(BACKUP_DIR, filename), payload);

    const stats = statSync(join(BACKUP_DIR, filename));

    // Record in audit log
    try {
      db.prepare(`INSERT INTO audit_log (action, table_name, record_id, new_values, ip) VALUES (?, ?, ?, ?, ?)`)
        .run('BACKUP_CREATE', 'backups', null, JSON.stringify({ filename, size: stats.size }), req.ip);
    } catch (e) {}

    res.json({ success: true, filename, size: stats.size, date: timestamp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore from encrypted backup
router.post('/restore', (req, res) => {
  try {
    const { filename, password } = req.body;
    if (!filename || !password) return res.status(400).json({ error: 'Filename and password required' });

    const filepath = join(BACKUP_DIR, filename);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Backup file not found' });

    const payload = readFileSync(filepath);
    if (payload.length < 32) return res.status(400).json({ error: 'Invalid backup file' });

    const salt = payload.subarray(0, 16);
    const iv = payload.subarray(16, 32);
    const encrypted = payload.subarray(32);
    const key = deriveKey(password, salt);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const backup = JSON.parse(decrypted.toString('utf8'));

    const db = getDb();
    const order = ['settings', 'categories', 'price_list_labels', 'products', 'combo_items', 'price_lists', 'payment_methods', 'sales_channels', 'delivery_zones', 'customers', 'orders'];

    const restoreTransaction = db.transaction(() => {
      for (const table of order) {
        if (!backup[table] || backup[table].length === 0) continue;
        db.exec(`DELETE FROM ${table}`);
        const columns = Object.keys(backup[table][0]);
        const placeholders = columns.map(() => '?').join(',');
        const colNames = columns.map(c => `"${c}"`).join(',');
        const insert = db.prepare(`INSERT INTO ${table} (${colNames}) VALUES (${placeholders})`);
        for (const row of backup[table]) {
          insert.run(...columns.map(c => row[c]));
        }
      }
    });

    restoreTransaction();

    // Record in audit log
    try {
      db.prepare(`INSERT INTO audit_log (action, table_name, record_id, new_values, ip) VALUES (?, ?, ?, ?, ?)`)
        .run('BACKUP_RESTORE', 'backups', null, JSON.stringify({ filename }), req.ip);
    } catch (e) {}

    res.json({ success: true, message: `Restaurado desde ${filename}`, tables: Object.keys(backup).length });
  } catch (err) {
    if (err.message.includes('bad decrypt')) {
      return res.status(400).json({ error: 'Contraseña incorrecta o backup corrupto' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Verify backup integrity
router.post('/verify', (req, res) => {
  try {
    const { filename, password } = req.body;
    if (!filename || !password) return res.status(400).json({ error: 'Filename and password required' });

    const filepath = join(BACKUP_DIR, filename);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Backup file not found' });

    const payload = readFileSync(filepath);
    if (payload.length < 32) return res.json({ valid: false, error: 'Invalid file format' });

    const salt = payload.subarray(0, 16);
    const iv = payload.subarray(16, 32);
    const encrypted = payload.subarray(32);
    const key = deriveKey(password, salt);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    const backup = JSON.parse(decrypted.toString('utf8'));
    const requiredTables = ['products', 'payment_methods', 'sales_channels', 'customers'];
    const missingTables = requiredTables.filter(t => !backup[t]);
    const valid = missingTables.length === 0 && backup._metadata && backup._metadata.version;

    res.json({
      valid,
      metadata: backup._metadata || null,
      tables: Object.keys(backup).filter(k => k !== '_metadata'),
      tableCounts: Object.fromEntries(
        Object.entries(backup)
          .filter(([k]) => k !== '_metadata')
          .map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      ),
      missingTables: missingTables.length > 0 ? missingTables : undefined,
      error: valid ? null : 'Backup corrupto o incompleto',
    });
  } catch (err) {
    if (err.message.includes('bad decrypt')) {
      return res.json({ valid: false, error: 'Contraseña incorrecta' });
    }
    if (err.message.includes('Unexpected token')) {
      return res.json({ valid: false, error: 'Formato JSON inválido' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Health check
router.get('/health', (req, res) => {
  try {
    const db = getDb();
    const backupFiles = existsSync(BACKUP_DIR)
      ? readdirSync(BACKUP_DIR).filter(f => f.endsWith('.enc'))
      : [];

    const fileStats = backupFiles.map(f => {
      try {
        const s = statSync(join(BACKUP_DIR, f));
        return { filename: f, size: s.size, date: s.mtime.toISOString() };
      } catch { return { filename: f, size: 0, date: null }; }
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const latestBackup = fileStats.length > 0 ? fileStats[0] : null;
    const lastAudit = db.prepare(`SELECT * FROM audit_log ORDER BY id DESC LIMIT 1`).get();

    const autoBackupInterval = db.prepare(`SELECT value FROM settings WHERE key = 'auto_backup_interval'`).get();
    const autoBackupRetention = db.prepare(`SELECT value FROM settings WHERE key = 'auto_backup_retention'`).get();

    res.json({
      status: 'healthy',
      dbPath: join(__dirname, '..', 'supremas.db'),
      totalBackups: backupFiles.length,
      latestBackup,
      lastAuditEvent: lastAudit || null,
      config: {
        autoBackupInterval: autoBackupInterval ? autoBackupInterval.value : '30',
        autoBackupRetention: autoBackupRetention ? autoBackupRetention.value : '20',
      },
      backupDir: BACKUP_DIR,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List backups
router.get('/list', (req, res) => {
  try {
    if (!existsSync(BACKUP_DIR)) return res.json([]);
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.enc'))
      .map(f => {
        const fp = join(BACKUP_DIR, f);
        try {
          const s = statSync(fp);
          return { filename: f, size: s.size, date: s.mtime.toISOString() };
        } catch {
          return { filename: f, size: 0, date: null };
        }
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete backup
router.delete('/:filename', (req, res) => {
  try {
    const filepath = join(BACKUP_DIR, req.params.filename);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
    unlinkSync(filepath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download backup
router.get('/download/:filename', (req, res) => {
  try {
    const filepath = join(BACKUP_DIR, req.params.filename);
    if (!existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
    res.download(filepath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
