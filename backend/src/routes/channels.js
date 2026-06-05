import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM sales_channels ORDER BY id`).all());
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name } = req.body;
  const result = db.prepare(`INSERT INTO sales_channels (name) VALUES (?)`).run(name);
  res.status(201).json(db.prepare(`SELECT * FROM sales_channels WHERE id = ?`).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { name } = req.body;
  db.prepare(`UPDATE sales_channels SET name = ? WHERE id = ?`).run(name, req.params.id);
  res.json(db.prepare(`SELECT * FROM sales_channels WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM sales_channels WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

export default router;
