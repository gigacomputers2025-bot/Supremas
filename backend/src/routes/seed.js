import { Router } from 'express';
import { getDb } from '../database.js';
import { createSnapshotBackup } from '../middleware/autoBackup.js';

const router = Router();

router.post('/', (req, res) => {
  try {
    // Create safety backup before seeding
    const backup = createSnapshotBackup();
    console.log(`[Seed] Pre-seed backup: ${backup.filename || 'failed'}`);

    const db = getDb();

    // Clear all tables in correct order (respecting FK constraints)
    db.exec(`DELETE FROM combo_items`);
    db.exec(`DELETE FROM price_lists`);
    db.exec(`DELETE FROM orders`);
    db.exec(`DELETE FROM audit_log`);
    db.exec(`DELETE FROM products`);
    db.exec(`DELETE FROM payment_methods`);
    db.exec(`DELETE FROM sales_channels`);
    db.exec(`DELETE FROM delivery_zones`);
    db.exec(`DELETE FROM repartidores`);
    db.exec(`DELETE FROM categories`);
    db.exec(`DELETE FROM price_list_labels`);
    db.exec(`DELETE FROM customers`);
    db.exec(`DELETE FROM settings`);

    // === CATEGORIES ===
    const catNames = ['Bebidas', 'Lácteos', 'Panadería', 'Verdulería', 'Carnicería', 'Limpieza', 'Almacén', 'Congelados'];
    const insertCat = db.prepare(`INSERT INTO categories (name) VALUES (?)`);
    for (const c of catNames) insertCat.run(c);

    // === PRICE LIST LABELS ===
    const labelNames = ['Minorista', 'Mayorista', 'Promo 1', 'Promo 2', 'Premium', 'Liquidación'];
    const insertLabel = db.prepare(`INSERT INTO price_list_labels (name, sort_order) VALUES (?, ?)`);
    labelNames.forEach((name, i) => insertLabel.run(name, i + 1));

    // === PRODUCTS ===
    const productData = [
      { list_type: 'Minorista', category: 'Bebidas', name: 'Coca-Cola 2L', sigla: 'COC2', prices: [1800, 1600, 1500, 1700, 2000, 1400] },
      { list_type: 'Minorista', category: 'Bebidas', name: 'Sprite 2L', sigla: 'SPR2', prices: [1700, 1500, 1400, 1600, 1900, 1300] },
      { list_type: 'Minorista', category: 'Bebidas', name: 'Agua Mineral 2L', sigla: 'AGU2', prices: [1200, 1000, 950, 1100, 1400, 900] },
      { list_type: 'Minorista', category: 'Bebidas', name: 'Jugo Tang Naranja', sigla: 'TANG', prices: [800, 700, 650, 750, 900, 600] },
      { list_type: 'Minorista', category: 'Bebidas', name: 'Cerveza Quilmes 1L', sigla: 'QUIL', prices: [1500, 1300, 1200, 1400, 1700, 1100] },
      { list_type: 'Mayorista', category: 'Bebidas', name: 'Coca-Cola 2L x6', sigla: 'COC6', prices: [9600, 8800, 8200, 9200, 11000, 7600] },
      { list_type: 'Minorista', category: 'Lácteos', name: 'Leche Entera La Serenísima 1L', sigla: 'LEC1', prices: [1100, 950, 900, 1000, 1200, 850] },
      { list_type: 'Minorista', category: 'Lácteos', name: 'Yogur Firme Frutilla 190g', sigla: 'YOGF', prices: [600, 520, 480, 550, 700, 450] },
      { list_type: 'Minorista', category: 'Lácteos', name: 'Queso Cremoso La Paulina 500g', sigla: 'QCRE', prices: [2500, 2200, 2000, 2400, 2800, 1900] },
      { list_type: 'Minorista', category: 'Lácteos', name: 'Manteca 200g', sigla: 'MANT', prices: [900, 780, 720, 850, 1000, 680] },
      { list_type: 'Minorista', category: 'Lácteos', name: 'Crema de Leche 200cc', sigla: 'CREM', prices: [750, 650, 600, 700, 850, 550] },
      { list_type: 'Minorista', category: 'Panadería', name: 'Pan Francés x Kg', sigla: 'PANF', prices: [800, 700, 650, 750, 900, 600] },
      { list_type: 'Minorista', category: 'Panadería', name: 'Pan de Molde Lactal 580g', sigla: 'PMLD', prices: [1600, 1400, 1300, 1500, 1800, 1200] },
      { list_type: 'Minorista', category: 'Panadería', name: 'Facturas x Docena', sigla: 'FACT', prices: [2400, 2100, 1900, 2300, 2800, 1800] },
      { list_type: 'Minorista', category: 'Panadería', name: 'Pebete Pan Rallado 500g', sigla: 'PBR', prices: [1100, 950, 880, 1050, 1300, 850] },
      { list_type: 'Minorista', category: 'Verdulería', name: 'Tomate Perita x Kg', sigla: 'TOMP', prices: [900, 780, 720, 850, 1000, 680] },
      { list_type: 'Minorista', category: 'Verdulería', name: 'Lechuga Criolla x Unidad', sigla: 'LECH', prices: [400, 350, 320, 380, 450, 300] },
      { list_type: 'Minorista', category: 'Verdulería', name: 'Papa x Kg', sigla: 'PAPA', prices: [600, 520, 480, 550, 700, 450] },
      { list_type: 'Minorista', category: 'Verdulería', name: 'Cebolla x Kg', sigla: 'CEBO', prices: [500, 430, 400, 480, 600, 380] },
      { list_type: 'Minorista', category: 'Verdulería', name: 'Zanahoria x Kg', sigla: 'ZANA', prices: [450, 390, 360, 420, 520, 340] },
      { list_type: 'Minorista', category: 'Carnicería', name: 'Bistec de Cuadril x Kg', sigla: 'BIST', prices: [4500, 4000, 3700, 4300, 5000, 3500] },
      { list_type: 'Minorista', category: 'Carnicería', name: 'Carne Picada Especial x Kg', sigla: 'CPIC', prices: [3800, 3400, 3100, 3600, 4200, 2900] },
      { list_type: 'Minorista', category: 'Carnicería', name: 'Pechuga de Pollo x Kg', sigla: 'PECH', prices: [3500, 3100, 2800, 3300, 3900, 2600] },
      { list_type: 'Minorista', category: 'Carnicería', name: 'Milanesa de Carne x Kg', sigla: 'MILA', prices: [4200, 3800, 3500, 4000, 4700, 3200] },
      { list_type: 'Minorista', category: 'Carnicería', name: 'Chorizo Parrillero x Kg', sigla: 'CHOR', prices: [2800, 2500, 2300, 2700, 3200, 2100] },
      { list_type: 'Mayorista', category: 'Carnicería', name: 'Media Res x KG', sigla: 'MRES', prices: [3200, 2800, 2600, 3000, 3600, 2400] },
      { list_type: 'Minorista', category: 'Limpieza', name: 'Detergente Magistral 750ml', sigla: 'DETM', prices: [950, 820, 760, 900, 1100, 720] },
      { list_type: 'Minorista', category: 'Limpieza', name: 'Lavandina Ayudín 1L', sigla: 'LAVA', prices: [600, 520, 480, 550, 700, 450] },
      { list_type: 'Minorista', category: 'Limpieza', name: 'Jabón en Polvo Ala 800g', sigla: 'JABA', prices: [1800, 1600, 1480, 1700, 2000, 1380] },
      { list_type: 'Minorista', category: 'Limpieza', name: 'Esponja Virulana Nylon', sigla: 'ESPO', prices: [350, 300, 280, 330, 400, 260] },
      { list_type: 'Minorista', category: 'Almacén', name: 'Arroz Gallo Oro 1Kg', sigla: 'ARRO', prices: [1300, 1150, 1050, 1200, 1450, 980] },
      { list_type: 'Minorista', category: 'Almacén', name: 'Fideos Spaghetti Matarazzo 500g', sigla: 'FIDE', prices: [700, 600, 550, 650, 800, 520] },
      { list_type: 'Minorista', category: 'Almacén', name: 'Harina 0000 Pureza x Kg', sigla: 'HARI', prices: [600, 520, 480, 550, 700, 450] },
      { list_type: 'Minorista', category: 'Almacén', name: 'Aceite Lira Girasol 1.5L', sigla: 'ACLI', prices: [2200, 1950, 1800, 2100, 2400, 1700] },
      { list_type: 'Minorista', category: 'Almacén', name: 'Sal Entrefina Celusal 500g', sigla: 'SAL', prices: [350, 300, 280, 330, 400, 260] },
      { list_type: 'Minorista', category: 'Almacén', name: 'Azúcar Ledesma x Kg', sigla: 'AZUC', prices: [900, 780, 720, 850, 1000, 680] },
      { list_type: 'Minorista', category: 'Almacén', name: 'Dulce de Leche La Sereno 500g', sigla: 'DULC', prices: [1600, 1400, 1300, 1500, 1800, 1200] },
      { list_type: 'Minorista', category: 'Almacén', name: 'Café La Virginia 250g', sigla: 'CAFE', prices: [2800, 2500, 2300, 2700, 3200, 2100] },
      { list_type: 'Minorista', category: 'Almacén', name: 'Galletitas Surtidas x 200g', sigla: 'GALS', prices: [600, 520, 480, 550, 700, 450] },
      { list_type: 'Minorista', category: 'Congelados', name: 'Papas congeladas prefritas x Kg', sigla: 'PAPC', prices: [2000, 1750, 1600, 1900, 2300, 1500] },
      { list_type: 'Minorista', category: 'Congelados', name: 'Hamburguesas Paty x6', sigla: 'HAM6', prices: [3500, 3100, 2800, 3300, 3900, 2600] },
      { list_type: 'Minorista', category: 'Congelados', name: 'Pizza congelada x Unidad', sigla: 'PIZC', prices: [2500, 2200, 2000, 2400, 2800, 1900] },
      { list_type: 'Minorista', category: 'Congelados', name: 'Arvejas congeladas x 500g', sigla: 'ARVC', prices: [750, 650, 600, 700, 850, 550] },
    ];

    const insertProd = db.prepare(`INSERT INTO products (list_type, category, name, sigla, sort_order) VALUES (?, ?, ?, ?, ?)`);
    const insertPrice = db.prepare(`INSERT INTO price_lists (product_id, label, price) VALUES (?, ?, ?)`);

    const seedTransaction = db.transaction(() => {
      productData.forEach((p, sortOrder) => {
        const r = insertProd.run(p.list_type, p.category, p.name, p.sigla, sortOrder + 1);
        const productId = r.lastInsertRowid;
        p.prices.forEach((price, idx) => {
          insertPrice.run(productId, labelNames[idx], price);
        });
      });
    });
    seedTransaction();

    // === PAYMENT METHODS ===
    const payData = [
      { name: 'Efectivo', rate: 0 },
      { name: 'Débito', rate: 3 },
      { name: 'Crédito', rate: 6 },
      { name: 'Mercado Pago', rate: 4 },
      { name: 'Transferencia', rate: 0 },
    ];
    const insertPay = db.prepare(`INSERT INTO payment_methods (name, commission_rate) VALUES (?, ?)`);
    for (const p of payData) insertPay.run(p.name, p.rate);

    // === SALES CHANNELS ===
    const channelNames = ['WhatsApp', 'Presencial', 'Delivery', 'Web', 'Teléfono'];
    const insertChan = db.prepare(`INSERT INTO sales_channels (name) VALUES (?)`);
    for (const c of channelNames) insertChan.run(c);

    // === DELIVERY ZONES ===
    const zoneData = [
      { neighborhood: 'Centro', deliverer: 'CARLOS' },
      { neighborhood: 'Norte', deliverer: 'CARLOS' },
      { neighborhood: 'Sur', deliverer: 'MATI' },
      { neighborhood: 'Este', deliverer: 'MATI' },
      { neighborhood: 'Oeste', deliverer: 'CARLOS' },
      { neighborhood: 'Belgrano', deliverer: 'PEDRO' },
      { neighborhood: 'Palermo', deliverer: 'PEDRO' },
      { neighborhood: 'Recoleta', deliverer: 'JUAN' },
      { neighborhood: 'Caballito', deliverer: 'JUAN' },
      { neighborhood: 'Flores', deliverer: 'LUIS' },
      { neighborhood: 'Floresta', deliverer: 'LUIS' },
      { neighborhood: 'Villa Crespo', deliverer: 'CARLOS' },
      { neighborhood: 'Almagro', deliverer: 'MATI' },
      { neighborhood: 'Boedo', deliverer: 'PEDRO' },
    ];
    const insertZone = db.prepare(`INSERT INTO delivery_zones (neighborhood, deliverer) VALUES (?, ?)`);
    for (const z of zoneData) insertZone.run(z.neighborhood, z.deliverer);

    // === REPARTIDORES ===
    const repartidorData = [
      { name: 'CARLOS', phone: '1122334455', vehicle: 'Moto' },
      { name: 'MATI', phone: '1133445566', vehicle: 'Auto' },
      { name: 'PEDRO', phone: '1144556677', vehicle: 'Moto' },
      { name: 'JUAN', phone: '1155667788', vehicle: 'Furgón' },
      { name: 'LUIS', phone: '1166778899', vehicle: 'Moto' },
    ];
    const insertRep = db.prepare(`INSERT INTO repartidores (name, phone, vehicle) VALUES (?, ?, ?)`);
    for (const r of repartidorData) insertRep.run(r.name, r.phone, r.vehicle);

    // === CUSTOMERS ===
    const customerData = [
      { name: 'Juan Pérez', dni: '20123456', celular: '1123456789', calle: 'Av. Corrientes', altura: '1234', piso_dto: '3B', barrio: 'Centro' },
      { name: 'María García', dni: '27123456', celular: '1134567890', calle: 'Lavalle', altura: '567', piso_dto: '', barrio: 'Belgrano' },
      { name: 'Carlos López', dni: '30123456', celular: '1145678901', calle: 'Santa Fe', altura: '2345', piso_dto: '1A', barrio: 'Palermo' },
      { name: 'Ana Martínez', dni: '23123456', celular: '1156789012', calle: 'Callao', altura: '890', piso_dto: '8C', barrio: 'Recoleta' },
      { name: 'Pedro Rodríguez', dni: '25123456', celular: '1167890123', calle: 'Rivadavia', altura: '3456', piso_dto: '', barrio: 'Caballito' },
      { name: 'Laura Fernández', dni: '28123456', celular: '1178901234', calle: 'Córdoba', altura: '4321', piso_dto: '7A', barrio: 'Centro' },
      { name: 'Diego González', dni: '31123456', celular: '1189012345', calle: 'Maipú', altura: '789', piso_dto: '2B', barrio: 'Norte' },
      { name: 'Sofía Diaz', dni: '32123456', celular: '1190123456', calle: 'Paraguay', altura: '111', piso_dto: '', barrio: 'Palermo' },
      { name: 'Luis Torres', dni: '33123456', celular: '1122334455', calle: 'Uruguay', altura: '222', piso_dto: '5', barrio: 'Belgrano' },
      { name: 'Carla Sánchez', dni: '34123456', celular: '1133445566', calle: 'Viamonte', altura: '333', piso_dto: '10B', barrio: 'Centro' },
      { name: 'Martín Ramírez', dni: '35123456', celular: '1144556677', calle: 'Tucumán', altura: '444', piso_dto: '', barrio: 'Flores' },
      { name: 'Valentina Castro', dni: '36123456', celular: '1155667788', calle: 'Junín', altura: '555', piso_dto: '6A', barrio: 'Recoleta' },
      { name: 'Federico Ortiz', dni: '37123456', celular: '1166778899', calle: 'Suipacha', altura: '666', piso_dto: '9', barrio: 'Centro' },
      { name: 'Camila Mendoza', dni: '38123456', celular: '1177889900', calle: 'Esmeralda', altura: '777', piso_dto: '', barrio: 'Caballito' },
      { name: 'Nicolás Herrera', dni: '39123456', celular: '1188990011', calle: 'Reconquista', altura: '888', piso_dto: '4C', barrio: 'Norte' },
      { name: 'Florencia Ríos', dni: '40123456', celular: '1199001122', calle: 'San Martín', altura: '999', piso_dto: '', barrio: 'Palermo' },
      { name: 'Alejandro Morales', dni: '41123456', celular: '1122112233', calle: 'Belgrano', altura: '1111', piso_dto: '2A', barrio: 'Almagro' },
      { name: 'Victoria Acosta', dni: '42123456', celular: '1133223344', calle: 'Independencia', altura: '2222', piso_dto: '', barrio: 'Boedo' },
      { name: 'Santiago Vega', dni: '43123456', celular: '1144334455', calle: 'Pueyrredón', altura: '3333', piso_dto: '8', barrio: 'Villa Crespo' },
      { name: 'Lucía Paz', dni: '44123456', celular: '1155445566', calle: 'Las Heras', altura: '4444', piso_dto: '3B', barrio: 'Palermo' },
      { name: 'Gabriel Silva', dni: '45123456', celular: '1166556677', calle: 'Scalabrini Ortiz', altura: '5555', piso_dto: '', barrio: 'Flores' },
      { name: 'Emilia Ruiz', dni: '46123456', celular: '1177667788', calle: 'Billinghurst', altura: '6666', piso_dto: '7A', barrio: 'Almagro' },
      { name: 'Tomás Colombo', dni: '47123456', celular: '1188778899', calle: 'Humboldt', altura: '7777', piso_dto: '', barrio: 'Villa Crespo' },
      { name: 'Julieta Molina', dni: '48123456', celular: '1199889900', calle: 'Fitz Roy', altura: '8888', piso_dto: '1B', barrio: 'Palermo' },
      { name: 'Bruno Rivas', dni: '49123456', celular: '1122001122', calle: 'Gorriti', altura: '9999', piso_dto: '', barrio: 'Belgrano' },
      { name: 'Agustina Navarro', dni: '50123456', celular: '1133112233', calle: 'Costa Rica', altura: '1010', piso_dto: '5C', barrio: 'Palermo' },
      { name: 'Rodrigo Pereyra', dni: '51123456', celular: '1144223344', calle: 'Nicaragua', altura: '1112', piso_dto: '', barrio: 'Caballito' },
      { name: 'Camila Juárez', dni: '52123456', celular: '1155334455', calle: 'Guatemala', altura: '1212', piso_dto: '2', barrio: 'Almagro' },
      { name: 'Lautaro Sosa', dni: '53123456', celular: '1166445566', calle: 'Honduras', altura: '1313', piso_dto: '', barrio: 'Recoleta' },
      { name: 'Micaela Luna', dni: '54123456', celular: '1177556677', calle: 'El Salvador', altura: '1414', piso_dto: '9A', barrio: 'Norte' },
    ];

    const insertCust = db.prepare(
      `INSERT OR IGNORE INTO customers (name, dni, celular, calle, altura, piso_dto, barrio) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const c of customerData) {
      insertCust.run(c.name, c.dni, c.celular, c.calle, c.altura, c.piso_dto, c.barrio);
    }

    // === ORDERS ===
    const ordProducts = productData.filter(p => !p.list_type || p.list_type === 'Minorista').map(p => p.name);
    const channels = ['WhatsApp', 'Presencial', 'Delivery', 'Web'];
    const payments = ['Efectivo', 'Débito', 'Crédito', 'Mercado Pago'];
    const barrios = zoneData.map(z => z.neighborhood);
    const conductores = [...new Set(zoneData.map(z => z.deliverer))];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'];

    function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function randomDate(start, end) {
      const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
      return d.toISOString().split('T')[0];
    }

    function getDayName(dateStr) {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return days[new Date(dateStr).getDay()];
    }

    const insertOrder = db.prepare(`
      INSERT INTO orders (
        conductor, mes, anio, fecha_pedido, fecha_entrega, dia,
        canal_venta, cliente, dni, celular, calle, altura, piso_dto,
        comentario, barrio, lista_precio,
        producto1, producto2, producto3, producto4, producto5, producto6, producto7,
        valor_prod1, valor_prod2, valor_prod3, valor_prod4, valor_prod5, valor_prod6, valor_prod7,
        promo_especial, total_pedido, medio_cobro, cobro_real
      ) VALUES (?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?)
    `);

    const orderTransaction = db.transaction(() => {
      for (let i = 0; i < 50; i++) {
        const cust = customerData[Math.floor(Math.random() * customerData.length)];
        const fPedido = randomDate(new Date('2026-01-01'), new Date('2026-06-01'));
        const fEntrega = randomDate(new Date(fPedido), new Date(new Date(fPedido).getTime() + 7 * 86400000));
        const dia = getDayName(fPedido);
        const mes = meses[new Date(fPedido).getMonth()];
        const anio = '2026';
        const canal = randomItem(channels);
        const pago = randomItem(payments);
        const barrio = cust.barrio || randomItem(barrios);
        const conductor = randomItem(conductores);

        const prodCount = 1 + Math.floor(Math.random() * 5);
        const prods = [];
        const vals = [];
        for (let j = 0; j < 7; j++) {
          if (j < prodCount) {
            const prodName = randomItem(ordProducts);
            const price = 500 + Math.floor(Math.random() * 4000);
            prods.push(prodName);
            vals.push(price);
          } else {
            prods.push('');
            vals.push(0);
          }
        }

        // Fill remaining slots
        while (prods.length < 7) { prods.push(''); vals.push(0); }

        const totalPedido = vals.reduce((a, b) => a + b, 0);
        const cobroReal = Math.random() > 0.15 ? totalPedido : totalPedido - Math.floor(Math.random() * totalPedido * 0.3);
        const promo = Math.random() > 0.85 ? '10%' : '';

        insertOrder.run(
          conductor, mes, anio, fPedido, fEntrega, dia,
          canal, cust.name, cust.dni, cust.celular, cust.calle, cust.altura, cust.piso_dto,
          '', barrio, 'Minorista',
          prods[0], prods[1], prods[2], prods[3], prods[4], prods[5], prods[6],
          vals[0], vals[1], vals[2], vals[3], vals[4], vals[5], vals[6],
          promo, totalPedido, pago, cobroReal
        );
      }
    });
    orderTransaction();

    // Reinitialize default settings
    const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
    insertSetting.run('auto_backup_interval', '30');
    insertSetting.run('auto_backup_retention', '20');

    res.json({
      success: true,
      message: 'Base de datos poblada con datos de prueba correctamente',
      stats: {
        categories: catNames.length,
        products: productData.length,
        price_labels: labelNames.length,
        payment_methods: payData.length,
        sales_channels: channelNames.length,
        delivery_zones: zoneData.length,
        repartidores: repartidorData.length,
        customers: customerData.length,
        orders: 50,
      }
    });
  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Status endpoint - check if DB has data
router.get('/status', (req, res) => {
  try {
    const db = getDb();
    const stats = {
      categories: db.prepare(`SELECT COUNT(*) as c FROM categories`).get().c,
      products: db.prepare(`SELECT COUNT(*) as c FROM products`).get().c,
      payment_methods: db.prepare(`SELECT COUNT(*) as c FROM payment_methods`).get().c,
      sales_channels: db.prepare(`SELECT COUNT(*) as c FROM sales_channels`).get().c,
      delivery_zones: db.prepare(`SELECT COUNT(*) as c FROM delivery_zones`).get().c,
      repartidores: db.prepare(`SELECT COUNT(*) as c FROM repartidores`).get().c,
      customers: db.prepare(`SELECT COUNT(*) as c FROM customers`).get().c,
      orders: db.prepare(`SELECT COUNT(*) as c FROM orders`).get().c,
    };
    const hasData = Object.values(stats).some(v => v > 0);
    res.json({ hasData, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
