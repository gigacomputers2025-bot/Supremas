import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function EstadisticasPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando estadísticas...</div>;
  if (!data) return <div style={{ padding: 20, color: '#f87171' }}>Error al cargar</div>;

  const { topProducts, byPayment, byChannel, byNeighborhood, byMonth, counts } = data;

  const money = (n) => `$${(n || 0).toLocaleString('es-AR')}`;

  const MiniBar = ({ value, max, color = '#3b82f6', label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: '#c8c9d0', minWidth: 120, textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, background: '#23252e', borderRadius: 4, height: 16, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min((value / max) * 100, 100)}%`,
          height: '100%',
          background: color,
          borderRadius: 4,
          transition: 'width 0.5s',
        }} />
      </div>
      <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 60, textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 16, color: '#e0e1e6', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📈</span> Estadísticas
      </h2>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
        <SummaryCard label="Ingreso Total" value={money(counts.revenue)} color="#34d399" />
        <SummaryCard label="Cobrado Real" value={money(counts.collected)} color="#60a5fa" />
        <SummaryCard label="Pedidos" value={counts.orders} color="#f97316" />
        <SummaryCard label="Promedio x Pedido" value={money(counts.avgOrder)} color="#818cf8" />
      </div>

      {/* Top Products */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, color: '#e0e1e6', marginBottom: 12 }}>🏆 Top 10 Productos Más Vendidos</h3>
          {topProducts.length === 0 ? <p style={{ color: '#6b6d7b', fontSize: 13 }}>Sin datos</p> : (
            topProducts.map((p, i) => {
              const maxCount = topProducts[0]?.count || 1;
              const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#6b6d7b', width: 16 }}>#{i + 1}</span>
                  <div style={{ flex: 1, background: '#23252e', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(p.count / maxCount) * 100}%`,
                      height: '100%',
                      background: colors[i % colors.length],
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 6,
                    }}>
                      <span style={{ fontSize: 10, color: 'white', fontWeight: 600, whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{p.name}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 40, textAlign: 'right' }}>{p.count}×</span>
                </div>
              );
            })
          )}
        </div>

        {/* Revenue by Payment Method */}
        <div className="card">
          <h3 style={{ fontSize: 14, color: '#e0e1e6', marginBottom: 12 }}>💳 Ingresos por Medio de Cobro</h3>
          {byPayment.length === 0 ? <p style={{ color: '#6b6d7b', fontSize: 13 }}>Sin datos</p> : (
            byPayment.map((p, i) => {
              const maxRev = byPayment[0]?.revenue || 1;
              return (
                <MiniBar
                  key={i}
                  label={p.name || '—'}
                  value={money(p.revenue)}
                  max={money(maxRev)}
                  color={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'][i]}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Revenue by Channel + by Neighborhood */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, color: '#e0e1e6', marginBottom: 12 }}>📢 Pedidos por Canal</h3>
          {byChannel.length === 0 ? <p style={{ color: '#6b6d7b', fontSize: 13 }}>Sin datos</p> : (
            byChannel.map((c, i) => {
              const maxCnt = byChannel[0]?.count || 1;
              return (
                <MiniBar
                  key={i}
                  label={c.name || '—'}
                  value={`${c.count} (${money(c.revenue)})`}
                  max={maxCnt}
                  color={['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'][i]}
                />
              );
            })
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, color: '#e0e1e6', marginBottom: 12 }}>📍 Pedidos por Barrio</h3>
          {byNeighborhood.length === 0 ? <p style={{ color: '#6b6d7b', fontSize: 13 }}>Sin datos</p> : (
            byNeighborhood.map((n, i) => {
              const maxCnt = byNeighborhood[0]?.count || 1;
              return (
                <MiniBar
                  key={i}
                  label={n.name || '—'}
                  value={`${n.count} (${money(n.revenue)})`}
                  max={maxCnt}
                  color={['#14b8a6', '#8b5cf6', '#f97316', '#ec4899', '#84cc16', '#6366f1'][i]}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Monthly */}
      {byMonth && byMonth.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 14, color: '#e0e1e6', marginBottom: 12 }}>📅 Ingresos por Mes</h3>
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', minHeight: 120, paddingTop: 10 }}>
            {byMonth.map((m, i) => {
              const allRevenues = byMonth.map(x => x.revenue);
              const maxRev = Math.max(...allRevenues, 1);
              const h = (m.revenue / maxRev) * 100;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: '#6b6d7b', marginBottom: 2 }}>{money(m.revenue)}</div>
                  <div style={{
                    width: '80%',
                    height: `${Math.max(h, 4)}px`,
                    background: 'linear-gradient(to top, #3b82f6, #60a5fa)',
                    borderRadius: '4px 4px 0 0',
                    minHeight: 4,
                    position: 'relative',
                  }} />
                  <div style={{ fontSize: 9, color: '#6b6d7b', marginTop: 4 }}>{m.name || '—'}</div>
                  <div style={{ fontSize: 8, color: '#4b5563' }}>{m.count} ped.</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{
      background: '#1a1b26', borderRadius: 8, border: '1px solid #23252e',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: '#6b6d7b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}
