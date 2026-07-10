import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'supremas.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_type TEXT NOT NULL DEFAULT 'Minorista',
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      sigla TEXT,
      is_combo INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS combo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (combo_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS price_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      price REAL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      commission_rate REAL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS sales_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repartidores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      phone TEXT DEFAULT '',
      vehicle TEXT DEFAULT '',
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS delivery_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      neighborhood TEXT NOT NULL,
      deliverer TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS price_list_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      dni TEXT,
      celular TEXT,
      calle TEXT,
      altura TEXT,
      piso_dto TEXT,
      barrio TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conductor TEXT,
      mes TEXT,
      anio TEXT,
      fecha_pedido TEXT,
      fecha_entrega TEXT,
      dia TEXT,
      canal_venta TEXT,
      cliente TEXT,
      dni TEXT,
      celular TEXT,
      calle TEXT,
      altura TEXT,
      piso_dto TEXT,
      comentario TEXT,
      barrio TEXT,
      lista_precio TEXT,
      producto1 TEXT,
      producto2 TEXT,
      producto3 TEXT,
      producto4 TEXT,
      producto5 TEXT,
      producto6 TEXT,
      producto7 TEXT,
      valor_prod1 REAL DEFAULT 0,
      valor_prod2 REAL DEFAULT 0,
      valor_prod3 REAL DEFAULT 0,
      valor_prod4 REAL DEFAULT 0,
      valor_prod5 REAL DEFAULT 0,
      valor_prod6 REAL DEFAULT 0,
      valor_prod7 REAL DEFAULT 0,
      promo_especial TEXT,
      total_pedido REAL DEFAULT 0,
      medio_cobro TEXT,
      cobro_real REAL DEFAULT 0,
      orden_numero INTEGER,
      whatsapp TEXT,
      mensaje_web TEXT,
      mensaje_whatsapp TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  // Add audit_log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip TEXT,
      timestamp TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Add backup_schedule settings defaults
  try {
    const autoBackupInterval = db.prepare(`SELECT value FROM settings WHERE key = 'auto_backup_interval'`).get();
    if (!autoBackupInterval) {
      db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_backup_interval', '30')`).run();
    }
    const autoBackupRetention = db.prepare(`SELECT value FROM settings WHERE key = 'auto_backup_retention'`).get();
    if (!autoBackupRetention) {
      db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_backup_retention', '20')`).run();
    }
  } catch (e) {}

  return db;
}

export function syncPriceListLabels() {
  const db = getDb();
  const existingLabels = db.prepare(`SELECT COUNT(*) as c FROM price_list_labels`).get().c;
  if (existingLabels === 0) {
    const distinctLabels = db.prepare(`SELECT DISTINCT label FROM price_lists ORDER BY label`).all();
    const insert = db.prepare(`INSERT OR IGNORE INTO price_list_labels (name, sort_order) VALUES (?, ?)`);
    distinctLabels.forEach((row, i) => insert.run(row.label, i + 1));
  }
}
