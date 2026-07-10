import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();

    // Build a map of neighborhood -> deliverer from zones
    const zones = db.prepare(`SELECT neighborhood, deliverer FROM delivery_zones`).all();
    const barrioMap = {};
    for (const z of zones) {
      const key = z.neighborhood.trim().toLowerCase();
      if (!barrioMap[key]) barrioMap[key] = z.deliverer;
    }

    const resolveDeliverer = (barrio) => {
      if (!barrio) return 'SIN ASIGNAR';
      return barrioMap[barrio.trim().toLowerCase()] || 'SIN ASIGNAR';
    };

    // Get the last distinct delivery dates with orders
    const dates = db.prepare(`
      SELECT DISTINCT fecha_entrega FROM orders
      WHERE fecha_entrega != '' AND fecha_entrega IS NOT NULL
      ORDER BY fecha_entrega DESC LIMIT 5
    `).all().map(r => r.fecha_entrega).reverse();

    if (dates.length === 0) {
      return res.json({ dates: [], deliverers: [], data: {} });
    }

    // Get orders for those dates
    const placeholders = dates.map(() => '?').join(',');
    const orders = db.prepare(`
      SELECT fecha_entrega, barrio, cliente,
        producto1, producto2, producto3, producto4, producto5, producto6, producto7
      FROM orders WHERE fecha_entrega IN (${placeholders})
    `).all(...dates);

    // For each date + deliverer, aggregate products
    const data = {}; // { date: { deliverer: { product: count } } }
    const allDeliverers = new Set();
    const allProducts = new Set();

    for (const order of orders) {
      const date = order.fecha_entrega;
      const deliverer = resolveDeliverer(order.barrio);
      allDeliverers.add(deliverer);

      if (!data[date]) data[date] = {};
      if (!data[date][deliverer]) data[date][deliverer] = {};

      for (let i = 1; i <= 7; i++) {
        const name = order[`producto${i}`];
        if (name && name.trim()) {
          const key = name.trim();
          if (!data[date][deliverer][key]) data[date][deliverer][key] = 0;
          data[date][deliverer][key]++;
          allProducts.add(key);
        }
      }
    }

    const deliverers = [...allDeliverers].sort();
    const products = [...allProducts].sort();

    // Build result: { date: { deliverer: [ { product, count } ] } }
    const result = {};
    for (const date of dates) {
      result[date] = {};
      for (const del of deliverers) {
        const map = data[date]?.[del] || {};
        result[date][del] = products
          .filter(p => map[p])
          .map(p => ({ product: p, count: map[p] }));
      }
    }

    // Total por deliverer (across all dates)
    const totals = {};
    for (const del of deliverers) {
      totals[del] = {};
      for (const date of dates) {
        for (const item of result[date]?.[del] || []) {
          if (!totals[del][item.product]) totals[del][item.product] = 0;
          totals[del][item.product] += item.count;
        }
      }
    }

    res.json({ dates, deliverers, products, data: result, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
