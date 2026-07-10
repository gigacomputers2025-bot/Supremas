import { Router } from 'express';
import { getDb } from '../database.js';
import { auditLog } from '../middleware/auditLog.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { active } = req.query;
  let sql = `SELECT * FROM repartidores`;
  const params = [];
  if (active === 'true') {
    sql += ` WHERE active = 1`;
  }
  sql += ` ORDER BY name`;
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, phone, vehicle } = req.body;
  const result = db.prepare(`INSERT INTO repartidores (name, phone, vehicle) VALUES (?, ?, ?)`).run(name, phone || '', vehicle || '');
  auditLog('CREATE', 'repartidores', result.lastInsertRowid, null, { name, phone, vehicle }, req.ip);
  res.status(201).json(db.prepare(`SELECT * FROM repartidores WHERE id = ?`).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM repartidores WHERE id = ?`).get(req.params.id);
  const { name, phone, vehicle, active } = req.body;
  db.prepare(`UPDATE repartidores SET name = ?, phone = ?, vehicle = ?, active = ? WHERE id = ?`).run(name, phone || '', vehicle || '', active ?? 1, req.params.id);
  auditLog('UPDATE', 'repartidores', Number(req.params.id), oldData, { name, phone, vehicle, active }, req.ip);
  res.json(db.prepare(`SELECT * FROM repartidores WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM repartidores WHERE id = ?`).get(req.params.id);
  db.prepare(`DELETE FROM repartidores WHERE id = ?`).run(req.params.id);
  auditLog('DELETE', 'repartidores', Number(req.params.id), oldData, null, req.ip);
  res.json({ success: true });
});

export default router;
