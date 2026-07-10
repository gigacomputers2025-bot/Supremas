import { Router } from 'express';
import { getDb } from '../database.js';
import { auditLog } from '../middleware/auditLog.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM categories ORDER BY name`).all());
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name } = req.body;
  const result = db.prepare(`INSERT INTO categories (name) VALUES (?)`).run(name);
  auditLog('CREATE', 'categories', result.lastInsertRowid, null, { name }, req.ip);
  res.status(201).json(db.prepare(`SELECT * FROM categories WHERE id = ?`).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(req.params.id);
  const { name } = req.body;
  db.prepare(`UPDATE categories SET name = ? WHERE id = ?`).run(name, req.params.id);
  auditLog('UPDATE', 'categories', Number(req.params.id), oldData, { name }, req.ip);
  res.json(db.prepare(`SELECT * FROM categories WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(req.params.id);
  db.prepare(`DELETE FROM categories WHERE id = ?`).run(req.params.id);
  auditLog('DELETE', 'categories', Number(req.params.id), oldData, null, req.ip);
  res.json({ success: true });
});

export default router;
