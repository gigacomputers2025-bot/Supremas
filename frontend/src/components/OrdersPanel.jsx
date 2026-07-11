import React, { useState, useEffect, useCallback } from 'react';
import { InlineEdit, EditableSelect, AutocompleteInput, useToast } from './shared';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/orders`;

export default function OrdersPanel() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [channels, setChannels] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [zones, setZones] = useState([]);
  const [priceLabels, setPriceLabels] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const toast = useToast();
  const pageSize = 50;

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/channels`).then(r => r.json()),
      fetch(`${API_BASE}/api/payments`).then(r => r.json()),
      fetch(`${API_BASE}/api/zones`).then(r => r.json()),
      fetch(`${API_BASE}/api/price-lists`).then(r => r.json()),
      fetch(`${API_BASE}/api/customers`).then(r => r.json()),
      fetch(`${API_BASE}/api/products`).then(r => r.json()),
      fetch(`${API_BASE}/api/repartidores?active=true`).then(r => r.json()),
    ]).then(([ch, pm, zns, pl, c, p, rep]) => {
      setChannels(ch);
      setPaymentMethods(pm);
      setZones(zns);
      setPriceLabels(pl);
      setCustomers(c);
      setProducts(p);
      setRepartidores(rep);
    }).catch(() => toast.error('Error al cargar datos de referencia'));
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: pageSize, offset: page * pageSize });
      if (search) params.set('search', search);
      if (fechaDesde) params.set('fecha_desde', fechaDesde);
      if (fechaHasta) params.set('fecha_hasta', fechaHasta);
      const res = await fetch(`${API}?${params}`);
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
    } catch (err) {
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [page, search, fechaDesde, fechaHasta]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const saveField = useCallback(async (id, field, value) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    try {
      await fetch(`${API}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...order, [field]: value })
      });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
    } catch (err) {
      toast.error('Error al guardar');
    }
  }, [orders]);

  const deleteOrder = useCallback(async (id) => {
    if (!confirm('¿Eliminar este pedido?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success('Pedido eliminado');
    } catch { toast.error('Error al eliminar'); }
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  const channelOptions = channels.map(c => c.name);
  const paymentOptions = paymentMethods.map(p => ({ label: `${p.name} (${p.commission_rate}%)`, value: p.name }));
  const barrioOptions = zones.map(z => z.neighborhood).filter(Boolean);
  const repartidorOptions = repartidores.map(r => r.name);
  const priceLabelOptions = priceLabels.map(l => l.name);

  const searchCustomers = async (term) => {
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(term)}`);
      const data = await res.json();
      return data.map(c => ({ id: c.id, ...c, label: `${c.name} (${c.dni || 'sin DNI'})` }));
    } catch { return []; }
  };

  const searchProducts = async (term) => {
    const q = term.toLowerCase();
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.sigla || '').toLowerCase().includes(q)
    ).slice(0, 20);
    return filtered.map(p => ({ ...p, label: `${p.name} ${p.sigla ? '('+p.sigla+')' : ''}` }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <input
          placeholder="Buscar por cliente, calle, barrio, celular..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: 1, maxWidth: 280 }}
        />
        <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>Desde:</span>
        <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setPage(0); }} title="Desde" style={{ width: 140, padding: '6px 8px', background: '#1e2029', border: '1px solid #2a2c38', borderRadius: 6, color: '#e8e9ed', fontSize: 12 }} />
        <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>Hasta:</span>
        <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setPage(0); }} title="Hasta" style={{ width: 140, padding: '6px 8px', background: '#1e2029', border: '1px solid #2a2c38', borderRadius: 6, color: '#e8e9ed', fontSize: 12 }} />
        <span style={{ fontSize: 12, color: '#6b6d7b' }}>{total} pedidos</span>
        <button className="btn-success" onClick={() => { setEditOrder(null); setShowForm(true); }}>+ Nuevo Pedido</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th style={{ width: 90 }}>Fecha</th>
              <th style={{ width: 120 }}>Cliente</th>
              <th style={{ width: 140 }}>Dirección</th>
              <th style={{ width: 90 }}>Barrio</th>
              <th style={{ width: 90 }}>Canal</th>
              <th style={{ width: 90 }}>Cobro</th>
              <th style={{ width: 80, textAlign: 'right' }}>Total</th>
              <th style={{ width: 80, textAlign: 'right' }}>Cobro Real</th>
              <th style={{ width: 80 }}>Conductor</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ color: '#6b6d7b' }}>{o.id}</td>
                <td>
                  <InlineEdit value={o.fecha_pedido} onSave={v => saveField(o.id, 'fecha_pedido', v)} placeholder="fecha" />
                </td>
                <td style={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <InlineEdit value={o.cliente} onSave={v => saveField(o.id, 'cliente', v)} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <InlineEdit value={o.calle} onSave={v => saveField(o.id, 'calle', v)} placeholder="calle" style={{ minWidth: 50 }} />
                    <InlineEdit value={o.altura} onSave={v => saveField(o.id, 'altura', v)} placeholder="n°" style={{ width: 40 }} />
                  </div>
                </td>
                <td>
                  <EditableSelect
                    value={o.barrio}
                    options={barrioOptions}
                    onChange={v => saveField(o.id, 'barrio', v)}
                  />
                </td>
                <td>
                  <EditableSelect
                    value={o.canal_venta}
                    options={channelOptions}
                    onChange={v => saveField(o.id, 'canal_venta', v)}
                  />
                </td>
                <td>
                  <EditableSelect
                    value={o.medio_cobro}
                    options={paymentOptions}
                    onChange={v => saveField(o.id, 'medio_cobro', v)}
                  />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  <InlineEdit value={o.total_pedido} onSave={v => saveField(o.id, 'total_pedido', v)} placeholder="0" />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <InlineEdit value={o.cobro_real} onSave={v => saveField(o.id, 'cobro_real', v)} placeholder="0" />
                </td>
                <td>
                  <EditableSelect
                    value={o.conductor}
                    options={repartidorOptions}
                    onChange={v => saveField(o.id, 'conductor', v)}
                  />
                </td>
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

      {showForm && (
        <OrderForm
          order={editOrder}
          channels={channelOptions}
          payments={paymentOptions}
          barrios={barrioOptions}
          labels={priceLabelOptions}
          deliverers={repartidorOptions}
          searchCustomers={searchCustomers}
          searchProducts={searchProducts}
          onClose={() => { setShowForm(false); setEditOrder(null); fetchOrders(); }}
        />
      )}
    </div>
  );
}

function OrderForm({ order, onClose, channels, payments, barrios, labels, deliverers, searchCustomers, searchProducts }) {
  const [form, setForm] = useState(order || {
    cliente: '', dni: '', celular: '', calle: '', altura: '', piso_dto: '', comentario: '',
    barrio: '', fecha_pedido: '', fecha_entrega: '', dia: '', mes: '', anio: '',
    canal_venta: '', lista_precio: '',
    producto1: '', producto2: '', producto3: '', producto4: '', producto5: '', producto6: '', producto7: '',
    valor_prod1: 0, valor_prod2: 0, valor_prod3: 0, valor_prod4: 0, valor_prod5: 0, valor_prod6: 0, valor_prod7: 0,
    promo_especial: '', total_pedido: 0, medio_cobro: '', cobro_real: 0, conductor: '',
    whatsapp: '', mensaje_web: '', mensaje_whatsapp: ''
  });
  const toast = useToast();

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const calcTotal = () => {
    const sum = [1,2,3,4,5,6,7].reduce((acc, i) => acc + (Number(form[`valor_prod${i}`]) || 0), 0);
    set('total_pedido', sum);
    if (!form.cobro_real) set('cobro_real', sum);
  };

  const handleSelectCustomer = (customer) => {
    set('cliente', customer.name);
    set('dni', customer.dni || '');
    set('celular', customer.celular || '');
    set('calle', customer.calle || '');
    set('altura', customer.altura || '');
    set('piso_dto', customer.piso_dto || '');
    set('barrio', customer.barrio || '');
  };

  const handleCreateCustomer = async () => {
    const name = form.cliente?.trim();
    if (!name) { toast.warning('Escribí un nombre primero'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, dni: form.dni, celular: form.celular,
          calle: form.calle, altura: form.altura,
          piso_dto: form.piso_dto, barrio: form.barrio
        })
      });
      if (!res.ok) throw new Error();
      const customer = await res.json();
      toast.success(`Cliente "${customer.name}" creado`);
      handleSelectCustomer(customer);
    } catch { toast.error('Error al crear cliente'); }
  };

  const handleSelectProduct = (product, index) => {
    set(`producto${index}`, product.name);
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
      toast.success(order ? 'Pedido actualizado' : 'Pedido creado');
      onClose();
    } catch (err) {
      toast.error('Error al guardar pedido');
    }
  };

  const inputStyle = { width: '100%', padding: '6px 8px' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#121318', borderRadius: 10, padding: 24, maxWidth: 860, width: '95%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #1e2029', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: '#e8e9ed' }}>{order ? 'Editar Pedido' : 'Nuevo Pedido'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 6, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Cliente *</label>
                <AutocompleteInput
                  value={form.cliente}
                  onChange={v => set('cliente', v)}
                  onSelect={handleSelectCustomer}
                  fetchOptions={searchCustomers}
                  placeholder="Buscar y seleccionar cliente..."
                />
              </div>
              <button type="button" onClick={handleCreateCustomer} title="Crear nuevo cliente" style={{ background: '#16a34a', color: 'white', padding: '6px 12px', fontSize: 16, fontWeight: 700, borderRadius: 6, whiteSpace: 'nowrap' }}>
                + Nuevo
              </button>
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
              <select style={inputStyle} value={form.barrio} onChange={e => set('barrio', e.target.value)}>
                <option value="">—</option>
                {barrios.map((b, i) => <option key={i} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Canal de Venta</label>
              <select style={inputStyle} value={form.canal_venta} onChange={e => set('canal_venta', e.target.value)}>
                <option value="">—</option>
                {channels.map((ch, i) => <option key={i} value={ch}>{ch}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Medio de Cobro</label>
              <select style={inputStyle} value={form.medio_cobro} onChange={e => set('medio_cobro', e.target.value)}>
                <option value="">—</option>
                {payments.map((p, i) => <option key={i} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Conductor</label>
              <select style={inputStyle} value={form.conductor} onChange={e => set('conductor', e.target.value)}>
                <option value="">—</option>
                {deliverers.map((d, i) => <option key={i} value={d}>{d}</option>)}
              </select>
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
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Lista Precio</label>
              <select style={inputStyle} value={form.lista_precio} onChange={e => set('lista_precio', e.target.value)}>
                <option value="">—</option>
                {labels.map((l, i) => <option key={i} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#c8c9d0' }}>Productos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <AutocompleteInput
                    value={form[`producto${i}`]}
                    onChange={v => { set(`producto${i}`, v); }}
                    onSelect={p => handleSelectProduct(p, i)}
                    fetchOptions={searchProducts}
                    placeholder={`Producto ${i}`}
                  />
                </div>
                <input
                  type="number"
                  placeholder="$"
                  style={{ width: 100, textAlign: 'right', padding: '6px 8px' }}
                  value={form[`valor_prod${i}`]}
                  onChange={e => { set(`valor_prod${i}`, e.target.value); }}
                  onBlur={calcTotal}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
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
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Comentario</label>
              <input style={{ ...inputStyle, width: 200 }} value={form.comentario} onChange={e => set('comentario', e.target.value)} />
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
