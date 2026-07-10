const OWNER = 'gigacomputers2025-bot';
const REPO = 'Supremas';
const DATA_PATH = 'data';

let _token = null;
let _fileCache = {};
let _shaCache = {};

export function setToken(token) {
  _token = token;
}

function getHeaders() {
  return {
    'Authorization': `Bearer ${_token}`,
    'Accept': 'application/vnd.github+json',
  };
}

function getUrl(table) {
  return `https://api.github.com/repos/${OWNER}/${REPO}/contents/${DATA_PATH}/${table}.json`;
}

async function fetchFile(table) {
  if (_fileCache[table]) return _fileCache[table];
  try {
    const res = await fetch(getUrl(table), { headers: getHeaders() });
    if (!res.ok) {
      if (res.status === 404) {
        _fileCache[table] = [];
        _shaCache[table] = null;
        return [];
      }
      throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    _shaCache[table] = data.sha;
    const decoded = JSON.parse(atob(data.content));
    _fileCache[table] = decoded;
    return decoded;
  } catch (e) {
    console.error(`Error fetching ${table}:`, e.message);
    _fileCache[table] = [];
    return [];
  }
}

async function saveFile(table) {
  const content = _fileCache[table];
  if (!content) return;
  const encoded = btoa(JSON.stringify(content, null, 2));
  const body = {
    message: `Update ${table} [Supremas]`,
    content: encoded,
  };
  if (_shaCache[table]) body.sha = _shaCache[table];
  try {
    const res = await fetch(getUrl(table), {
      method: 'PUT',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(`GitHub API error: ${res.status} ${err.message}`);
    }
    const data = await res.json();
    _shaCache[table] = data.content.sha;
  } catch (e) {
    console.error(`Error saving ${table}:`, e.message);
  }
}

let writeQueue = {};
let writeTimer = null;

function scheduleSave(table) {
  writeQueue[table] = true;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    const tables = Object.keys(writeQueue);
    writeQueue = {};
    for (const t of tables) {
      await saveFile(t);
    }
  }, 500);
}

export async function getAll(table) {
  return await fetchFile(table);
}

export async function getById(table, id) {
  const rows = await fetchFile(table);
  return rows.find(r => r.id === id) || null;
}

export async function insert(table, record) {
  const rows = await fetchFile(table);
  const maxId = rows.reduce((max, r) => Math.max(max, r.id || 0), 0);
  const newRecord = { id: maxId + 1, ...record };
  rows.push(newRecord);
  scheduleSave(table);
  return newRecord;
}

export async function update(table, id, changes) {
  const rows = await fetchFile(table);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...changes };
  scheduleSave(table);
  return rows[idx];
}

export async function remove(table, id) {
  const rows = await fetchFile(table);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return false;
  rows.splice(idx, 1);
  scheduleSave(table);
  return true;
}

export async function saveTable(table, data) {
  _fileCache[table] = data;
  await saveFile(table);
}
