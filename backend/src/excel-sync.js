import ExcelJS from 'exceljs';
import { getDb } from './database.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = join(__dirname, '..', '..', 'marzo 2026.xlsx');

export async function importFromExcel() {
  const db = getDb();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  // Clear existing data
  db.exec(`DELETE FROM price_lists`);
  db.exec(`DELETE FROM products`);
  db.exec(`DELETE FROM payment_methods`);
  db.exec(`DELETE FROM sales_channels`);
  db.exec(`DELETE FROM delivery_zones`);
  db.exec(`DELETE FROM customers`);
  db.exec(`DELETE FROM orders`);

  // --- ABM Productos ---
  const wsProducts = workbook.getWorksheet('ABM Productos');
  if (wsProducts) {
    // Row 5 has headers: B=Lista, C=Categoria, D=Producto, E=Sigla, F-K=price columns
    const priceLabels = [];
    for (let col = 6; col <= 11; col++) {
      const label = wsProducts.getRow(5).getCell(col).value;
      if (label) priceLabels.push(String(label).trim());
      else priceLabels.push(`Columna ${col}`);
    }

    const insertProduct = db.prepare(
      `INSERT INTO products (list_type, category, name, sigla, sort_order) VALUES (?, ?, ?, ?, ?)`
    );
    const insertPrice = db.prepare(
      `INSERT INTO price_lists (product_id, label, price) VALUES (?, ?, ?)`
    );

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        const result = insertProduct.run(row.listType, row.category, row.name, row.sigla, row.sortOrder);
        const productId = result.lastInsertRowid;
        for (let i = 0; i < row.prices.length; i++) {
          insertPrice.run(productId, row.prices[i].label, row.prices[i].price);
        }
      }
    });

    const productRows = [];
    wsProducts.eachRow((row, rowNumber) => {
      if (rowNumber <= 5) return; // skip header
      const listType = row.getCell(2).value;
      const category = row.getCell(3).value;
      const name = row.getCell(4).value;
      if (!name) return;
      const sigla = row.getCell(5).value || '';
      const prices = [];
      for (let col = 6; col <= 11; col++) {
        const val = row.getCell(col).value;
        prices.push({
          label: priceLabels[col - 6],
          price: val ? Number(val) : 0
        });
      }
      productRows.push({
        listType: listType ? String(listType).trim() : 'Minorista',
        category: String(category).trim(),
        name: String(name).trim(),
        sigla: String(sigla).trim(),
        sortOrder: rowNumber,
        prices
      });
    });
    transaction(productRows);
    console.log(`Imported ${productRows.length} products from ABM Productos`);
  }

  // --- MAESTRO ---
  const wsMaestro = workbook.getWorksheet('MAESTRO');
  if (wsMaestro) {
    // Payment methods: D column = name, E column = commission rate
    const insertPayment = db.prepare(
      `INSERT INTO payment_methods (name, commission_rate) VALUES (?, ?)`
    );
    wsMaestro.eachRow((row, rowNumber) => {
      if (rowNumber < 8) return;
      const name = row.getCell(4).value;
      const rate = row.getCell(5).value;
      if (name && rate !== null && rate !== undefined) {
        insertPayment.run(String(name).trim(), Number(rate));
      }
    });

    // Sales channels: G column
    const insertChannel = db.prepare(
      `INSERT INTO sales_channels (name) VALUES (?)`
    );
    const channelsDone = new Set();
    wsMaestro.eachRow((row, rowNumber) => {
      if (rowNumber < 8) return;
      const name = row.getCell(7).value;
      if (name) {
        const n = String(name).trim();
        if (!channelsDone.has(n)) {
          channelsDone.add(n);
          insertChannel.run(n);
        }
      }
    });

    // Delivery zones: I=neighborhood, J=deliverer
    const insertZone = db.prepare(
      `INSERT INTO delivery_zones (neighborhood, deliverer) VALUES (?, ?)`
    );
    wsMaestro.eachRow((row, rowNumber) => {
      if (rowNumber < 8) return;
      const neighborhood = row.getCell(9).value;
      const deliverer = row.getCell(10).value;
      if (neighborhood && deliverer) {
        insertZone.run(String(neighborhood).trim(), String(deliverer).trim());
      }
    });

    console.log(`Imported payment methods, channels, and delivery zones from MAESTRO`);
  }

  // --- Deduplicate customers from SUPREMAS (Orders) ---
  const wsCustomers = workbook.getWorksheet('SUPREMAS');
  if (wsCustomers) {
    const insertCust = db.prepare(
      `INSERT OR IGNORE INTO customers (name, dni, celular, calle, altura, piso_dto, barrio) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const seen = new Set();
    const supRowLimit = Math.min(wsCustomers.rowCount, 200);
    for (let rowNumber = 8; rowNumber <= supRowLimit; rowNumber++) {
      try {
        const row = wsCustomers.getRow(rowNumber);
        const name = row.getCell(9).value;
        if (!name) continue;
        const nameStr = String(name).replace(/[^\x20-\x7E\w\sáéíóúñ.,-]/g, '').trim();
        if (!nameStr || seen.has(nameStr.toLowerCase())) continue;
        seen.add(nameStr.toLowerCase());
        insertCust.run(
          nameStr,
          _s(row.getCell(10).value),
          _s(row.getCell(11).value),
          _s(row.getCell(12).value),
          _s(row.getCell(13).value),
          _s(row.getCell(14).value),
          _s(row.getCell(16).value)
        );
      } catch (e) { /* skip */ }
    }
    console.log(`Imported ${seen.size} customers from SUPREMAS`);
  }

  // --- SUPREMAS (Orders) ---
  const wsSupremas = workbook.getWorksheet('SUPREMAS');
  if (wsSupremas) {
    const headers = {};
    const headerRow = wsSupremas.getRow(7);
    for (let col = 2; col <= 39; col++) {
      const val = headerRow.getCell(col).value;
      if (val) headers[col] = String(val).trim();
    }

    const insertMany = db.transaction((orders) => {
      const stmt = db.prepare(`
        INSERT INTO orders (
          conductor, mes, anio, fecha_pedido, fecha_entrega, dia,
          canal_venta, cliente, dni, celular, calle, altura, piso_dto,
          comentario, barrio, lista_precio,
          producto1, producto2, producto3, producto4, producto5, producto6, producto7,
          valor_prod1, valor_prod2, valor_prod3, valor_prod4, valor_prod5, valor_prod6, valor_prod7,
          promo_especial, total_pedido, medio_cobro, cobro_real, orden_numero,
          whatsapp, mensaje_web, mensaje_whatsapp
        ) VALUES (?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?, ?,?,?)
      `);
      for (const o of orders) {
        stmt.run(
          o.conductor, o.mes, o.anio, o.fecha_pedido, o.fecha_entrega, o.dia,
          o.canal_venta, o.cliente, o.dni, o.celular, o.calle, o.altura, o.piso_dto,
          o.comentario, o.barrio, o.lista_precio,
          o.prod1, o.prod2, o.prod3, o.prod4, o.prod5, o.prod6, o.prod7,
          o.val1, o.val2, o.val3, o.val4, o.val5, o.val6, o.val7,
          o.promo, o.total, o.medio_cobro, o.cobro_real, o.orden_num,
          o.whatsapp, o.mensaje_web, o.mensaje_whatsapp
        );
      }
    });

    const orderRows = [];
    const supRowLimit = Math.min(wsSupremas.rowCount, 200);
    for (let rowNumber = 8; rowNumber <= supRowLimit; rowNumber++) {
      try {
        const row = wsSupremas.getRow(rowNumber);
        const cliente = row.getCell(9).value;
        if (!cliente) continue;
        const clienteStr = String(cliente).replace(/[^\x20-\x7E\w\sáéíóúñ.,-]/g, '').trim();
        if (!clienteStr) continue;
        orderRows.push({
          conductor: _s(row.getCell(2).value),
          mes: _s(row.getCell(3).value),
          anio: _s(row.getCell(4).value),
          fecha_pedido: _s2(row.getCell(5).value),
          fecha_entrega: _s2(row.getCell(6).value),
          dia: _s(row.getCell(7).value),
          canal_venta: _s(row.getCell(8).value),
          cliente: clienteStr,
          dni: _s(row.getCell(10).value),
          celular: _s(row.getCell(11).value),
          calle: _s(row.getCell(12).value),
          altura: _s(row.getCell(13).value),
          piso_dto: _s(row.getCell(14).value),
          comentario: _s(row.getCell(15).value),
          barrio: _s(row.getCell(16).value),
          lista_precio: _s(row.getCell(17).value),
          prod1: _s(row.getCell(18).value),
          prod2: _s(row.getCell(19).value),
          prod3: _s(row.getCell(20).value),
          prod4: _s(row.getCell(21).value),
          prod5: _s(row.getCell(22).value),
          prod6: _s(row.getCell(23).value),
          prod7: _s(row.getCell(24).value),
          val1: _num2(row.getCell(25).value),
          val2: _num2(row.getCell(26).value),
          val3: _num2(row.getCell(27).value),
          val4: _num2(row.getCell(28).value),
          val5: _num2(row.getCell(29).value),
          val6: _num2(row.getCell(30).value),
          val7: _num2(row.getCell(31).value),
          promo: _s(row.getCell(32).value),
          total: _num2(row.getCell(33).value),
          medio_cobro: _s(row.getCell(34).value),
          cobro_real: _num2(row.getCell(35).value),
          orden_num: _safeInt(row.getCell(36).value),
          whatsapp: _s(row.getCell(37).value),
          mensaje_web: _s(row.getCell(38).value),
          mensaje_whatsapp: _s(row.getCell(39).value)
        });
      } catch (rowErr) {
        console.error(`Skipping row ${rowNumber}: ${rowErr.message}`);
      }
    }
    try {
      insertMany(orderRows);
      console.log(`Imported ${orderRows.length} orders from SUPREMAS`);
    } catch (orderErr) {
      console.error('Error importing orders:', orderErr.message);
    }
  }
}

function _num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function _s(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[^\x20-\x7E\w\sáéíóúñÁÉÍÓÚ.,-]/g, '').trim();
}

function _s2(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v instanceof Date) {
    return v.toISOString().split('T')[0];
  }
  return String(v).trim();
}

function _num2(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'object') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function _safeInt(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export async function exportToExcel() {
  const db = getDb();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  // --- Update ABM Productos ---
  const wsProducts = workbook.getWorksheet('ABM Productos');
  if (wsProducts) {
    // Get price labels from row 5
    const priceLabels = [];
    for (let col = 6; col <= 11; col++) {
      const label = wsProducts.getRow(5).getCell(col).value;
      priceLabels.push(label ? String(label).trim() : '');
    }

    // Get all products with prices from DB
    const products = db.prepare(`
      SELECT p.*, pl.label, pl.price
      FROM products p
      LEFT JOIN price_lists pl ON pl.product_id = p.id
      ORDER BY p.sort_order, pl.id
    `).all();

    // Group prices by product
    const productMap = {};
    for (const row of products) {
      if (!productMap[row.id]) {
        productMap[row.id] = {
          listType: row.list_type,
          category: row.category,
          name: row.name,
          sigla: row.sigla || '',
          prices: {}
        };
      }
      if (row.label) {
        productMap[row.id].prices[row.label] = row.price;
      }
    }

    const productIds = Object.keys(productMap);
    let dataRow = 6;
    for (const pid of productIds) {
      const p = productMap[pid];
      const row = wsProducts.getRow(dataRow);
      row.getCell(2).value = p.listType;
      row.getCell(3).value = p.category;
      row.getCell(4).value = p.name;
      row.getCell(5).value = p.sigla;
      for (let i = 0; i < priceLabels.length; i++) {
        const label = priceLabels[i];
        const price = p.prices[label];
        row.getCell(6 + i).value = price !== undefined ? price : null;
      }
      row.commit();
      dataRow++;
    }

    // Clear remaining rows
    const maxRow = wsProducts.rowCount;
    for (let r = dataRow; r <= maxRow; r++) {
      const row = wsProducts.getRow(r);
      for (let col = 2; col <= 11; col++) {
        row.getCell(col).value = null;
      }
      row.commit();
    }
  }

  // --- Update MAESTRO ---
  const wsMaestro = workbook.getWorksheet('MAESTRO');
  if (wsMaestro) {
    const payments = db.prepare(`SELECT * FROM payment_methods`).all();
    const channels = db.prepare(`SELECT * FROM sales_channels`).all();
    const zones = db.prepare(`SELECT * FROM delivery_zones`).all();

    let payIdx = 0;
    let chanIdx = 0;
    let zoneIdx = 0;

    wsMaestro.eachRow((row, rowNumber) => {
      if (rowNumber < 8) return;
      const dVal = row.getCell(4).value;
      const gVal = row.getCell(7).value;
      const iVal = row.getCell(9).value;

      // This is a bit heuristic - we update cells that had values
      // Payment methods
      if (dVal && payIdx < payments.length) {
        row.getCell(4).value = payments[payIdx].name;
        row.getCell(5).value = payments[payIdx].commission_rate;
        payIdx++;
      }
      // Sales channels
      if (gVal && chanIdx < channels.length) {
        row.getCell(7).value = channels[chanIdx].name;
        chanIdx++;
      }
      // Delivery zones
      if (iVal && zoneIdx < zones.length) {
        row.getCell(9).value = zones[zoneIdx].neighborhood;
        row.getCell(10).value = zones[zoneIdx].deliverer;
        zoneIdx++;
      }
      row.commit();
    });
  }

  // --- Update SUPREMAS ---
  const wsSupremas = workbook.getWorksheet('SUPREMAS');
  if (wsSupremas) {
    const orders = db.prepare(`SELECT * FROM orders ORDER BY id`).all();
    let dataRow = 8;
    for (const o of orders) {
      const row = wsSupremas.getRow(dataRow);
      row.getCell(2).value = o.conductor;
      row.getCell(3).value = o.mes;
      row.getCell(4).value = o.anio;
      row.getCell(5).value = o.fecha_pedido;
      row.getCell(6).value = o.fecha_entrega;
      row.getCell(7).value = o.dia;
      row.getCell(8).value = o.canal_venta;
      row.getCell(9).value = o.cliente;
      row.getCell(10).value = o.dni;
      row.getCell(11).value = o.celular;
      row.getCell(12).value = o.calle;
      row.getCell(13).value = o.altura;
      row.getCell(14).value = o.piso_dto;
      row.getCell(15).value = o.comentario;
      row.getCell(16).value = o.barrio;
      row.getCell(17).value = o.lista_precio;
      row.getCell(18).value = o.producto1;
      row.getCell(19).value = o.producto2;
      row.getCell(20).value = o.producto3;
      row.getCell(21).value = o.producto4;
      row.getCell(22).value = o.producto5;
      row.getCell(23).value = o.producto6;
      row.getCell(24).value = o.producto7;
      row.getCell(25).value = o.valor_prod1;
      row.getCell(26).value = o.valor_prod2;
      row.getCell(27).value = o.valor_prod3;
      row.getCell(28).value = o.valor_prod4;
      row.getCell(29).value = o.valor_prod5;
      row.getCell(30).value = o.valor_prod6;
      row.getCell(31).value = o.valor_prod7;
      row.getCell(32).value = o.promo_especial;
      row.getCell(33).value = o.total_pedido;
      row.getCell(34).value = o.medio_cobro;
      row.getCell(35).value = o.cobro_real;
      row.getCell(36).value = o.orden_numero;
      row.getCell(37).value = o.whatsapp;
      row.getCell(38).value = o.mensaje_web;
      row.getCell(39).value = o.mensaje_whatsapp;
      row.commit();
      dataRow++;
    }
  }

  await workbook.xlsx.writeFile(EXCEL_PATH);
  console.log('Excel exported successfully');
}
