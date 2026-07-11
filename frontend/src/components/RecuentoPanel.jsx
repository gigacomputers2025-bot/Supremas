import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function RecuentoPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/recuento`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando...</div>;
  if (!data) return <div style={{ padding: 20, color: '#f87171' }}>Error al cargar datos</div>;
  if (data.dates.length === 0) return <div style={{ padding: 20, color: '#6b6d7b' }}>No hay entregas próximas</div>;

  const totalPorProducto = {};
  for (const day of data.data) {
    for (const item of day.items) {
      totalPorProducto[item.product] = (totalPorProducto[item.product] || 0) + item.count;
    }
  }
  const productosOrdenados = [...data.products].sort((a, b) => (totalPorProducto[b] || 0) - (totalPorProducto[a] || 0));

  return (
    <div>
      <h2 style={{ fontSize: 16, color: '#e0e1e6', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        Productos Necesarios para Próximas Entregas
      </h2>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th style={{ minWidth: 200 }}>Producto</th>
              {data.dates.map(d => (
                <th key={d} style={{ minWidth: 60, textAlign: 'center' }}>
                  {d.slice(5)}
                </th>
              ))}
              <th style={{ minWidth: 60, textAlign: 'center', color: '#f59e0b' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {productosOrdenados.map((product, idx) => (
              <tr key={product}>
                <td style={{ color: '#6b6d7b', fontSize: 11 }}>{idx + 1}</td>
                <td style={{ fontWeight: 500 }}>{product}</td>
                {data.dates.map(d => {
                  const day = data.data.find(x => x.date === d);
                  const item = day && day.items.find(i => i.product === product);
                  return (
                    <td key={d} style={{ textAlign: 'center' }}>
                      {item ? item.count : '-'}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#f59e0b' }}>
                  {totalPorProducto[product] || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
