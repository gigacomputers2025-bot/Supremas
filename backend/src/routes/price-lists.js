import { Router } from 'express';
import { getDb } from '../database.js';
import { auditLog } from '../middleware/auditLog.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const labels = db.prepare(`SELECT * FROM price_list_labels ORDER BY sort_order`).all();
  res.json(labels);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const maxOrder = db.prepare(`SELECT MAX(sort_order) as m FROM price_list_labels`).get().m || 0;
  const result = db.prepare(`INSERT INTO price_list_labels (name, sort_order) VALUES (?, ?)`).run(name, maxOrder + 1);

  const productIds = db.prepare(`SELECT id FROM products`).all();
  const insert = db.prepare(`INSERT INTO price_lists (product_id, label, price) VALUES (?, ?, 0)`);
  for (const p of productIds) {
    insert.run(p.id, name);
  }

  auditLog('CREATE', 'price_list_labels', result.lastInsertRowid, null, { name }, req.ip);
  res.status(201).json(db.prepare(`SELECT * FROM price_list_labels WHERE id = ?`).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const old = db.prepare(`SELECT * FROM price_list_labels WHERE id = ?`).get(req.params.id);
  if (!old) return res.status(404).json({ error: 'Not found' });
  const { name } = req.body;

  db.prepare(`UPDATE price_list_labels SET name = ? WHERE id = ?`).run(name, req.params.id);
  db.prepare(`UPDATE price_lists SET label = ? WHERE label = ?`).run(name, old.name);

  auditLog('UPDATE', 'price_list_labels', Number(req.params.id), old, { name }, req.ip);
  res.json(db.prepare(`SELECT * FROM price_list_labels WHERE id = ?`).get(req.params.id));
});

router.put('/:id/order', (req, res) => {
  const db = getDb();
  const { sort_order } = req.body;
  db.prepare(`UPDATE price_list_labels SET sort_order = ? WHERE id = ?`).run(sort_order, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const label = db.prepare(`SELECT * FROM price_list_labels WHERE id = ?`).get(req.params.id);
  if (!label) return res.status(404).json({ error: 'Not found' });

  db.prepare(`DELETE FROM price_lists WHERE label = ?`).run(label.name);
  db.prepare(`DELETE FROM price_list_labels WHERE id = ?`).run(req.params.id);

  auditLog('DELETE', 'price_list_labels', Number(req.params.id), label, null, req.ip);
  res.json({ success: true });
});

export default router;
