import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM payment_methods ORDER BY id`).all());
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, commission_rate } = req.body;
  const result = db.prepare(`INSERT INTO payment_methods (name, commission_rate) VALUES (?, ?)`).run(name, commission_rate || 1.0);
  const pm = db.prepare(`SELECT * FROM payment_methods WHERE id = ?`).get(result.lastInsertRowid);
  res.status(201).json(pm);
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, commission_rate } = req.body;
  db.prepare(`UPDATE payment_methods SET name = ?, commission_rate = ? WHERE id = ?`).run(name, commission_rate, req.params.id);
  res.json(db.prepare(`SELECT * FROM payment_methods WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM payment_methods WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

export default router;
