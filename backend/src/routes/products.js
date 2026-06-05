import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { list_type } = req.query;
  let products;
  if (list_type) {
    products = db.prepare(`SELECT * FROM products WHERE list_type = ? ORDER BY sort_order`).all(list_type);
  } else {
    products = db.prepare(`SELECT * FROM products ORDER BY sort_order`).all();
  }

  const priceLists = db.prepare(`SELECT * FROM price_lists WHERE product_id IN (${products.map(() => '?').join(',') || '0'}) ORDER BY id`).all(products.map(p => p.id));

  const priceMap = {};
  for (const pl of priceLists) {
    if (!priceMap[pl.product_id]) priceMap[pl.product_id] = [];
    priceMap[pl.product_id].push(pl);
  }

  const result = products.map(p => ({
    ...p,
    prices: priceMap[p.id] || []
  }));

  res.json(result);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  product.prices = db.prepare(`SELECT * FROM price_lists WHERE product_id = ?`).all(product.id);
  res.json(product);
});

router.post('/', (req, res) => {
  const db = getDb();
  const { list_type, category, name, sigla, prices } = req.body;
  const maxOrder = db.prepare(`SELECT MAX(sort_order) as m FROM products`).get().m || 0;

  const result = db.prepare(
    `INSERT INTO products (list_type, category, name, sigla, sort_order) VALUES (?, ?, ?, ?, ?)`
  ).run(list_type || 'Minorista', category, name, sigla || '', maxOrder + 1);

  const productId = result.lastInsertRowid;

  if (prices && Array.isArray(prices)) {
    const insert = db.prepare(`INSERT INTO price_lists (product_id, label, price) VALUES (?, ?, ?)`);
    for (const p of prices) {
      insert.run(productId, p.label, p.price || 0);
    }
  }

  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(productId);
  product.prices = db.prepare(`SELECT * FROM price_lists WHERE product_id = ?`).all(productId);
  res.status(201).json(product);
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const { list_type, category, name, sigla, prices } = req.body;

  db.prepare(
    `UPDATE products SET list_type = ?, category = ?, name = ?, sigla = ? WHERE id = ?`
  ).run(list_type, category, name, sigla || '', req.params.id);

  if (prices && Array.isArray(prices)) {
    const upsert = db.prepare(`
      INSERT INTO price_lists (product_id, label, price) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET price = excluded.price
    `);
    for (const p of prices) {
      if (p.id) {
        db.prepare(`UPDATE price_lists SET price = ? WHERE id = ?`).run(p.price, p.id);
      } else {
        upsert.run(req.params.id, p.label, p.price || 0);
      }
    }
  }

  const product = db.prepare(`SELECT * FROM products WHERE id = ?`).get(req.params.id);
  product.prices = db.prepare(`SELECT * FROM price_lists WHERE product_id = ?`).all(product.id);
  res.json(product);
});

router.patch('/:id/price', (req, res) => {
  const db = getDb();
  const { priceListId, price } = req.body;
  db.prepare(`UPDATE price_lists SET price = ? WHERE id = ? AND product_id = ?`)
    .run(price, priceListId, req.params.id);
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
  db.prepare(`DELETE FROM products WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

export default router;
