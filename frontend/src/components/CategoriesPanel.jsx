import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InlineEdit, useToast } from './shared';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/categories`;

export default function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const timers = useRef({});
  const toast = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(API);
      setCategories(await res.json());
    } catch (err) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const save = useCallback((id, value) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      try {
        await fetch(`${API}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: value })
        });
      } catch (err) {
        toast.error('Error al guardar');
      }
    }, 500);
  }, []);

  const add = useCallback(async () => {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nueva Categoría' })
      });
      const data = await res.json();
      setCategories(prev => [...prev, data]);
      toast.success('Categoría creada');
    } catch { toast.error('Error al crear'); }
  }, []);

  const remove = useCallback(async (id) => {
    if (!confirm('¿Eliminar categoría?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Categoría eliminada');
    } catch { toast.error('Error al eliminar'); }
  }, []);

  const filtered = categories.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <input
          placeholder="Buscar categoría..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <span style={{ fontSize: 12, color: '#6b6d7b', whiteSpace: 'nowrap' }}>{filtered.length} / {categories.length} categorías</span>
        <button className="btn-primary" onClick={add}>+ Nueva</button>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: 60 }}>#</th>
            <th>Nombre de la Categoría</th>
            <th style={{ width: 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((cat, idx) => (
            <tr key={cat.id}>
              <td style={{ color: '#6b6d7b', fontSize: 12 }}>{idx + 1}</td>
              <td>
                <InlineEdit value={cat.name} onSave={v => save(cat.id, v)} />
              </td>
              <td>
                <button className="btn-danger btn-sm" onClick={() => remove(cat.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
