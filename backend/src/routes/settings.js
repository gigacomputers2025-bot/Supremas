import { Router } from 'express';
import { getDb } from '../database.js';
import { auditLog } from '../middleware/auditLog.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM settings`).all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

router.put('/:key', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM settings WHERE key = ?`).get(req.params.key);
  const { value } = req.body;
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(req.params.key, value);
  auditLog('UPDATE', 'settings', null, oldData ? { [req.params.key]: oldData.value } : null, { [req.params.key]: value }, req.ip);
  res.json({ key: req.params.key, value });
});

router.delete('/:key', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM settings WHERE key = ?`).get(req.params.key);
  db.prepare(`DELETE FROM settings WHERE key = ?`).run(req.params.key);
  auditLog('DELETE', 'settings', null, oldData ? { [req.params.key]: oldData.value } : null, null, req.ip);
  res.json({ success: true });
});

export default router;
