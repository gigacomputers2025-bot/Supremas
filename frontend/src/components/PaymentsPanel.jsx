import React, { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api/payments';

export default function PaymentsPanel() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const timers = useRef({});

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(API);
      setPayments(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const save = useCallback((id, field, value) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const pm = payments.find(p => p.id === id);
      if (!pm) return;
      try {
        await fetch(`${API}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pm, [field]: value })
        });
      } catch (err) { console.error(err); }
    }, 500);
  }, [payments]);

  const add = useCallback(async () => {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nuevo', commission_rate: 1.0 })
    });
    const data = await res.json();
    setPayments(prev => [...prev, data]);
  }, []);

  const remove = useCallback(async (id) => {
    if (!confirm('Eliminar medio de pago?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6b6d7b' }}>Cargando...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#6b6d7b' }}>{payments.length} medios de pago</span>
        <button className="btn-primary" onClick={add}>+ Nuevo</button>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: 60 }}>#</th>
            <th>Nombre</th>
            <th style={{ width: 150 }}>Tasa Comisión</th>
            <th style={{ width: 50 }}></th>
          </tr>
        </thead>
        <tbody>
          {payments.map((pm, idx) => (
            <tr key={pm.id}>
              <td style={{ color: '#6b6d7b', fontSize: 12 }}>{idx + 1}</td>
              <td>
                <InlineEdit
                  value={pm.name}
                  onSave={v => save(pm.id, 'name', v)}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.001"
                  defaultValue={pm.commission_rate}
                  onBlur={e => save(pm.id, 'commission_rate', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                  style={{ width: 120, textAlign: 'right' }}
                />
              </td>
              <td>
                <button className="btn-danger btn-sm" onClick={() => remove(pm.id)}>✕</button>
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
        onKeyDown={e => { if (e.key === 'Enter') { onSave(val); setEditing(false); } if (e.key === 'Escape') { setVal(value || ''); setEditing(false); } }}
        autoFocus
      />
    );
  }
  return <span onClick={() => setEditing(true)} style={{ cursor: 'pointer', minHeight: 20, display: 'block' }}>{value || '—'}</span>;
}
