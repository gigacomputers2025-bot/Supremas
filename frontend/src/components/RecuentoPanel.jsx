import React, { useState, useEffect } from 'react';

export default function RecuentoPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando...</div>;
  if (!data) return <div style={{ padding: 20, color: '#f87171' }}>Error al cargar datos</div>;

  const { counts, byCategory } = data;

  const card = (label, value, color = '#3b82f6', icon = '') => (
    <div style={{
      background: '#1a1b26', borderRadius: 8, border: '1px solid #23252e',
      padding: '16px 20px', textAlign: 'center', minWidth: 140,
    }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value?.toLocaleString?.('es-AR') ?? value ?? 0}</div>
      <div style={{ fontSize: 11, color: '#6b6d7b', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );

  const money = (n) => `$${(n || 0).toLocaleString('es-AR')}`;

  return (
    <div>
      <h2 style={{ fontSize: 16, color: '#e0e1e6', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📊</span> Recuento General
      </h2>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 10, marginBottom: 24 }}>
        {card('Productos', counts.products, '#3b82f6', '📦')}
        {card('Minorista', counts.minorista, '#60a5fa', '🛒')}
        {card('Mayorista', counts.mayorista, '#f59e0b', '🏪')}
        {card('Categorías', counts.categories, '#8b5cf6', '📂')}
        {card('Clientes', counts.customers, '#10b981', '👤')}
        {card('Pedidos', counts.orders, '#f97316', '📋')}
        {card('Ingreso Total', money(counts.revenue), '#34d399', '💰')}
        {card('Promedio x Pedido', money(counts.avgOrder), '#818cf8', '📈')}
        {card('Medios de Pago', counts.payments, '#a78bfa', '💳')}
        {card('Canales', counts.channels, '#f472b6', '📢')}
        {card('Zonas Reparto', counts.zones, '#2dd4bf', '📍')}
      </div>

      {/* Products by Category */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, color: '#e0e1e6', marginBottom: 12 }}>Productos por Categoría</h3>
        <table style={{ minWidth: 400 }}>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Tipo Lista</th>
              <th style={{ textAlign: 'right' }}>Cantidad</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {byCategory.filter((_, i) => i < 20).map((r, i) => {
              const pct = (r.count / counts.products) * 100;
              return (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{r.category}</td>
                  <td><span style={{ fontSize: 11, color: '#9ca3af' }}>{r.list_type}</span></td>
                  <td style={{ textAlign: 'right' }}>{r.count}</td>
                  <td style={{ width: 200 }}>
                    <div style={{ background: '#23252e', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: 4 }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recent orders by day */}
      {data.ordersByDay && data.ordersByDay.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 14, color: '#e0e1e6', marginBottom: 12 }}>Pedidos Recientes por Día</h3>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', minHeight: 100, paddingTop: 10 }}>
            {data.ordersByDay.slice(0, 20).reverse().map((d, i) => {
              const maxCount = Math.max(...data.ordersByDay.map(o => o.count), 1);
              const h = (d.count / maxCount) * 80;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: '#6b6d7b', marginBottom: 2 }}>{d.count}</div>
                  <div style={{ width: '100%', height: `${Math.max(h, 4)}px`, background: '#3b82f6', borderRadius: '3px 3px 0 0', minHeight: 4 }} title={`${d.day}: ${d.count} pedidos`} />
                  <div style={{ fontSize: 7, color: '#6b6d7b', marginTop: 2, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{d.day?.slice?.(5, 10) || d.day}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
