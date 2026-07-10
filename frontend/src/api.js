import { isGitHubMode, getAll as ghGetAll, getById as ghGetById, insert as ghInsert, update as ghUpdate, remove as ghRemove } from './github-api';

const API_BASE = import.meta.env.VITE_API_URL || '';

function api(path, options) {
  return fetch(`${API_BASE}${path}`, options).then(r => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  });
}

export { API_BASE };

// Generic table CRUD
export async function tableGetAll(table) {
  if (isGitHubMode()) return await ghGetAll(table);
  return api(`/api/${table}`);
}

export async function tableGetById(table, id) {
  if (isGitHubMode()) return await ghGetById(table, id);
  return api(`/api/${table}/${id}`);
}

export async function tableInsert(table, data) {
  if (isGitHubMode()) return await ghInsert(table, data);
  return api(`/api/${table}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function tableUpdate(table, id, data) {
  if (isGitHubMode()) return await ghUpdate(table, id, data);
  return api(`/api/${table}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function tableDelete(table, id) {
  if (isGitHubMode()) return await ghRemove(table, id);
  return api(`/api/${table}/${id}`, { method: 'DELETE' });
}

// Specific API calls
export async function getProducts(listType) {
  if (isGitHubMode()) return await ghGetAll('products');
  const q = listType ? `?list_type=${encodeURIComponent(listType)}` : '';
  return api(`/api/products${q}`);
}

export async function getProductsAll() {
  if (isGitHubMode()) return await ghGetAll('products');
  return api('/api/products');
}

export async function updateProductPrice(productId, priceListId, price) {
  if (isGitHubMode()) return null;
  return api(`/api/products/${productId}/price`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceListId, price: Number(price) || 0 })
  });
}

export async function createProduct(data) {
  if (isGitHubMode()) return await ghInsert('products', data);
  return api('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function updateProduct(id, data) {
  if (isGitHubMode()) return await ghUpdate('products', id, data);
  return api(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function deleteProduct(id) {
  if (isGitHubMode()) return await ghRemove('products', id);
  return api(`/api/products/${id}`, { method: 'DELETE' });
}

// Orders
export async function getOrders(params) {
  if (isGitHubMode()) {
    const all = await ghGetAll('orders');
    return { orders: all.reverse(), total: all.length };
  }
  const q = new URLSearchParams(params || {}).toString();
  return api(`/api/orders?${q}`);
}

export async function getOrder(id) {
  if (isGitHubMode()) return await ghGetById('orders', Number(id));
  return api(`/api/orders/${id}`);
}

export async function createOrder(data) {
  if (isGitHubMode()) return await ghInsert('orders', data);
  return api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function updateOrder(id, data) {
  if (isGitHubMode()) return await ghUpdate('orders', Number(id), data);
  return api(`/api/orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export async function deleteOrder(id) {
  if (isGitHubMode()) return await ghRemove('orders', Number(id));
  return api(`/api/orders/${id}`, { method: 'DELETE' });
}

// Excel (local only)
export async function excelExport() {
  if (isGitHubMode()) { alert('Excel export solo disponible localmente'); return; }
  return api('/api/excel/export', { method: 'POST' });
}

export async function excelImport() {
  if (isGitHubMode()) { alert('Excel import solo disponible localmente'); return; }
  return api('/api/excel/import', { method: 'POST' });
}

// Seed (local only)
export async function seedData() {
  if (isGitHubMode()) { alert('Seed solo disponible localmente'); return; }
  return api('/api/seed', { method: 'POST' });
}

// Settings
export async function getSettings() {
  if (isGitHubMode()) {
    const rows = await ghGetAll('settings');
    const obj = {};
    for (const r of rows) obj[r.key] = r.value;
    return obj;
  }
  return api('/api/settings');
}

export async function saveSetting(key, value) {
  if (isGitHubMode()) {
    const rows = await ghGetAll('settings');
    const existing = rows.find(r => r.key === key);
    if (existing) {
      return await ghUpdate('settings', existing.id, { value });
    }
    return await ghInsert('settings', { key, value });
  }
  return api(`/api/settings/${encodeURIComponent(key)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
}

// Categories
export { tableGetAll as getCategories };
export { tableInsert as createCategory };
export { tableUpdate as updateCategory };
export { tableDelete as deleteCategory };

// Customers
export { tableGetAll as getCustomers };
export { tableInsert as createCustomer };
export { tableUpdate as updateCustomer };
export { tableDelete as deleteCustomer };
