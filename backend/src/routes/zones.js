import { Router } from 'express';
import { getDb } from '../database.js';
import { auditLog } from '../middleware/auditLog.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM delivery_zones ORDER BY id`).all());
});

router.post('/', (req, res) => {
  const db = getDb();
  const { neighborhood, deliverer } = req.body;
  const result = db.prepare(`INSERT INTO delivery_zones (neighborhood, deliverer) VALUES (?, ?)`).run(neighborhood, deliverer);
  auditLog('CREATE', 'delivery_zones', result.lastInsertRowid, null, { neighborhood, deliverer }, req.ip);
  res.status(201).json(db.prepare(`SELECT * FROM delivery_zones WHERE id = ?`).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM delivery_zones WHERE id = ?`).get(req.params.id);
  const { neighborhood, deliverer } = req.body;
  db.prepare(`UPDATE delivery_zones SET neighborhood = ?, deliverer = ? WHERE id = ?`).run(neighborhood, deliverer, req.params.id);
  auditLog('UPDATE', 'delivery_zones', Number(req.params.id), oldData, { neighborhood, deliverer }, req.ip);
  res.json(db.prepare(`SELECT * FROM delivery_zones WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM delivery_zones WHERE id = ?`).get(req.params.id);
  db.prepare(`DELETE FROM delivery_zones WHERE id = ?`).run(req.params.id);
  auditLog('DELETE', 'delivery_zones', Number(req.params.id), oldData, null, req.ip);
  res.json({ success: true });
});

export default router;
