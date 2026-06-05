import React, { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api/zones';

export default function ZonesPanel() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const timers = useRef({});

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch(API);
      setZones(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

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
      } catch (err) { console.error(err); }
    }, 500);
  }, [zones]);

  const add = useCallback(async () => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neighborhood: 'Nuevo Barrio', deliverer: 'REPARTIDOR' })
    });
      const data = await res.json();
      setZones(prev => [...prev, data]);
  }, []);

  const remove = useCallback(async (id) => {
    if (!confirm('Eliminar zona de reparto?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setZones(prev => prev.filter(z => z.id !== id));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#6b6d7b' }}>{zones.length} zonas de reparto</span>
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
            {zones.map((zone, idx) => (
              <tr key={zone.id}>
                <td style={{ color: '#6b6d7b', fontSize: 12 }}>{idx + 1}</td>
                <td>
                  <InlineEdit
                    value={zone.neighborhood}
                    onSave={v => save(zone.id, 'neighborhood', v)}
                  />
                </td>
                <td>
                  <select
                    defaultValue={zone.deliverer}
                    onChange={e => save(zone.id, 'deliverer', e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="CARLOS">CARLOS</option>
                    <option value="MATI">MATI</option>
                  </select>
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

function InlineEdit({ value, onSave }) {
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
      />
    );
  }
  return <span onClick={() => setEditing(true)} style={{ cursor: 'pointer', minHeight: 20, display: 'block' }}>{value || '—'}</span>;
}
