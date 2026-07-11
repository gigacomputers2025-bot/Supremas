const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const IS_GITHUB_MODE = !!import.meta.env.VITE_GITHUB_MODE;
const OWNER = 'gigacomputers2025-bot';
const REPO = 'Supremas';
const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data`;

let cache = {};
let shaCache = {};

function headers() {
  return { 'Authorization': `Bearer ${TOKEN}`, 'Accept': 'application/vnd.github+json' };
}

async function fetchFile(table) {
  if (cache[table]) return cache[table];
  try {
    const res = await fetch(`${BASE_URL}/${table}.json`, { headers: headers() });
    if (res.status === 404) { cache[table] = []; return []; }
    if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
    const data = await res.json();
    shaCache[table] = data.sha;
    const bytes = Uint8Array.from(atob(data.content), c => c.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    cache[table] = decoded;
    return decoded;
  } catch (e) {
    console.error(`Error fetching ${table}:`, e.message);
    cache[table] = [];
    return [];
  }
}

async function saveFile(table) {
  const content = cache[table];
  if (!content) return;
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
  const body = { message: `Update ${table} [Supremas web]`, content: encoded };
  if (shaCache[table]) body.sha = shaCache[table];
  try {
    const res = await fetch(`${BASE_URL}/${table}.json`, {
      method: 'PUT',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
    const data = await res.json();
    shaCache[table] = data.content.sha;
  } catch (e) { console.error(`Error saving ${table}:`, e.message); }
}

export function isGitHubMode() { return IS_GITHUB_MODE; }

export async function getAll(table) { return await fetchFile(table); }

export async function getById(table, id) {
  const rows = await fetchFile(table);
  return rows.find(r => r.id === id) || null;
}

export async function insert(table, record) {
  const rows = await fetchFile(table);
  const maxId = rows.reduce((m, r) => Math.max(m, r.id || 0), 0);
  const newRecord = { id: maxId + 1, ...record };
  rows.push(newRecord);
  await saveFile(table);
  return newRecord;
}

export async function update(table, id, changes) {
  const rows = await fetchFile(table);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...changes };
  await saveFile(table);
  return rows[idx];
}

export async function remove(table, id) {
  const rows = await fetchFile(table);
  const idx = rows.findIndex(r => r.id === id);
  if (idx === -1) return false;
  rows.splice(idx, 1);
  await saveFile(table);
  return true;
}
