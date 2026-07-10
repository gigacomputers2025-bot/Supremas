import { getAll, getById, insert, update, remove } from './github-api';

const TABLE_MAP = {
  products: 'products', payments: 'payment_methods', channels: 'sales_channels',
  zones: 'delivery_zones', orders: 'orders', customers: 'customers',
  categories: 'categories', 'price-lists': 'price_lists', settings: 'settings',
  repartidores: 'repartidores', backups: null, github: null, excel: null, seed: null, stats: null, recuento: null, envios: null
};

const OWNER = 'gigacomputers2025-bot';
const REPO = 'Supremas';
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

export async function githubApiFetch(url, options) {
  const path = url.replace(/^\/api\//, '');
  const pathNoQuery = path.split('?')[0];
  const parts = pathNoQuery.split('/');
  const resource = parts[0];
  const table = TABLE_MAP[resource];
  const id = parts[1] ? Number(parts[1]) : null;
  const method = (options?.method || 'GET').toUpperCase();

  // Health check for backup endpoint
  if (resource === 'backups' && parts[1] === 'health') {
    return new Response(JSON.stringify({ status: 'ok', mode: 'github-pages' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Stats
  if (resource === 'stats') {
    return new Response(JSON.stringify(await computeStats()), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Excel/seed/recuento/envios/backups - not fully supported on GitHub Pages
  if (['excel', 'seed', 'recuento', 'envios', 'backups'].includes(resource)) {
    const msg = resource === 'recuento' || resource === 'envios' ? 'feature' : 'function';
    throw new Error(`${resource} solo disponible en modo local`);
  }

  if (!table) throw new Error(`Unknown resource: ${resource}`);

  const fullUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/${table}.json`;

  try {
    if (method === 'GET' && url.includes('search')) {
      return new Response(JSON.stringify({ orders: [], total: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'GET' && id) {
      const record = await getById(table, id);
      return new Response(JSON.stringify(record), { headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'GET') {
      let data;

      // Handle query params
      const queryIdx = url.indexOf('?');
      const params = new URLSearchParams(queryIdx >= 0 ? url.slice(queryIdx) : '');

      if (resource === 'orders') {
        const all = await getAll(table);
        let filtered = [...all];

        const search = params.get('search');
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(o =>
            (o.cliente || '').toLowerCase().includes(s) ||
            (o.calle || '').toLowerCase().includes(s) ||
            (o.barrio || '').toLowerCase().includes(s) ||
            (o.celular || '').toLowerCase().includes(s)
          );
        }
        const barrio = params.get('barrio');
        if (barrio) filtered = filtered.filter(o => o.barrio === barrio);
        const canal = params.get('canal');
        if (canal) filtered = filtered.filter(o => o.canal_venta === canal);
        const fd = params.get('fecha_desde');
        if (fd) filtered = filtered.filter(o => (o.fecha_pedido || '') >= fd);
        const fh = params.get('fecha_hasta');
        if (fh) filtered = filtered.filter(o => (o.fecha_pedido || '') <= fh);

        filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
        const total = filtered.length;
        const limit = Number(params.get('limit')) || 100;
        const offset = Number(params.get('offset')) || 0;
        filtered = filtered.slice(offset, offset + limit);

        data = { orders: filtered, total };
      } else if (resource === 'products' && params.get('list_type')) {
        const all = await getAll(table);
        const lt = params.get('list_type');
        data = all.filter(p => p.list_type === lt);
        // Attach prices to each product
        const prices = await getAll('price_lists');
        data = data.map(p => ({
          ...p,
          prices: prices.filter(pr => pr.product_id === p.id)
        }));
      } else if (resource === 'products') {
        data = await getAll(table);
        const prices = await getAll('price_lists');
        const combos = await getAll('combo_items');
        data = data.map(p => ({
          ...p,
          prices: prices.filter(pr => pr.product_id === p.id),
          combo_items: combos.filter(c => c.combo_id === p.id)
        }));
      } else if (resource === 'repartidores') {
        const zones = await getAll('delivery_zones');
        const unique = [...new Set(zones.map(z => z.deliverer).filter(Boolean))];
        data = unique.map((name, i) => ({ id: i + 1, name, phone: '', vehicle: '', active: true }));
      } else if (resource === 'customers' && params.get('search')) {
        const s = params.get('search').toLowerCase();
        const all = await getAll(table);
        data = all.filter(c =>
          (c.name || '').toLowerCase().includes(s) ||
          (c.dni || '').includes(s) ||
          (c.celular || '').includes(s)
        );
      } else {
        data = await getAll(table);
      }

      return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'POST') {
      const body = JSON.parse(options.body);
      const record = await insert(table, body);
      return new Response(JSON.stringify(record), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'PUT') {
      const body = JSON.parse(options.body);
      const record = await update(table, id, body);
      return new Response(JSON.stringify(record), { headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'PATCH') {
      // For price updates: /api/products/:id/price
      const body = JSON.parse(options.body);
      const prices = await getAll('price_lists');
      const existing = prices.find(p => p.id === body.priceListId && p.product_id === id);
      if (existing) {
        await update('price_lists', existing.id, { price: body.price });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (method === 'DELETE') {
      await remove(table, id);
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unsupported method: ${method}`);

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function computeStats() {
  const products = await getAll('products');
  const customers = await getAll('customers');
  const orders = await getAll('orders');

  const prodCount = products.length;
  const prodMinorista = products.filter(p => p.list_type === 'Minorista').length;
  const prodMayorista = products.filter(p => p.list_type === 'Mayorista').length;
  const catCount = [...new Set(products.map(p => p.category))].length;
  const customerCount = customers.length;
  const orderCount = orders.length;

  let totalRevenue = 0, totalCollected = 0;
  const byCategory = {}, byPayment = {}, byChannel = {}, byNeighborhood = {}, byMonth = {}, ordersByDay = {};
  const prodCounts = {}, prodRevenues = {};

  for (const o of orders) {
    const tp = Number(o.total_pedido) || 0;
    const cr = Number(o.cobro_real) || 0;
    totalRevenue += tp;
    totalCollected += cr;

    if (o.fecha_pedido) {
      if (!ordersByDay[o.fecha_pedido]) ordersByDay[o.fecha_pedido] = { day: o.fecha_pedido, count: 0, revenue: 0 };
      ordersByDay[o.fecha_pedido].count++;
      ordersByDay[o.fecha_pedido].revenue += tp;
    }

    const barrio = o.barrio || 'Sin barrio';
    if (!byNeighborhood[barrio]) byNeighborhood[barrio] = { name: barrio, count: 0, revenue: 0 };
    byNeighborhood[barrio].count++;
    byNeighborhood[barrio].revenue += tp;

    const medio = o.medio_cobro || 'Sin medio';
    if (!byPayment[medio]) byPayment[medio] = { name: medio, count: 0, revenue: 0 };
    byPayment[medio].count++;
    byPayment[medio].revenue += tp;

    const canal = o.canal_venta || 'Sin canal';
    if (!byChannel[canal]) byChannel[canal] = { name: canal, count: 0, revenue: 0 };
    byChannel[canal].count++;
    byChannel[canal].revenue += tp;

    const date = o.fecha_pedido;
    if (date) {
      const month = date.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = { name: month, count: 0, revenue: 0 };
      byMonth[month].count++;
      byMonth[month].revenue += tp;
    }

    for (let i = 1; i <= 7; i++) {
      const name = o[`producto${i}`];
      if (name && String(name).trim()) {
        if (!prodCounts[name]) { prodCounts[name] = 0; prodRevenues[name] = 0; }
        prodCounts[name]++;
        prodRevenues[name] += Number(o[`valor_prod${i}`]) || 0;
      }
    }
  }

  for (const p of products) {
    const key = `${p.category}::${p.list_type}`;
    if (!byCategory[key]) byCategory[key] = { category: p.category, list_type: p.list_type, count: 0 };
    byCategory[key].count++;
  }

  const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;

  return {
    counts: {
      products: prodCount, minorista: prodMinorista, mayorista: prodMayorista,
      categories: catCount, customers: customerCount, orders: orderCount,
      revenue: totalRevenue, collected: totalCollected, avgOrder: Math.round(avgOrder * 100) / 100,
    },
    byCategory: Object.values(byCategory).sort((a, b) => b.count - a.count),
    ordersByDay: Object.values(ordersByDay).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 30),
    topProducts: Object.entries(prodCounts).map(([name, count]) => ({ name, count, revenue: prodRevenues[name] })).sort((a, b) => b.count - a.count).slice(0, 10),
    byPayment: Object.values(byPayment).sort((a, b) => b.revenue - a.revenue),
    byChannel: Object.values(byChannel).sort((a, b) => b.count - a.count),
    byNeighborhood: Object.values(byNeighborhood).sort((a, b) => b.count - a.count).slice(0, 15),
    byMonth: Object.values(byMonth).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
