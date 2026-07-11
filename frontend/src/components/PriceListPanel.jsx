import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './shared';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/products`;
const LABELS_API = `${API_BASE}/api/price-lists`;

export default function PriceListPanel() {
  const [allProducts, setAllProducts] = useState([]);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('Todas');
  const [search, setSearch] = useState('');
  const [showManage, setShowManage] = useState(false);
  const timers = useRef({});
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const [prodRes, labelsRes] = await Promise.all([
        fetch(API),
        fetch(LABELS_API)
      ]);
      setAllProducts(await prodRes.json());
      setLabels(await labelsRes.json());
    } catch (err) {
      toast.error('Error al cargar lista de precios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const labelNames = labels.map(l => l.name);

  const filtered = allProducts.filter(p => {
    if (filterType !== 'Todas' && p.list_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q) && !(p.sigla || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const savePrice = useCallback((productId, priceListId, price) => {
    const key = `${productId}-${priceListId}`;
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      try {
        await fetch(`${API}/${productId}/price`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceListId, price: Number(price) || 0 })
        });
      } catch (err) {
        toast.error('Error al guardar precio');
      }
    }, 600);
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando lista de precios...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap' }}>Lista:</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 140 }}>
            <option value="Todas">Todas</option>
            <option value="Minorista">Minorista</option>
            <option value="Mayorista">Mayorista</option>
          </select>
        </div>
        <input
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <span style={{ fontSize: 12, color: '#6b6d7b', whiteSpace: 'nowrap' }}>{filtered.length} productos</span>
        <button className="btn-primary" onClick={() => setShowManage(true)}>Gestionar Listas</button>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
        <table style={{ minWidth: 600 }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th style={{ width: 80 }}>Lista</th>
              <th style={{ width: 90 }}>Categoría</th>
              <th style={{ width: 180 }}>Producto</th>
              {labelNames.map((name, i) => (
                <th key={i} style={{ minWidth: 110 }}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((product, idx) => (
              <tr key={product.id}>
                <td style={{ fontSize: 11, color: '#6b6d7b' }}>{idx + 1}</td>
                <td style={{ fontSize: 12, color: '#9ca3af' }}>{product.list_type}</td>
                <td style={{ fontSize: 13 }}>{product.category}</td>
                <td style={{ fontWeight: 500 }}>{product.name}{product.is_combo ? ' 📦' : ''}</td>
                {labelNames.map((name, ci) => {
                  const pl = (product.prices || []).find(p => p.label === name);
                  const prev = ci > 0 ? (product.prices || []).find(p => p.label === labelNames[ci - 1]) : null;
                  let variation = null;
                  if (pl && prev && prev.price !== 0) {
                    variation = ((pl.price - prev.price) / prev.price) * 100;
                  }
                  return (
                    <td key={name} style={{ verticalAlign: 'top' }}>
                      {pl ? (
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={pl.price || 0}
                            onBlur={e => savePrice(product.id, pl.id, e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                            style={{ width: '100%', textAlign: 'right' }}
                          />
                          {variation !== null && (
                            <div style={{
                              fontSize: 10,
                              textAlign: 'right',
                              paddingRight: 2,
                              marginTop: 1,
                              color: variation > 0 ? '#ef4444' : variation < 0 ? '#22c55e' : '#6b6d7b'
                            }}>
                              {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#3a3c48' }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={4 + labelNames.length} style={{ textAlign: 'center', padding: 30, color: '#6b6d7b' }}>Sin productos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showManage && (
        <ManageLabels
          labels={labels}
          onClose={() => { setShowManage(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

function ManageLabels({ labels, onClose }) {
  const [list, setList] = useState(labels);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const toast = useToast();

  const add = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch(LABELS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      });
      const data = await res.json();
      setList(prev => [...prev, data]);
      setNewName('');
      toast.success('Lista de precios creada');
    } catch (err) { toast.error('Error al crear'); }
  };

  const rename = async (id) => {
    if (!editName.trim()) return;
    try {
      await fetch(`${LABELS_API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      });
      setList(prev => prev.map(l => l.id === id ? { ...l, name: editName.trim() } : l));
      setEditingId(null);
      setEditName('');
      toast.success('Lista renombrada');
    } catch (err) { toast.error('Error al renombrar'); }
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar esta lista de precios? Se quitará la columna de todos los productos.')) return;
    try {
      await fetch(`${LABELS_API}/${id}`, { method: 'DELETE' });
      setList(prev => prev.filter(l => l.id !== id));
      toast.success('Lista eliminada');
    } catch (err) { toast.error('Error al eliminar'); }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#121318', borderRadius: 10, padding: 24, maxWidth: 500, width: '90%', border: '1px solid #1e2029', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: '#e8e9ed' }}>Gestionar Listas de Precios</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            placeholder="Nombre de la nueva lista..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); }}
            style={{ flex: 1, padding: '6px 8px' }}
          />
          <button className="btn-primary" onClick={add}>+ Agregar</button>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Nombre</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((l, idx) => (
              <tr key={l.id}>
                <td style={{ color: '#6b6d7b', fontSize: 12 }}>{idx + 1}</td>
                <td>
                  {editingId === l.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') rename(l.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                        style={{ flex: 1, padding: '3px 6px' }}
                      />
                      <button className="btn-primary btn-sm" onClick={() => rename(l.id)}>OK</button>
                    </div>
                  ) : (
                    <span
                      onClick={() => { setEditingId(l.id); setEditName(l.name); }}
                      style={{ cursor: 'pointer', display: 'block', minHeight: 20, padding: '2px 0' }}
                    >
                      {l.name}
                    </span>
                  )}
                </td>
                <td>
                  <button className="btn-danger btn-sm" onClick={() => remove(l.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={{ background: '#2a2c38', color: '#9ca3af', padding: '8px 20px' }}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
