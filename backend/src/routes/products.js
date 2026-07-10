import { Router } from 'express';
import { getDb } from '../database.js';
import { auditLog } from '../middleware/auditLog.js';

const router = Router();

function attachPricesAndCombos(db, products) {
  if (!products || products.length === 0) return products;
  const ids = products.map(p => p.id);

  const priceLists = db.prepare(`SELECT * FROM price_lists WHERE product_id IN (${ids.map(() => '?').join(',') || '0'}) ORDER BY id`).all(ids);
  const priceMap = {};
  for (const pl of priceLists) {
    if (!priceMap[pl.product_id]) priceMap[pl.product_id] = [];
    priceMap[pl.product_id].push(pl);
  }

  const comboItems = db.prepare(`SELECT * FROM combo_items WHERE combo_id IN (${ids.map(() => '?').join(',') || '0'})`).all(ids);
  const comboMap = {};
  for (const ci of comboItems) {
    if (!comboMap[ci.combo_id]) comboMap[ci.combo_id] = [];
    comboMap[ci.combo_id].push(ci);
  }

  return products.map(p => ({
    ...p,
    prices: priceMap[p.id] || [],
    combo_items: comboMap[p.id] || []
  }));
}

router.get('/', (req, res) => {
  const db = getDb();
  const { list_type } = req.query;
  let products;
  if (list_type) {
    products = db.prepare(`SELECT * FROM products WHERE list_type = ? ORDER BY sort_order`).all(list_type);
  } else {
    products = db.prepare(`SELECT * FROM products ORDER BY sort_order`).all();
  }
  res.json(attachPricesAndCombos(db, products));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const enriched = attachPricesAndCombos(db, [product]);
  res.json(enriched[0]);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { list_type, category, name, sigla, is_combo, combo_items, prices } = req.body;
  const maxOrder = db.prepare(`SELECT MAX(sort_order) as m FROM products`).get().m || 0;

  const result = db.prepare(
    `INSERT INTO products (list_type, category, name, sigla, is_combo, sort_order) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(list_type || 'Minorista', category, name, sigla || '', is_combo ? 1 : 0, maxOrder + 1);

  const productId = result.lastInsertRowid;

  if (prices && Array.isArray(prices)) {
    const insert = db.prepare(`INSERT INTO price_lists (product_id, label, price) VALUES (?, ?, ?)`);
    for (const p of prices) {
      insert.run(productId, p.label, p.price || 0);
    }
  }

  if (combo_items && Array.isArray(combo_items)) {
    const insert = db.prepare(`INSERT INTO combo_items (combo_id, product_id, quantity) VALUES (?, ?, ?)`);
    for (const item of combo_items) {
      insert.run(productId, item.product_id, item.quantity || 1);
    }
  }

  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);
  const enriched = attachPricesAndCombos(db, [product]);
  auditLog('CREATE', 'products', productId, null, { name, category, list_type }, req.ip);
  res.status(201).json(enriched[0]);
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const oldProduct = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id);
  const { list_type, category, name, sigla, is_combo, combo_items, prices } = req.body;

  db.prepare(
    `UPDATE products SET list_type = ?, category = ?, name = ?, sigla = ?, is_combo = ? WHERE id = ?`
  ).run(list_type, category, name, sigla || '', is_combo ? 1 : 0, req.params.id);

  if (prices && Array.isArray(prices)) {
    for (const p of prices) {
      if (p.id) {
        db.prepare(`UPDATE price_lists SET price = ? WHERE id = ?`).run(p.price, p.id);
      } else {
        db.prepare(`INSERT INTO price_lists (product_id, label, price) VALUES (?, ?, ?)`).run(req.params.id, p.label, p.price || 0);
      }
    }
  }

  if (combo_items && Array.isArray(combo_items)) {
    db.prepare(`DELETE FROM combo_items WHERE combo_id = ?`).run(req.params.id);
    const insert = db.prepare(`INSERT INTO combo_items (combo_id, product_id, quantity) VALUES (?, ?, ?)`);
    for (const item of combo_items) {
      insert.run(req.params.id, item.product_id, item.quantity || 1);
    }
  }

  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id);
  const enriched = attachPricesAndCombos(db, [product]);
  auditLog('UPDATE', 'products', Number(req.params.id), oldProduct, { list_type, category, name, sigla }, req.ip);
  res.json(enriched[0]);
});

router.patch('/:id/price', (req, res) => {
  const db = getDb();
  const { priceListId, price } = req.body;
  const oldPrice = db.prepare(`SELECT * FROM price_lists WHERE id = ?`).get(priceListId);
  db.prepare(`UPDATE price_lists SET price = ? WHERE id = ? AND product_id = ?`)
    .run(price, priceListId, req.params.id);
  auditLog('UPDATE', 'price_lists', priceListId, { price: oldPrice?.price }, { price }, req.ip);
  res.json({ success: true });
});

router.put('/:id/price-list', (req, res) => {
  const db = getDb();
  const { label, price } = req.body;
  const existing = db.prepare(`SELECT id FROM price_lists WHERE product_id = ? AND label = ?`).get(req.params.id, label);
  if (existing) {
    db.prepare(`UPDATE price_lists SET price = ? WHERE id = ?`).run(price, existing.id);
  } else {
    db.prepare(`INSERT INTO price_lists (product_id, label, price) VALUES (?, ?, ?)`).run(req.params.id, label, price);
  }
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const oldProduct = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id);
  db.prepare(`DELETE FROM products WHERE id = ?`).run(req.params.id);
  auditLog('DELETE', 'products', Number(req.params.id), oldProduct, null, req.ip);
  res.json({ success: true });
});

export default router;
