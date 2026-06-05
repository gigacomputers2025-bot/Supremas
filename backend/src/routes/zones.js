import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM delivery_zones ORDER BY id`).all());
});

router.post('/', (req, res) => {
  const db = getDb();
  const { neighborhood, deliverer } = req.body;
  const result = db.prepare(`INSERT INTO delivery_zones (neighborhood, deliverer) VALUES (?, ?)`).run(neighborhood, deliverer);
  res.status(201).json(db.prepare(`SELECT * FROM delivery_zones WHERE id = ?`).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { neighborhood, deliverer } = req.body;
  db.prepare(`UPDATE delivery_zones SET neighborhood = ?, deliverer = ? WHERE id = ?`).run(neighborhood, deliverer, req.params.id);
  res.json(db.prepare(`SELECT * FROM delivery_zones WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM delivery_zones WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

export default router;
