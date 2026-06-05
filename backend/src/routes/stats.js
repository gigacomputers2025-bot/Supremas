import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDb();

    // Counts
    const prodCount = db.prepare(`SELECT COUNT(*) as c FROM products`).get().c;
    const prodMinorista = db.prepare(`SELECT COUNT(*) as c FROM products WHERE list_type = 'Minorista'`).get().c;
    const prodMayorista = db.prepare(`SELECT COUNT(*) as c FROM products WHERE list_type = 'Mayorista'`).get().c;
    const catCount = db.prepare(`SELECT COUNT(DISTINCT category) as c FROM products`).get().c;
    const customerCount = db.prepare(`SELECT COUNT(*) as c FROM customers`).get().c;
    const orderCount = db.prepare(`SELECT COUNT(*) as c FROM orders`).get().c;
    const paymentCount = db.prepare(`SELECT COUNT(*) as c FROM payment_methods`).get().c;
    const channelCount = db.prepare(`SELECT COUNT(*) as c FROM sales_channels`).get().c;
    const zoneCount = db.prepare(`SELECT COUNT(*) as c FROM delivery_zones`).get().c;

    // Products by category
    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count, list_type
      FROM products GROUP BY category, list_type ORDER BY count DESC
    `).all();

    // Orders by day (last 30)
    const ordersByDay = db.prepare(`
      SELECT fecha_pedido as day, COUNT(*) as count, SUM(COALESCE(total_pedido,0)) as revenue
      FROM orders WHERE fecha_pedido != '' AND fecha_pedido IS NOT NULL
      GROUP BY day ORDER BY day DESC LIMIT 30
    `).all();

    // Revenue stats
    const revenueStats = db.prepare(`
      SELECT
        SUM(COALESCE(total_pedido,0)) as total_revenue,
        SUM(COALESCE(cobro_real,0)) as total_collected,
        AVG(COALESCE(total_pedido,0)) as avg_order,
        COUNT(*) as total_orders
      FROM orders
    `).get();

    // Top products sold
    const topProducts = [];
    for (let i = 1; i <= 7; i++) {
      const rows = db.prepare(`
        SELECT producto${i} as name, COUNT(*) as count, SUM(COALESCE(valor_prod${i},0)) as revenue
        FROM orders WHERE producto${i} != '' AND producto${i} IS NOT NULL
        GROUP BY name ORDER BY count DESC LIMIT 10
      `).all();
      for (const r of rows) {
        const existing = topProducts.find(t => t.name === r.name);
        if (existing) {
          existing.count += r.count;
          existing.revenue += r.revenue;
        } else {
          topProducts.push(r);
        }
      }
    }
    topProducts.sort((a, b) => b.count - a.count);
    const top10 = topProducts.slice(0, 10);

    // Revenue by payment method
    const byPayment = db.prepare(`
      SELECT medio_cobro as name, COUNT(*) as count, SUM(COALESCE(total_pedido,0)) as revenue
      FROM orders WHERE medio_cobro != '' AND medio_cobro IS NOT NULL
      GROUP BY name ORDER BY revenue DESC
    `).all();

    // Orders by channel
    const byChannel = db.prepare(`
      SELECT canal_venta as name, COUNT(*) as count, SUM(COALESCE(total_pedido,0)) as revenue
      FROM orders WHERE canal_venta != '' AND canal_venta IS NOT NULL
      GROUP BY name ORDER BY count DESC
    `).all();

    // Orders by neighborhood
    const byNeighborhood = db.prepare(`
      SELECT barrio as name, COUNT(*) as count, SUM(COALESCE(total_pedido,0)) as revenue
      FROM orders WHERE barrio != '' AND barrio IS NOT NULL
      GROUP BY name ORDER BY count DESC LIMIT 15
    `).all();

    // Monthly revenue
    const byMonth = db.prepare(`
      SELECT COALESCE(mes,'') as name, SUM(COALESCE(total_pedido,0)) as revenue, COUNT(*) as count
      FROM orders GROUP BY name ORDER BY name
    `).all();

    res.json({
      counts: {
        products: prodCount,
        minorista: prodMinorista,
        mayorista: prodMayorista,
        categories: catCount,
        customers: customerCount,
        orders: orderCount,
        payments: paymentCount,
        channels: channelCount,
        zones: zoneCount,
        revenue: revenueStats.total_revenue || 0,
        collected: revenueStats.total_collected || 0,
        avgOrder: revenueStats.avg_order || 0,
      },
      byCategory,
      ordersByDay,
      topProducts: top10,
      byPayment,
      byChannel,
      byNeighborhood,
      byMonth,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
