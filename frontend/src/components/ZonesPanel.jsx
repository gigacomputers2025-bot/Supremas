import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InlineEdit, EditableSelect, useToast } from './shared';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/zones`;
const REP_API = `${API_BASE}/api/repartidores`;

export default function ZonesPanel() {
  const [zones, setZones] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const timers = useRef({});
  const toast = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const [z, r] = await Promise.all([
        fetch(API).then(r => r.json()),
        fetch(REP_API).then(r => r.json()),
      ]);
      setZones(z);
      setRepartidores(r);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const repartidorOptions = repartidores.map(r => r.name);

  const save = useCallback((id, field, value) => {
    if (timers.current[`${id}-${field}`]) clearTimeout(timers.current[`${id}-${field}`]);
    timers.current[`${id}-${field}`] = setTimeout(async () => {
      const zone = zones.find(z => z.id === id);
      if (!zone) return;
      try {
        await fetch(`${API}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...zone, [field]: value })
        });
      } catch { toast.error('Error al guardar'); }
    }, 500);
  }, [zones]);

  const add = useCallback(async () => {
    try {
      const defaultDel = repartidorOptions[0] || 'REPARTIDOR';
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ neighborhood: 'Nuevo Barrio', deliverer: defaultDel })
      });
      const data = await res.json();
      setZones(prev => [...prev, data]);
      toast.success('Zona creada');
    } catch { toast.error('Error al crear'); }
  }, [repartidorOptions]);

  const remove = useCallback(async (id) => {
    if (!confirm('¿Eliminar zona de reparto?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setZones(prev => prev.filter(z => z.id !== id));
      toast.success('Zona eliminada');
    } catch { toast.error('Error al eliminar'); }
  }, []);

  const filtered = zones.filter(z =>
    !search ||
    z.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
    z.deliverer.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <input
          placeholder="Buscar por barrio o repartidor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <span style={{ fontSize: 12, color: '#6b6d7b', whiteSpace: 'nowrap' }}>{filtered.length} / {zones.length} zonas</span>
        <button className="btn-primary" onClick={add}>+ Nueva Zona</button>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Barrio</th>
              <th style={{ width: 140 }}>Repartidor</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((zone, idx) => (
              <tr key={zone.id}>
                <td style={{ color: '#6b6d7b', fontSize: 12 }}>{idx + 1}</td>
                <td>
                  <InlineEdit value={zone.neighborhood} onSave={v => save(zone.id, 'neighborhood', v)} />
                </td>
                <td>
                  <EditableSelect
                    value={zone.deliverer}
                    options={repartidorOptions}
                    onChange={v => save(zone.id, 'deliverer', v)}
                  />
                </td>
                <td>
                  <button className="btn-danger btn-sm" onClick={() => remove(zone.id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
