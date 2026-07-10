import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InlineEdit, useToast } from './shared';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/repartidores`;

export default function RepartidoresPanel() {
  const [repartidores, setRepartidores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const timers = useRef({});
  const toast = useToast();

  const fetchRepartidores = useCallback(async () => {
    try {
      const res = await fetch(API);
      setRepartidores(await res.json());
    } catch {
      toast.error('Error al cargar repartidores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRepartidores(); }, [fetchRepartidores]);

  const save = useCallback((id, field, value) => {
    if (timers.current[`${id}-${field}`]) clearTimeout(timers.current[`${id}-${field}`]);
    timers.current[`${id}-${field}`] = setTimeout(async () => {
      const rep = repartidores.find(r => r.id === id);
      if (!rep) return;
      try {
        const res = await fetch(`${API}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...rep, [field]: value })
        });
        const updated = await res.json();
        setRepartidores(prev => prev.map(r => r.id === id ? updated : r));
      } catch { toast.error('Error al guardar'); }
    }, 500);
  }, [repartidores]);

  const toggleActive = useCallback(async (id, current) => {
    const rep = repartidores.find(r => r.id === id);
    if (!rep) return;
    try {
      const res = await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rep, active: current ? 0 : 1 })
      });
      const updated = await res.json();
      setRepartidores(prev => prev.map(r => r.id === id ? updated : r));
      toast.success(current ? 'Repartidor desactivado' : 'Repartidor activado');
    } catch { toast.error('Error al actualizar'); }
  }, [repartidores]);

  const add = useCallback(async () => {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nuevo Repartidor', phone: '', vehicle: '' })
      });
      const data = await res.json();
      setRepartidores(prev => [...prev, data]);
      toast.success('Repartidor creado');
    } catch { toast.error('Error al crear'); }
  }, []);

  const remove = useCallback(async (id) => {
    if (!confirm('¿Eliminar repartidor?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setRepartidores(prev => prev.filter(r => r.id !== id));
      toast.success('Repartidor eliminado');
    } catch { toast.error('Error al eliminar'); }
  }, []);

  const filtered = repartidores.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.phone && r.phone.includes(search)) ||
    (r.vehicle && r.vehicle.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <input
          placeholder="Buscar por nombre, teléfono, vehículo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <span style={{ fontSize: 12, color: '#6b6d7b', whiteSpace: 'nowrap' }}>{filtered.length} / {repartidores.length} repartidores</span>
        <button className="btn-primary" onClick={add}>+ Nuevo Repartidor</button>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Nombre</th>
              <th style={{ width: 140 }}>Teléfono</th>
              <th style={{ width: 120 }}>Vehículo</th>
              <th style={{ width: 60 }}>Activo</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={r.id} style={{ opacity: r.active ? 1 : 0.4 }}>
                <td style={{ color: '#6b6d7b', fontSize: 12 }}>{idx + 1}</td>
                <td>
                  <InlineEdit value={r.name} onSave={v => save(r.id, 'name', v)} />
                </td>
                <td>
                  <InlineEdit value={r.phone || ''} onSave={v => save(r.id, 'phone', v)} placeholder="Teléfono" />
                </td>
                <td>
                  <InlineEdit value={r.vehicle || ''} onSave={v => save(r.id, 'vehicle', v)} placeholder="Vehículo" />
                </td>
                <td>
                  <span
                    onClick={() => toggleActive(r.id, r.active)}
                    style={{ cursor: 'pointer', fontSize: 14, userSelect: 'none' }}
                    title={r.active ? 'Desactivar' : 'Activar'}
                  >
                    {r.active ? '✅' : '⭕'}
                  </span>
                </td>
                <td>
                  <button className="btn-danger btn-sm" onClick={() => remove(r.id)}>✕</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#6b6d7b' }}>Sin repartidores</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
