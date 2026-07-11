import React, { useState, useEffect, useCallback, useRef } from 'react';
import { InlineEdit, useToast } from './shared';
import { API_BASE } from '../config';

const API = `${API_BASE}/api/customers`;

export default function CustomersPanel() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editCust, setEditCust] = useState(null);
  const timers = useRef({});
  const toast = useToast();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${API}${params}`);
      setCustomers(await res.json());
    } catch (err) {
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const save = useCallback((id, field, value) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const c = customers.find(x => x.id === id);
      if (!c) return;
      try {
        await fetch(`${API}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...c, [field]: value })
        });
      } catch (err) { toast.error('Error al guardar'); }
    }, 500);
  }, [customers]);

  const remove = useCallback(async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      setCustomers(prev => prev.filter(c => c.id !== id));
      toast.success('Cliente eliminado');
    } catch { toast.error('Error al eliminar'); }
  }, []);

  if (loading && customers.length === 0) {
    return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando clientes...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <input
          placeholder="Buscar por nombre, DNI, celular o barrio..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 360 }}
        />
        <span style={{ fontSize: 12, color: '#6b6d7b' }}>{customers.length} clientes</span>
        <button className="btn-success" onClick={() => { setEditCust(null); setShowForm(true); }}>+ Nuevo Cliente</button>
      </div>

      <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
        <table style={{ minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>#</th>
              <th>Nombre</th>
              <th style={{ width: 120 }}>DNI</th>
              <th style={{ width: 130 }}>Celular</th>
              <th style={{ width: 180 }}>Dirección</th>
              <th style={{ width: 120 }}>Barrio</th>
              <th style={{ width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, idx) => (
              <tr key={c.id}>
                <td style={{ color: '#6b6d7b', fontSize: 11 }}>{idx + 1}</td>
                <td style={{ fontWeight: 500 }}>
                  <InlineEdit value={c.name} onSave={v => save(c.id, 'name', v)} />
                </td>
                <td><InlineEdit value={c.dni} onSave={v => save(c.id, 'dni', v)} /></td>
                <td><InlineEdit value={c.celular} onSave={v => save(c.id, 'celular', v)} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <InlineEdit value={c.calle} onSave={v => save(c.id, 'calle', v)} placeholder="calle" style={{ minWidth: 60 }} />
                    <InlineEdit value={c.altura} onSave={v => save(c.id, 'altura', v)} placeholder="n°" style={{ width: 50 }} />
                    <InlineEdit value={c.piso_dto} onSave={v => save(c.id, 'piso_dto', v)} placeholder="piso" style={{ width: 50 }} />
                  </div>
                </td>
                <td><InlineEdit value={c.barrio} onSave={v => save(c.id, 'barrio', v)} /></td>
                <td>
                  <button className="btn-danger btn-sm" onClick={() => remove(c.id)}>✕</button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#6b6d7b' }}>Sin clientes</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && <CustomerForm customer={editCust} onClose={() => { setShowForm(false); setEditCust(null); fetchCustomers(); }} />}
    </div>
  );
}

function CustomerForm({ customer, onClose }) {
  const [form, setForm] = useState(customer || {
    name: '', dni: '', celular: '', calle: '', altura: '', piso_dto: '', barrio: ''
  });
  const toast = useToast();

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = customer ? `${API}/${customer.id}` : API;
    const method = customer ? 'PUT' : 'POST';
    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      toast.success(customer ? 'Cliente actualizado' : 'Cliente creado');
      onClose();
    } catch (err) {
      toast.error('Error al guardar cliente');
    }
  };

  const inputStyle = { width: '100%', padding: '6px 8px' };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#121318', borderRadius: 10, padding: 24, maxWidth: 500, width: '90%', border: '1px solid #1e2029', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: '#e8e9ed' }}>{customer ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af' }}>Nombre *</label>
              <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required />
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
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ background: '#2a2c38', color: '#9ca3af', padding: '8px 20px' }}>Cancelar</button>
            <button type="submit" className="btn-success" style={{ padding: '8px 20px' }}>{customer ? 'Guardar' : 'Crear Cliente'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
