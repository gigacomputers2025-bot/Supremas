import React, { useState, useEffect, useCallback } from 'react';

const API = '/api/orders';

export default function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const pageSize = 50;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: pageSize, offset: page * pageSize });
      if (search) params.set('search', search);
      const res = await fetch(`${API}?${params}`);
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const deleteOrder = useCallback(async (id) => {
    if (!confirm('Eliminar este pedido?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <input
          placeholder="Buscar por cliente, calle, barrio, celular..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: 1, maxWidth: 400 }}
        />
        <span style={{ fontSize: 12, color: '#6b6d7b' }}>{total} pedidos</span>
        <button className="btn-success" onClick={() => { setEditOrder(null); setShowForm(true); }}>+ Nuevo Pedido</button>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '52vh', overflowY: 'auto' }}>
        <table style={{ minWidth: 1200, fontSize: 12 }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Dirección</th>
              <th>Barrio</th>
              <th>Productos</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Cobro</th>
              <th style={{ textAlign: 'right' }}>Cobro Real</th>
              <th>Canal</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ color: '#6b6d7b' }}>{o.id}</td>
                <td>{o.fecha_pedido || '-'}</td>
                <td style={{ fontWeight: 500 }}>{o.cliente}</td>
                <td>{[o.calle, o.altura, o.piso_dto].filter(Boolean).join(' ') || '-'}</td>
                <td>{o.barrio || '-'}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[o.producto1, o.producto2, o.producto3, o.producto4, o.producto5, o.producto6, o.producto7].filter(Boolean).join(', ') || '-'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>${Number(o.total_pedido).toLocaleString('es-AR')}</td>
                <td>{o.medio_cobro || '-'}</td>
                <td style={{ textAlign: 'right' }}>${Number(o.cobro_real).toLocaleString('es-AR')}</td>
                <td>{o.canal_venta || '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-primary btn-sm" onClick={() => { setEditOrder(o); setShowForm(true); }}>✎</button>
                    <button className="btn-danger btn-sm" onClick={() => deleteOrder(o.id)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', padding: 30, color: '#6b6d7b' }}>Sin pedidos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <button className="btn-sm" style={{ background: '#2a2c38', color: '#9ca3af' }} disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</button>
          <span style={{ fontSize: 12, color: '#6b6d7b' }}>Página {page + 1} de {totalPages}</span>
          <button className="btn-sm" style={{ background: '#2a2c38', color: '#9ca3af' }} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      )}

      {showForm && <OrderForm order={editOrder} onClose={() => { setShowForm(false); setEditOrder(null); fetchOrders(); }} />}
    </div>
  );
}

function OrderForm({ order, onClose }) {
  const [form, setForm] = useState(order || {
    cliente: '', dni: '', celular: '', calle: '', altura: '', piso_dto: '', comentario: '',
    barrio: '', fecha_pedido: '', fecha_entrega: '', dia: '', mes: '', anio: '',
    canal_venta: '', lista_precio: '',
    producto1: '', producto2: '', producto3: '', producto4: '', producto5: '', producto6: '', producto7: '',
    valor_prod1: 0, valor_prod2: 0, valor_prod3: 0, valor_prod4: 0, valor_prod5: 0, valor_prod6: 0, valor_prod7: 0,
    promo_especial: '', total_pedido: 0, medio_cobro: '', cobro_real: 0, conductor: '',
    whatsapp: '', mensaje_web: '', mensaje_whatsapp: ''
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const calcTotal = () => {
    const sum = [1,2,3,4,5,6,7].reduce((acc, i) => acc + (Number(form[`valor_prod${i}`]) || 0), 0);
    set('total_pedido', sum);
    if (!form.cobro_real) set('cobro_real', sum);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = order ? `${API}/${order.id}` : API;
    const method = order ? 'PUT' : 'POST';
    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const inputStyle = { width: '100%', padding: '6px 8px' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#121318', borderRadius: 10, padding: 24, maxWidth: 800, width: '90%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #1e2029', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: '#e8e9ed' }}>{order ? 'Editar Pedido' : 'Nuevo Pedido'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Cliente *</label>
              <input style={inputStyle} value={form.cliente} onChange={e => set('cliente', e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>DNI</label>
              <input style={inputStyle} value={form.dni} onChange={e => set('dni', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Celular</label>
              <input style={inputStyle} value={form.celular} onChange={e => set('celular', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Calle</label>
              <input style={inputStyle} value={form.calle} onChange={e => set('calle', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Altura</label>
              <input style={inputStyle} value={form.altura} onChange={e => set('altura', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Piso / Dto</label>
              <input style={inputStyle} value={form.piso_dto} onChange={e => set('piso_dto', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Barrio</label>
              <input style={inputStyle} value={form.barrio} onChange={e => set('barrio', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Canal de Venta</label>
              <input style={inputStyle} value={form.canal_venta} onChange={e => set('canal_venta', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Medio de Cobro</label>
              <input style={inputStyle} value={form.medio_cobro} onChange={e => set('medio_cobro', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Fecha Pedido</label>
              <input style={inputStyle} type="date" value={form.fecha_pedido} onChange={e => set('fecha_pedido', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Fecha Entrega</label>
              <input style={inputStyle} type="date" value={form.fecha_entrega} onChange={e => set('fecha_entrega', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Conductor</label>
              <input style={inputStyle} value={form.conductor} onChange={e => set('conductor', e.target.value)} />
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#c8c9d0' }}>Productos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder={`Producto ${i}`}
                  style={{ flex: 1 }}
                  value={form[`producto${i}`]}
                  onChange={e => set(`producto${i}`, e.target.value)}
                />
                <input
                  type="number"
                  placeholder="$"
                  style={{ width: 100, textAlign: 'right' }}
                  value={form[`valor_prod${i}`]}
                  onChange={e => { set(`valor_prod${i}`, e.target.value); }}
                  onBlur={calcTotal}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Total Pedido</label>
              <input style={{ ...inputStyle, width: 140, textAlign: 'right', fontWeight: 700 }} value={form.total_pedido} onChange={e => set('total_pedido', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Cobro Real</label>
              <input style={{ ...inputStyle, width: 140, textAlign: 'right' }} value={form.cobro_real} onChange={e => set('cobro_real', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Promo %</label>
              <input style={{ ...inputStyle, width: 100 }} value={form.promo_especial} onChange={e => set('promo_especial', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ background: '#2a2c38', color: '#9ca3af', padding: '8px 20px' }}>Cancelar</button>
            <button type="submit" className="btn-success" style={{ padding: '8px 20px' }}>{order ? 'Guardar Cambios' : 'Crear Pedido'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
