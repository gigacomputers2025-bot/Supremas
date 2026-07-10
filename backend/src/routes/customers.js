import { Router } from 'express';
import { getDb } from '../database.js';
import { auditLog } from '../middleware/auditLog.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { search } = req.query;
  let sql = `SELECT * FROM customers WHERE 1=1`;
  const params = [];
  if (search) {
    sql += ` AND (name LIKE ? OR dni LIKE ? OR celular LIKE ? OR barrio LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  sql += ` ORDER BY name ASC`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const customer = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { name, dni, celular, calle, altura, piso_dto, barrio } = req.body;
  const result = db.prepare(
    `INSERT INTO customers (name, dni, celular, calle, altura, piso_dto, barrio) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(name, dni||'', celular||'', calle||'', altura||'', piso_dto||'', barrio||'');
  auditLog('CREATE', 'customers', result.lastInsertRowid, null, { name, dni, barrio }, req.ip);
  res.status(201).json(db.prepare(`SELECT * FROM customers WHERE id = ?`).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id);
  const { name, dni, celular, calle, altura, piso_dto, barrio } = req.body;
  db.prepare(
    `UPDATE customers SET name=?, dni=?, celular=?, calle=?, altura=?, piso_dto=?, barrio=? WHERE id=?`
  ).run(name, dni||'', celular||'', calle||'', altura||'', piso_dto||'', barrio||'', req.params.id);
  auditLog('UPDATE', 'customers', Number(req.params.id), oldData, { name, dni, barrio }, req.ip);
  res.json(db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const oldData = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(req.params.id);
  db.prepare(`DELETE FROM customers WHERE id = ?`).run(req.params.id);
  auditLog('DELETE', 'customers', Number(req.params.id), oldData, null, req.ip);
  res.json({ success: true });
});

export default router;
