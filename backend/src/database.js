import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'supremas.db');

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
      sort_order INTEGER DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS delivery_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      neighborhood TEXT NOT NULL,
      deliverer TEXT NOT NULL
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

  return db;
}
