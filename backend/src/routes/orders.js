import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { search, barrio, canal, limit = 100, offset = 0 } = req.query;

  let sql = `SELECT * FROM orders WHERE 1=1`;
  const params = [];

  if (search) {
    sql += ` AND (cliente LIKE ? OR calle LIKE ? OR barrio LIKE ? OR celular LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (barrio) {
    sql += ` AND barrio = ?`;
    params.push(barrio);
  }
  if (canal) {
    sql += ` AND canal_venta = ?`;
    params.push(canal);
  }

  sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const orders = db.prepare(sql).all(...params);

  const countSql = sql.replace(/SELECT \*.*FROM/, 'SELECT COUNT(*) as total FROM').replace(/LIMIT.*OFFSET.*/, '');
  const countParams = params.slice(0, -2);
  const { total } = db.prepare(countSql).get(...countParams);

  res.json({ orders, total });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.post('/', (req, res) => {
  const db = getDb();
  const {
    conductor, mes, anio, fecha_pedido, fecha_entrega, dia,
    canal_venta, cliente, dni, celular, calle, altura, piso_dto,
    comentario, barrio, lista_precio,
    producto1, producto2, producto3, producto4, producto5, producto6, producto7,
    valor_prod1, valor_prod2, valor_prod3, valor_prod4, valor_prod5, valor_prod6, valor_prod7,
    promo_especial, total_pedido, medio_cobro, cobro_real, orden_numero,
    whatsapp, mensaje_web, mensaje_whatsapp
  } = req.body;

  const result = db.prepare(`
    INSERT INTO orders (
      conductor, mes, anio, fecha_pedido, fecha_entrega, dia,
      canal_venta, cliente, dni, celular, calle, altura, piso_dto,
      comentario, barrio, lista_precio,
      producto1, producto2, producto3, producto4, producto5, producto6, producto7,
      valor_prod1, valor_prod2, valor_prod3, valor_prod4, valor_prod5, valor_prod6, valor_prod7,
      promo_especial, total_pedido, medio_cobro, cobro_real, orden_numero,
      whatsapp, mensaje_web, mensaje_whatsapp
    ) VALUES (?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?)
  `).run(
    conductor||'', mes||'', anio||'', fecha_pedido||'', fecha_entrega||'', dia||'',
    canal_venta||'', cliente, dni||'', celular||'', calle||'', altura||'', piso_dto||'',
    comentario||'', barrio||'', lista_precio||'',
    producto1||'', producto2||'', producto3||'', producto4||'', producto5||'', producto6||'', producto7||'',
    Number(valor_prod1)||0, Number(valor_prod2)||0, Number(valor_prod3)||0, Number(valor_prod4)||0,
    Number(valor_prod5)||0, Number(valor_prod6)||0, Number(valor_prod7)||0,
    promo_especial||'', Number(total_pedido)||0, medio_cobro||'', Number(cobro_real)||0,
    orden_numero||null,
    whatsapp||'', mensaje_web||'', mensaje_whatsapp||''
  );

  res.status(201).json(db.prepare(`SELECT * FROM orders WHERE id = ?`).get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const {
    conductor, mes, anio, fecha_pedido, fecha_entrega, dia,
    canal_venta, cliente, dni, celular, calle, altura, piso_dto,
    comentario, barrio, lista_precio,
    producto1, producto2, producto3, producto4, producto5, producto6, producto7,
    valor_prod1, valor_prod2, valor_prod3, valor_prod4, valor_prod5, valor_prod6, valor_prod7,
    promo_especial, total_pedido, medio_cobro, cobro_real, orden_numero,
    whatsapp, mensaje_web, mensaje_whatsapp
  } = req.body;

  db.prepare(`
    UPDATE orders SET
      conductor=?, mes=?, anio=?, fecha_pedido=?, fecha_entrega=?, dia=?,
      canal_venta=?, cliente=?, dni=?, celular=?, calle=?, altura=?, piso_dto=?,
      comentario=?, barrio=?, lista_precio=?,
      producto1=?, producto2=?, producto3=?, producto4=?, producto5=?, producto6=?, producto7=?,
      valor_prod1=?, valor_prod2=?, valor_prod3=?, valor_prod4=?, valor_prod5=?, valor_prod6=?, valor_prod7=?,
      promo_especial=?, total_pedido=?, medio_cobro=?, cobro_real=?, orden_numero=?,
      whatsapp=?, mensaje_web=?, mensaje_whatsapp=?
    WHERE id=?
  `).run(
    conductor||'', mes||'', anio||'', fecha_pedido||'', fecha_entrega||'', dia||'',
    canal_venta||'', cliente, dni||'', celular||'', calle||'', altura||'', piso_dto||'',
    comentario||'', barrio||'', lista_precio||'',
    producto1||'', producto2||'', producto3||'', producto4||'', producto5||'', producto6||'', producto7||'',
    Number(valor_prod1)||0, Number(valor_prod2)||0, Number(valor_prod3)||0, Number(valor_prod4)||0,
    Number(valor_prod5)||0, Number(valor_prod6)||0, Number(valor_prod7)||0,
    promo_especial||'', Number(total_pedido)||0, medio_cobro||'', Number(cobro_real)||0,
    orden_numero||null,
    whatsapp||'', mensaje_web||'', mensaje_whatsapp||'',
    req.params.id
  );

  res.json(db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare(`DELETE FROM orders WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

export default router;
