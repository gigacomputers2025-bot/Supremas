import React, { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api/channels';

export default function ChannelsPanel() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const timers = useRef({});

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(API);
      setChannels(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  const save = useCallback((id, value) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      try {
        await fetch(`${API}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: value })
        });
      } catch (err) { console.error(err); }
    }, 500);
  }, []);

  const add = useCallback(async () => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nuevo Canal' })
    });
    const data = await res.json();
    setChannels(prev => [...prev, data]);
  }, []);

  const remove = useCallback(async (id) => {
    if (!confirm('Eliminar canal de venta?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setChannels(prev => prev.filter(c => c.id !== id));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#6b6d7b' }}>{channels.length} canales</span>
        <button className="btn-primary" onClick={add}>+ Nuevo</button>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: 60 }}>#</th>
            <th>Nombre del Canal</th>
            <th style={{ width: 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {channels.map((ch, idx) => (
            <tr key={ch.id}>
              <td style={{ color: '#6b6d7b', fontSize: 12 }}>{idx + 1}</td>
              <td>
                <InlineEdit
                  value={ch.name}
                  onSave={v => save(ch.id, v)}
                />
              </td>
              <td>
                <button className="btn-danger btn-sm" onClick={() => remove(ch.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
        onKeyDown={e => { if (e.key === 'Enter') onSave(val), setEditing(false); if (e.key === 'Escape') { setVal(value || ''); setEditing(false); } }}
        autoFocus
      />
    );
  }
  return <span onClick={() => setEditing(true)} style={{ cursor: 'pointer', minHeight: 20, display: 'block' }}>{value || '—'}</span>;
}
