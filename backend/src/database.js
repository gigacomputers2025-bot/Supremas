import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');

const OWNER = 'gigacomputers2025-bot';
const REPO = 'Supremas';
let _token = null;

export function setGithubToken(token) { _token = token; }

const TABLE_MAP = {
  products: 'products',
  price_lists: 'price_lists',
  payment_methods: 'payment_methods',
  sales_channels: 'sales_channels',
  delivery_zones: 'delivery_zones',
  customers: 'customers',
  orders: 'orders',
  settings: 'settings',
  categories: 'categories',
  combo_items: 'combo_items',
  price_list_labels: 'price_list_labels',
  repartidores: 'repartidores',
  audit_log: 'audit_log',
};

let jsonCache = {};
let shaCache = {};
let pending = {};
let gitTimer = null;

function filePath(table) { return join(DATA_DIR, `${table}.json`); }

function loadFromFile(table) {
  if (jsonCache[table]) return jsonCache[table];
  try {
    const raw = readFileSync(filePath(table), 'utf8');
    jsonCache[table] = JSON.parse(raw);
  } catch { jsonCache[table] = []; }
  return jsonCache[table];
}

function saveToFile(table) {
  try {
    writeFileSync(filePath(table), JSON.stringify(jsonCache[table], null, 2), 'utf8');
  } catch (e) { console.error(`Error writing ${table}:`, e.message); }
}

async function pushToGithub(table) {
  if (!_token) return;
  const data = jsonCache[table];
  if (!data) return;
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/${table}.json`;
    const encoded = btoa(JSON.stringify(data, null, 2));
    const body = { message: `Update ${table} [Supremas auto]`, content: encoded };
    if (shaCache[table]) body.sha = shaCache[table];
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${_token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const result = await res.json();
      shaCache[table] = result.content.sha;
    }
  } catch (e) { console.error(`Git sync error ${table}:`, e.message); }
}

function scheduleGit(table) {
  pending[table] = true;
  if (gitTimer) clearTimeout(gitTimer);
  gitTimer = setTimeout(() => {
    const tables = Object.keys(pending);
    pending = {};
    tables.forEach(t => pushToGithub(t));
  }, 2000);
}

function tableFromSQL(sql) {
  const t = sql.match(/\bFROM\s+(\w+)\b/i)?.[1] || sql.match(/\bINTO\s+(\w+)\b/i)?.[1] || sql.match(/\bTABLE\s+(\w+)\b/i)?.[1] || sql.match(/\bUPDATE\s+(\w+)\b/i)?.[1];
  if (t && TABLE_MAP[t]) return t;
  if (t && t.toLowerCase() === 'orders') return 'orders';
  return t;
}

function normalizeTable(t) {
  if (TABLE_MAP[t]) return TABLE_MAP[t];
  return t;
}

function evalWhere(rows, conditions, params) {
  if (!conditions) return rows;
  let pIdx = 0;

  // Split on AND (outer level only, not inside parens)
  function splitAnd(str) {
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') depth--;
      else if (depth === 0 && str.substring(i, i + 5) === ' AND ') {
        parts.push(str.substring(start, i));
        i += 4;
        start = i + 1;
      }
    }
    parts.push(str.substring(start));
    return parts.map(s => s.trim()).filter(Boolean);
  }

  function splitOr(str) {
    const parts = [];
    let depth = 0, start = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') depth--;
      else if (depth === 0 && str.substring(i, i + 4) === ' OR ') {
        parts.push(str.substring(start, i));
        i += 3;
        start = i + 1;
      }
    }
    parts.push(str.substring(start));
    return parts.map(s => s.trim()).filter(Boolean);
  }

  function stripParens(s) {
    s = s.trim();
    while (s.startsWith('(') && s.endsWith(')')) {
      s = s.substring(1, s.length - 1).trim();
    }
    return s;
  }

  function evalCondition(cond, row) {
    const m = cond.match(/(\w+)\s*(=|!=|<|>|<=|>=|IN|LIKE|IS)\s*('(?:[^']*)'|\([^)]+\)|\?)/i);
    if (!m) return true;
    const [, col, op, rawVal] = m;
    let val;
    if (rawVal === '?') {
      val = params[pIdx++];
    } else if (rawVal.startsWith("'")) {
      val = rawVal.slice(1, -1);
    } else if (rawVal.startsWith('(')) {
      val = rawVal.slice(1, -1);
    } else {
      val = rawVal;
    }
    if (col.match(/^\d+$/)) return true;
    if (op === '=') return row[col] == val;
    if (op === '!=') return row[col] != val;
    if (op === 'LIKE' && val) {
      const pattern = val.replace(/%/g, '.*').toLowerCase();
      return String(row[col] || '').toLowerCase().match(pattern);
    }
    if (op === 'IS' && (val === 'null' || val === null)) return row[col] == null;
    if (op === 'IN') {
      const vals = String(val).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      return vals.includes(String(row[col]));
    }
    return true;
  }

  function evalExpr(expr, row) {
    expr = stripParens(expr);
    // If it contains OR at the top level, evaluate OR
    const orParts = splitOr(expr);
    if (orParts.length > 1) {
      return orParts.some(p => evalExpr(p, row));
    }
    // Otherwise it's an AND group or a single condition
    const andParts = splitAnd(expr);
    if (andParts.length > 1) {
      return andParts.every(p => evalExpr(p, row));
    }
    // Single condition
    return evalCondition(expr, row);
  }

  return rows.filter(row => {
    pIdx = 0; // reset param index for each row
    return evalExpr(conditions, row);
  });
}

function parseConditions(sql) {
  const wm = sql.match(/\bWHERE\s+(.+?)(?:\bORDER\b|\bLIMIT\b|\bGROUP\b|$)/is);
  return wm ? wm[1] : null;
}

export function getDb() {
  function prepare(sql) {
    const table = normalizeTable(tableFromSQL(sql));
    const conditions = parseConditions(sql);
    const orderMatch = sql.match(/\bORDER\s+BY\s+(\w+(?:\s+(?:ASC|DESC))?)/i);
    const limitMatch = sql.match(/\bLIMIT\s+(\d+)/i);
    const isCount = /\bCOUNT\s*\(\s*\*\s*\)/i.test(sql);
    const isDistinct = /\bDISTINCT\b/i.test(sql);
    const selectCol = sql.match(/SELECT\s+((?:\w+\([^)]*\)|\w+(?:\.\w+)?)(?:\s+as\s+\w+)?)/i)?.[1];

    const ops = {
      all(...params) {
        const rows = loadFromFile(table);
        let filtered = evalWhere(rows, conditions, params);

        if (isCount) {
          const countAlias = selectCol?.match(/COUNT\s*\([^)]+\)\s+(?:as\s+)?(\w+)/i)?.[1] || 'c';
          return [{ [countAlias]: filtered.length }];
        }

        if (isDistinct && selectCol) {
          const col = selectCol.replace(/\s+as\s+\w+$/i, '').trim();
          const vals = [...new Set(filtered.map(r => r[col]))];
          return vals.map(v => ({ [col]: v }));
        }

        if (selectCol && selectCol.toLowerCase() !== '*' && !selectCol.match(/MAX|MIN|SUM|COUNT/i)) {
          const col = selectCol.replace(/\s+as\s+\w+$/i, '').trim();
          const alias = selectCol.match(/as\s+(\w+)/i)?.[1] || col;
          if (col.match(/^MAX\(/i)) {
            const inner = col.match(/MAX\((\w+)\)/i)?.[1];
            if (inner) return [{ m: Math.max(...filtered.map(r => Number(r[inner]) || 0)) }];
          }
          return filtered.map(r => ({ [alias]: r[col] }));
        }

        if (orderMatch) {
          const [, col, dir] = orderMatch[1].match(/(\w+)(\s+(ASC|DESC))?/i) || [];
          if (col) {
            filtered.sort((a, b) => {
              const va = a[col], vb = b[col];
              if (va == null) return 1; if (vb == null) return -1;
              if (typeof va === 'number') return dir?.toUpperCase() === 'DESC' ? vb - va : va - vb;
              return dir?.toUpperCase() === 'DESC' ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
            });
          }
        }

        if (limitMatch) filtered = filtered.slice(0, parseInt(limitMatch[1]));

        return filtered;
      },

      get(...params) { return ops.all(...params)[0] || null; },

      run(...params) {
        if (/^INSERT\s+INTO/i.test(sql)) {
          const colsM = sql.match(/\(([^)]+)\)\s*(?:VALUES|SELECT)/i);
          if (!colsM) {
            // INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
            const rows = loadFromFile(table);
            const key = params[0]; const existing = rows.findIndex(r => r.key === key);
            if (existing >= 0) return { lastInsertRowid: rows[existing].id, changes: 0 };
            const maxId = rows.reduce((m, r) => Math.max(m, r.id || 0), 0);
            const nr = { id: maxId + 1, key, value: params[1] };
            rows.push(nr); saveToFile(table); scheduleGit(table);
            return { lastInsertRowid: nr.id, changes: 1 };
          }
          if (sql.includes('ON CONFLICT') || sql.includes('OR IGNORE')) {
            const rows = loadFromFile(table);
            const cols = colsM[1].split(',').map(s => s.trim().replace(/["']/g, ''));
            const keyCol = table === 'settings' ? 'key' : 'id';
            const ki = cols.indexOf(keyCol);
            if (ki >= 0) {
              const ex = rows.findIndex(r => r[keyCol] === params[ki]);
              if (ex >= 0) {
                if (sql.includes('DO UPDATE')) {
                  for (let i = 0; i < cols.length; i++) rows[ex][cols[i]] = params[i];
                  saveToFile(table); scheduleGit(table);
                }
                return { lastInsertRowid: rows[ex].id, changes: 0 };
              }
            }
          }
          const cols = colsM[1].split(',').map(s => s.trim().replace(/["']/g, ''));
          const rows = loadFromFile(table);
          const maxId = rows.reduce((m, r) => Math.max(m, r.id || 0), 0);
          const nr = { id: maxId + 1 };
          for (let i = 0; i < cols.length; i++) nr[cols[i]] = params[i];
          rows.push(nr); saveToFile(table); scheduleGit(table);
          return { lastInsertRowid: nr.id, changes: 1 };
        }

        if (/^UPDATE/i.test(sql)) {
          const setMatches = [...sql.matchAll(/(\w+)\s*=\s*\?/g)];
          if (setMatches.length === 0) return { changes: 0 };
          const rows = loadFromFile(table);
          let targetRows = evalWhere(rows, conditions, params.slice(setMatches.length));
          for (const row of targetRows) {
            for (let i = 0; i < setMatches.length; i++) {
              row[setMatches[i][1]] = params[i];
            }
          }
          if (targetRows.length > 0) { saveToFile(table); scheduleGit(table); }
          return { changes: targetRows.length };
        }

        if (/^DELETE/i.test(sql)) {
          if (sql.includes('WHERE')) {
            const rows = loadFromFile(table);
            const target = evalWhere(rows, conditions, params);
            const ids = new Set(target.map(r => r.id));
            const before = rows.length;
            jsonCache[table] = rows.filter(r => !ids.has(r.id));
            saveToFile(table); scheduleGit(table);
            return { changes: before - jsonCache[table].length };
          }
          jsonCache[table] = []; saveToFile(table); scheduleGit(table);
          return { changes: 1 };
        }

        return { changes: 0, lastInsertRowid: null };
      },
    };
    return ops;
  }

  return { prepare, exec: (sql) => {
    const table = normalizeTable(tableFromSQL(sql));
    if (/^DELETE\s+FROM/i.test(sql) && !sql.includes('WHERE')) {
      _clearTable(table);
      return;
    }
    if (/^CREATE\s+TABLE/i.test(sql)) return;
    if (/^DROP\s+TABLE/i.test(sql)) return;
    console.warn('exec not fully implemented:', sql.substring(0, 60));
  }};
}

function _clearTable(table) {
  jsonCache[table] = [];
  saveToFile(table);
  scheduleGit(table);
}

export function initDatabase() {
  // Ensure all JSON data files exist
  const tables = Object.keys(TABLE_MAP);
  for (const table of tables) {
    loadFromFile(table);
  }
  // Set default settings if missing
  const settings = loadFromFile('settings');
  const defaults = { auto_backup_interval: '30', auto_backup_retention: '20' };
  for (const [key, val] of Object.entries(defaults)) {
    if (!settings.find(s => s.key === key)) {
      const maxId = settings.reduce((m, s) => Math.max(m, s.id || 0), 0);
      settings.push({ id: maxId + 1, key, value: val });
    }
  }
  saveToFile('settings');
}

export function getToken() { return _token; }
