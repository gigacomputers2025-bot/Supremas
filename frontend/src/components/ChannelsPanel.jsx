import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InlineEdit, useToast } from './shared';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/channels`;

export default function ChannelsPanel() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const timers = useRef({});
  const toast = useToast();

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch(API);
      setChannels(await res.json());
    } catch (err) {
      toast.error('Error al cargar canales');
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
        body: JSON.stringify({ name: 'Nuevo Canal' })
      });
      const data = await res.json();
      setChannels(prev => [...prev, data]);
      toast.success('Canal creado');
    } catch { toast.error('Error al crear'); }
  }, []);

  const remove = useCallback(async (id) => {
    if (!confirm('¿Eliminar canal de venta?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setChannels(prev => prev.filter(c => c.id !== id));
      toast.success('Canal eliminado');
    } catch { toast.error('Error al eliminar'); }
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
                <InlineEdit value={ch.name} onSave={v => save(ch.id, v)} />
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
