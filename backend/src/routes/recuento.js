import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();

    // Get the most recent delivery dates
    const dates = db.prepare(`
      SELECT DISTINCT fecha_entrega FROM orders
      WHERE fecha_entrega != '' AND fecha_entrega IS NOT NULL
      ORDER BY fecha_entrega DESC LIMIT 7
    `).all().map(r => r.fecha_entrega).reverse();

    if (dates.length === 0) {
      return res.json({ dates: [], products: [] });
    }

    // For each date, aggregate products ordered
    const datePlaceholders = dates.map(() => '?').join(',');
    const allOrders = db.prepare(`
      SELECT fecha_entrega, producto1, producto2, producto3, producto4, producto5, producto6, producto7
      FROM orders
      WHERE fecha_entrega IN (${datePlaceholders})
    `).all(...dates);

    // Build a map: { date: { productName: count } }
    const dateProductMap = {};
    const allProductNames = new Set();

    for (const order of allOrders) {
      const date = order.fecha_entrega;
      if (!dateProductMap[date]) dateProductMap[date] = {};

      for (let i = 1; i <= 7; i++) {
        const name = order[`producto${i}`];
        if (name && name.trim()) {
          const key = name.trim();
          if (!dateProductMap[date][key]) dateProductMap[date][key] = 0;
          dateProductMap[date][key]++;
          allProductNames.add(key);
        }
      }
    }

    const productNames = [...allProductNames].sort();

    // Build result: for each date, an array of { product, count }
    const result = dates.map(date => {
      const map = dateProductMap[date] || {};
      const items = productNames
        .filter(p => map[p])
        .map(p => ({ product: p, count: map[p] }));
      return { date, items };
    });

    res.json({ dates, products: productNames, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
