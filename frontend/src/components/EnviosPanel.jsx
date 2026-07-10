import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function EnviosPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/envios`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.dates.length > 0) setSelectedDate(d.dates[d.dates.length - 1]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando envíos...</div>;
  if (!data || data.dates.length === 0) return <div style={{ padding: 20, color: '#6b6d7b' }}>Sin envíos programados</div>;

  const currentDate = selectedDate || data.dates[data.dates.length - 1];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
        <h2 style={{ fontSize: 16, color: '#e0e1e6', display: 'flex', alignItems: 'center', gap: 8 }}>
          Mercadería por Repartidor
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>Fecha:</label>
          <select value={currentDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: 140 }}>
            {data.dates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {data.deliverers.map(deliverer => {
        const items = data.data[currentDate]?.[deliverer] || [];
        if (items.length === 0) return null;
        const totalItems = items.reduce((s, i) => s + i.count, 0);
        return (
          <div key={deliverer} className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, color: '#e8e9ed', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              {deliverer === 'SIN ASIGNAR' ? '❓' : '🚚'} {deliverer}
              <span style={{ fontSize: 11, color: '#6b6d7b', fontWeight: 400 }}>{totalItems} unidades</span>
            </h3>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Producto</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {items.sort((a, b) => b.count - a.count).map((item, idx) => (
                  <tr key={item.product}>
                    <td style={{ color: '#6b6d7b', fontSize: 11 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{item.product}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, fontSize: 14 }}>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {data.deliverers.every(d => (data.data[currentDate]?.[d] || []).length === 0) && (
        <div style={{ padding: 20, color: '#6b6d7b', textAlign: 'center' }}>Sin mercadería para esta fecha</div>
      )}
    </div>
  );
}
