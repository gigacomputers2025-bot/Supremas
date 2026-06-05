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
    const tables = ['products', 'price_lists', 'payment_methods', 'sales_channels', 'delivery_zones', 'customers', 'orders', 'settings'];

    const backup = { _metadata: { exported_at: new Date().toISOString(), version: '1.0', app: 'Supremas' } };
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
    const order = ['settings', 'products', 'price_lists', 'payment_methods', 'sales_channels', 'delivery_zones', 'customers', 'orders'];

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
    res.json({ success: true, message: `Restored ${Object.keys(backup).length} tables` });
  } catch (err) {
    if (err.message.includes('bad decrypt')) {
      return res.status(400).json({ error: 'Incorrect password or corrupted backup' });
    }
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
