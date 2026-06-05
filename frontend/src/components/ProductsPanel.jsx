import React, { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api/products';

export default function ProductsPanel() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listType, setListType] = useState('Minorista');
  const [priceLabels, setPriceLabels] = useState([]);
  const saveTimers = useRef({});

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch(`${API}?list_type=${listType}`);
      const data = await res.json();
      if (data.length > 0) {
        setPriceLabels(data[0].prices.map(p => p.label));
      }
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [listType]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const savePrice = useCallback((productId, priceListId, price) => {
    if (saveTimers.current[`${productId}-${priceListId}`]) {
      clearTimeout(saveTimers.current[`${productId}-${priceListId}`]);
    }
    saveTimers.current[`${productId}-${priceListId}`] = setTimeout(async () => {
      try {
        await fetch(`${API}/${productId}/price`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceListId, price: Number(price) || 0 })
        });
      } catch (err) {
        console.error('Error saving price:', err);
      }
    }, 600);
  }, []);

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
      console.error('Error updating product:', err);
    }
  }, [products]);

  const deleteProduct = useCallback(async (id) => {
    if (!confirm('Eliminar este producto?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const addProduct = useCallback(async () => {
    const newProduct = {
      list_type: listType,
      category: 'NUEVA',
      name: 'Nuevo Producto',
      sigla: '',
      prices: priceLabels.map(label => ({ label, price: 0 }))
    };
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });
    const saved = await res.json();
    setProducts(prev => [...prev, saved]);
  }, [listType, priceLabels]);

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando productos...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: '#9ca3af' }}>Lista:</label>
          <select value={listType} onChange={e => setListType(e.target.value)} style={{ width: 160 }}>
            <option value="Minorista">Minorista</option>
            <option value="Mayorista">Mayorista</option>
          </select>
          <span style={{ fontSize: 12, color: '#6b6d7b', marginLeft: 8 }}>{products.length} productos</span>
        </div>
        <button className="btn-primary" onClick={addProduct}>+ Nuevo Producto</button>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '65vh', overflowY: 'auto' }}>
        <table style={{ minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th style={{ width: 90 }}>Categoría</th>
              <th style={{ width: 180 }}>Producto</th>
              <th style={{ width: 90 }}>Sigla</th>
              {priceLabels.map((label, i) => (
                <th key={i} style={{ width: 100 }}>{label}</th>
              ))}
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => (
              <tr key={product.id}>
                <td style={{ fontSize: 11, color: '#6b6d7b' }}>{idx + 1}</td>
                <td>
                  <EditableCell
                    value={product.category}
                    onSave={v => updateProduct(product.id, 'category', v)}
                  />
                </td>
                <td>
                  <EditableCell
                    value={product.name}
                    onSave={v => updateProduct(product.id, 'name', v)}
                  />
                </td>
                <td>
                  <EditableCell
                    value={product.sigla}
                    onSave={v => updateProduct(product.id, 'sigla', v)}
                  />
                </td>
                {priceLabels.map((label, i) => {
                  const priceItem = product.prices && product.prices[i];
                  return (
                    <td key={i}>
                      {priceItem ? (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={priceItem.price || 0}
                          onBlur={e => savePrice(product.id, priceItem.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                          style={{ width: '100%', textAlign: 'right' }}
                        />
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
    </div>
  );
}

function EditableCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  useEffect(() => setVal(value || ''), [value]);

  if (editing) {
    return (
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { onSave(val); setEditing(false); }}
        onKeyDown={e => { if (e.key === 'Enter') { onSave(val); setEditing(false); } if (e.key === 'Escape') { setVal(value || ''); setEditing(false); } }}
        autoFocus
        style={{ width: '100%' }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{ cursor: 'pointer', display: 'block', minHeight: 20, padding: '2px 0' }}
      title="Click para editar"
    >
      {value || <span style={{ color: '#3a3c48' }}>—</span>}
    </span>
  );
}
