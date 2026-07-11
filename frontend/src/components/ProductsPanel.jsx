import React, { useState, useEffect, useCallback } from 'react';
import { InlineEdit, useToast } from './shared';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/products`;

export default function ProductsPanel() {
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listType, setListType] = useState('Minorista');
  const [priceLabels, setPriceLabels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      const [data, all] = await Promise.all([
        fetch(`${API}?list_type=${listType}`).then(r => r.json()),
        fetch(API).then(r => r.json())
      ]);
      if (data.length > 0) {
        setPriceLabels(data[0].prices.map(p => p.label));
      }
      setProducts(data);
      setAllProducts(all);
    } catch (err) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [listType]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateProduct = useCallback(async (id, field, value) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const updated = { ...product, [field]: value };
    try {
      await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      toast.error('Error al actualizar producto');
    }
  }, [products]);

  const handleSavePrice = useCallback(async (productId, priceListId, value) => {
    try {
      await fetch(`${API}/${productId}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceListId, price: Number(value) || 0 })
      });
    } catch { toast.error('Error al guardar precio'); }
  }, []);

  const deleteProduct = useCallback(async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Producto eliminado');
    } catch { toast.error('Error al eliminar'); }
  }, []);

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    (p.sigla && p.sigla.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando productos...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap' }}>Lista:</label>
          <select value={listType} onChange={e => setListType(e.target.value)} style={{ width: 140 }}>
            <option value="Minorista">Minorista</option>
            <option value="Mayorista">Mayorista</option>
          </select>
        </div>
        <input
          placeholder="Buscar por nombre, categoría o sigla..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <span style={{ fontSize: 12, color: '#6b6d7b', whiteSpace: 'nowrap' }}>{filtered.length} / {products.length} productos</span>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Producto</button>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}>
        <table style={{ minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th style={{ width: 20 }}></th>
              <th style={{ width: 90 }}>Categoría</th>
              <th style={{ width: 180 }}>Producto</th>
              <th style={{ width: 90 }}>Sigla</th>
              {priceLabels.map((label, i) => (
                <th key={i} style={{ width: 100 }}>{label} <span style={{ fontWeight: 400, fontSize: 9, color: '#6b6d7b', display: 'block' }}>ver Lista Precios</span></th>
              ))}
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product, idx) => (
              <tr key={product.id}>
                <td style={{ fontSize: 11, color: '#6b6d7b' }}>{idx + 1}</td>
                <td style={{ fontSize: 13 }}>{product.is_combo ? '📦' : ''}</td>
                <td>
                  <InlineEdit value={product.category} onSave={v => updateProduct(product.id, 'category', v)} />
                </td>
                <td>
                  <InlineEdit value={product.name} onSave={v => updateProduct(product.id, 'name', v)} />
                </td>
                <td>
                  <InlineEdit value={product.sigla} onSave={v => updateProduct(product.id, 'sigla', v)} />
                </td>
                {priceLabels.map((label, i) => {
                  const priceItem = product.prices && product.prices[i];
                  return (
                    <td key={i}>
                      {priceItem ? (
                        <InlineEdit value={String(priceItem.price)} onSave={v => handleSavePrice(product.id, priceItem.id, v)} style={{ textAlign: 'right' }} />
                      ) : (
                        <span style={{ color: '#3a3c48' }}>—</span>
                      )}
                    </td>
                  );
                })}
                <td>
                  <button className="btn-danger btn-sm" onClick={() => deleteProduct(product.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ProductForm
          allProducts={allProducts}
          priceLabels={priceLabels}
          listType={listType}
          onClose={() => { setShowForm(false); fetchProducts(); }}
        />
      )}
    </div>
  );
}

function ProductForm({ allProducts, priceLabels, listType, onClose }) {
  const [form, setForm] = useState({
    list_type: listType,
    category: '',
    name: '',
    sigla: '',
    is_combo: false,
    prices: priceLabels.map(label => ({ label, price: 0 })),
    combo_items: []
  });
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const addComboItem = (productId) => {
    if (form.combo_items.find(i => i.product_id === productId)) return;
    setForm(prev => ({
      ...prev,
      combo_items: [...prev.combo_items, { product_id: productId, quantity: 1 }]
    }));
  };

  const removeComboItem = (productId) => {
    setForm(prev => ({
      ...prev,
      combo_items: prev.combo_items.filter(i => i.product_id !== productId)
    }));
  };

  const updateComboQty = (productId, quantity) => {
    setForm(prev => ({
      ...prev,
      combo_items: prev.combo_items.map(i =>
        i.product_id === productId ? { ...i, quantity: Math.max(1, Number(quantity) || 1) } : i
      )
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      toast.success('Producto creado');
      onClose();
    } catch (err) {
      toast.error('Error al crear producto');
    }
  };

  const filteredProducts = allProducts.filter(
    p => !p.is_combo && p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputStyle = { width: '100%', padding: '6px 8px' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#121318', borderRadius: 10, padding: 24, maxWidth: 600, width: '90%', border: '1px solid #1e2029', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: '#e8e9ed' }}>Nuevo Producto</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Lista</label>
              <select style={inputStyle} value={form.list_type} onChange={e => set('list_type', e.target.value)}>
                <option value="Minorista">Minorista</option>
                <option value="Mayorista">Mayorista</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Categoría</label>
              <input style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Nombre *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Sigla</label>
              <input style={inputStyle} value={form.sigla} onChange={e => set('sigla', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#e8e9ed' }}>
                <input type="checkbox" checked={form.is_combo} onChange={e => set('is_combo', e.target.checked)} />
                Es un Combo
              </label>
            </div>
          </div>

          {form.is_combo && (
            <div style={{ marginBottom: 16, padding: 12, background: '#0c0d11', borderRadius: 8, border: '1px solid #1e2029' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 8 }}>Productos del Combo</label>
              <input
                placeholder="Buscar producto para agregar..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', marginBottom: 8 }}
              />
              <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 8 }}>
                {filteredProducts.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 4px', cursor: 'pointer', borderRadius: 4 }}
                    onClick={() => addComboItem(p.id)}
                  >
                    <span style={{ fontSize: 13, color: '#e8e9ed' }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: '#3b82f6' }}>+Agregar</span>
                  </div>
                ))}
                {filteredProducts.length === 0 && <span style={{ fontSize: 12, color: '#6b6d7b' }}>Sin resultados</span>}
              </div>

              {form.combo_items.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Seleccionados:</label>
                  {form.combo_items.map(item => {
                    const prod = allProducts.find(p => p.id === item.product_id);
                    return (
                      <div key={item.product_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <span style={{ flex: 1, fontSize: 13, color: '#e8e9ed' }}>{prod ? prod.name : '?'}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Cant:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => updateComboQty(item.product_id, e.target.value)}
                          style={{ width: 60, padding: '3px 6px', textAlign: 'center' }}
                        />
                        <button type="button" className="btn-danger btn-sm" onClick={() => removeComboItem(item.product_id)}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Precios</label>
            {form.prices.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 120, fontSize: 13, color: '#e8e9ed' }}>{p.label}</span>
                <input
                  type="number"
                  step="0.01"
                  value={p.price}
                  onChange={e => {
                    const newPrices = [...form.prices];
                    newPrices[i] = { ...newPrices[i], price: Number(e.target.value) || 0 };
                    set('prices', newPrices);
                  }}
                  style={{ flex: 1, padding: '4px 8px', textAlign: 'right' }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ background: '#2a2c38', color: '#9ca3af', padding: '8px 20px' }}>Cancelar</button>
            <button type="submit" className="btn-success" style={{ padding: '8px 20px' }}>Crear Producto</button>
          </div>
        </form>
      </div>
    </div>
  );
}
