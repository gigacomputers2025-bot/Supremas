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
      const params = queryIdx >= 0 ? new URLSearchParams(url.slice(queryIdx)) : new URLSearchParams();

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
  const payments = await getAll('payment_methods');
  const channels = await getAll('sales_channels');
  const zones = await getAll('delivery_zones');
  const categories = await getAll('categories');

  // Count stats
  const prodCount = products.length;
  const prodMinorista = products.filter(p => p.list_type === 'Minorista').length;
  const prodMayorista = products.filter(p => p.list_type === 'Mayorista').length;
  const catCount = [...new Set(products.map(p => p.category))].length;
  const customerCount = customers.length;
  const orderCount = orders.length;
  const paymentCount = payments.length;
  const channelCount = channels.length;
  const zoneCount = zones.length;

  // By category
  const byCategory = {};
  for (const p of products) {
    if (!byCategory[p.category]) byCategory[p.category] = 0;
    byCategory[p.category]++;
  }

  // Orders by day (last 30)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const ordersByDay = {};
  for (const o of orders) {
    if (o.fecha_pedido) {
      if (!ordersByDay[o.fecha_pedido]) ordersByDay[o.fecha_pedido] = 0;
      ordersByDay[o.fecha_pedido]++;
    }
  }

  // By barrio
  const byBarrio = {};
  for (const o of orders) {
    const b = o.barrio || 'Sin barrio';
    if (!byBarrio[b]) byBarrio[b] = 0;
    byBarrio[b]++;
  }

  // Revenue stats
  let totalRevenue = 0, totalCobroReal = 0;
  for (const o of orders) {
    totalRevenue += Number(o.total_pedido) || 0;
    totalCobroReal += Number(o.cobro_real) || 0;
  }

  // By payment
  const byPayment = {};
  for (const o of orders) {
    const m = o.medio_cobro || 'Sin medio';
    if (!byPayment[m]) byPayment[m] = 0;
    byPayment[m]++;
  }

  // By channel
  const byChannel = {};
  for (const o of orders) {
    const c = o.canal_venta || 'Sin canal';
    if (!byChannel[c]) byChannel[c] = 0;
    byChannel[c]++;
  }

  // By neighborhood
  const byNeighborhood = {};
  for (const o of orders) {
    const n = o.barrio || 'Sin barrio';
    if (!byNeighborhood[n]) byNeighborhood[n] = 0;
    byNeighborhood[n]++;
  }

  // By month
  const byMonth = {};
  for (const o of orders) {
    const date = o.fecha_pedido;
    if (date) {
      const month = date.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = 0;
      byMonth[month]++;
    }
  }

  return {
    counts: {
      products: prodCount, productsMinorista: prodMinorista, productsMayorista: prodMayorista,
      categories: catCount, customers: customerCount, orders: orderCount,
      payment_methods: paymentCount, sales_channels: channelCount, delivery_zones: zoneCount
    },
    byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
    ordersByDay: Object.entries(ordersByDay).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    byBarrio: Object.entries(byBarrio).map(([barrio, count]) => ({ barrio, count })).sort((a, b) => b.count - a.count),
    revenue: { total: totalRevenue, cobroReal: totalCobroReal },
    byPayment: Object.entries(byPayment).map(([name, count]) => ({ name, count })),
    byChannel: Object.entries(byChannel).map(([name, count]) => ({ name, count })),
    byNeighborhood: Object.entries(byNeighborhood).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    byMonth: Object.entries(byMonth).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
  };
}
