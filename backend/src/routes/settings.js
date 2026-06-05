import { Router } from 'express';
import { getDb } from '../database.js';

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
  const { value } = req.body;
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(req.params.key, value);
  res.json({ key: req.params.key, value });
});

router.delete('/:key', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM settings WHERE key = ?`).run(req.params.key);
  res.json({ success: true });
});

export default router;
