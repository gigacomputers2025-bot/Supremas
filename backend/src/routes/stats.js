import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', 'data');

const router = Router();

function load(name) {
  try { return JSON.parse(readFileSync(join(DATA_DIR, `${name}.json`), 'utf8')); }
  catch { return []; }
}

router.get('/', (req, res) => {
  try {
    const products = load('products');
    const customers = load('customers');
    const orders = load('orders');
    const payments = load('payment_methods');
    const channels = load('sales_channels');
    const zones = load('delivery_zones');

    const prodCount = products.length;
    const prodMinorista = products.filter(p => p.list_type === 'Minorista').length;
    const prodMayorista = products.filter(p => p.list_type === 'Mayorista').length;
    const catCount = [...new Set(products.map(p => p.category))].length;
    const customerCount = customers.length;
    const orderCount = orders.length;
    const paymentCount = payments.length;
    const channelCount = channels.length;
    const zoneCount = zones.length;

    // Products by category
    const byCategory = {};
    for (const p of products) {
      const key = `${p.category}::${p.list_type}`;
      if (!byCategory[key]) byCategory[key] = { category: p.category, list_type: p.list_type, count: 0 };
      byCategory[key].count++;
    }

    // Orders by day (last 30)
    const ordersByDay = {};
    const today = new Date();
    const validOrders = orders.filter(o => o.fecha_pedido && o.fecha_pedido.trim());
    for (const o of validOrders) {
      if (!ordersByDay[o.fecha_pedido]) ordersByDay[o.fecha_pedido] = { day: o.fecha_pedido, count: 0, revenue: 0 };
      ordersByDay[o.fecha_pedido].count++;
      ordersByDay[o.fecha_pedido].revenue += Number(o.total_pedido) || 0;
    }
    const ordersByDayArr = Object.values(ordersByDay)
      .sort((a, b) => b.day.localeCompare(a.day))
      .slice(0, 30);

    // Revenue stats
    let totalRevenue = 0, totalCollected = 0;
    for (const o of orders) {
      totalRevenue += Number(o.total_pedido) || 0;
      totalCollected += Number(o.cobro_real) || 0;
    }
    const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Top products
    const prodCounts = {};
    const prodRevenues = {};
    for (let i = 1; i <= 7; i++) {
      for (const o of orders) {
        const name = o[`producto${i}`];
        if (name && String(name).trim()) {
          if (!prodCounts[name]) { prodCounts[name] = 0; prodRevenues[name] = 0; }
          prodCounts[name]++;
          prodRevenues[name] += Number(o[`valor_prod${i}`]) || 0;
        }
      }
    }
    const topProducts = Object.entries(prodCounts)
      .map(([name, count]) => ({ name, count, revenue: prodRevenues[name] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By payment method
    const byPayment = {};
    for (const o of orders) {
      const name = o.medio_cobro;
      if (name && String(name).trim()) {
        if (!byPayment[name]) byPayment[name] = { name, count: 0, revenue: 0 };
        byPayment[name].count++;
        byPayment[name].revenue += Number(o.total_pedido) || 0;
      }
    }

    // By channel
    const byChannel = {};
    for (const o of orders) {
      const name = o.canal_venta;
      if (name && String(name).trim()) {
        if (!byChannel[name]) byChannel[name] = { name, count: 0, revenue: 0 };
        byChannel[name].count++;
        byChannel[name].revenue += Number(o.total_pedido) || 0;
      }
    }

    // By neighborhood
    const byNeighborhood = {};
    for (const o of orders) {
      const name = o.barrio;
      if (name && String(name).trim()) {
        if (!byNeighborhood[name]) byNeighborhood[name] = { name, count: 0, revenue: 0 };
        byNeighborhood[name].count++;
        byNeighborhood[name].revenue += Number(o.total_pedido) || 0;
      }
    }

    // By month
    const byMonth = {};
    for (const o of orders) {
      const name = o.mes ? String(o.mes).trim() : '';
      if (name) {
        if (!byMonth[name]) byMonth[name] = { name, count: 0, revenue: 0 };
        byMonth[name].count++;
        byMonth[name].revenue += Number(o.total_pedido) || 0;
      }
    }

    res.json({
      counts: {
        products: prodCount, minorista: prodMinorista, mayorista: prodMayorista,
        categories: catCount, customers: customerCount, orders: orderCount,
        payments: paymentCount, channels: channelCount, zones: zoneCount,
        revenue: totalRevenue, collected: totalCollected, avgOrder: Math.round(avgOrder * 100) / 100,
      },
      byCategory: Object.values(byCategory).sort((a, b) => b.count - a.count),
      ordersByDay: ordersByDayArr,
      topProducts,
      byPayment: Object.values(byPayment).sort((a, b) => b.revenue - a.revenue),
      byChannel: Object.values(byChannel).sort((a, b) => b.count - a.count),
      byNeighborhood: Object.values(byNeighborhood).sort((a, b) => b.count - a.count).slice(0, 15),
      byMonth: Object.values(byMonth).sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
