import React, { useState } from 'react';

export default function ExcelSyncButton() {
  const [status, setStatus] = useState('idle');

  const handleExport = async () => {
    setStatus('exporting');
    try {
      const res = await fetch('/api/excel/export', { method: 'POST' });
      if (!res.ok) throw new Error('Export failed');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleImport = async () => {
    if (!confirm('Esto recargará todos los datos desde el Excel. ¿Continuar?')) return;
    setStatus('importing');
    try {
      const res = await fetch('/api/excel/import', { method: 'POST' });
      if (!res.ok) throw new Error('Import failed');
      setStatus('success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const getStyle = () => {
    switch (status) {
      case 'exporting':
      case 'importing':
        return { background: '#f39c12', color: 'white' };
      case 'success':
        return { background: '#27ae60', color: 'white' };
      case 'error':
        return { background: '#e74c3c', color: 'white' };
      default:
        return {};
    }
  };

  const label = {
    idle: 'Exportar a Excel',
    exporting: 'Exportando...',
    importing: 'Importando...',
    success: '¡OK!',
    error: 'Error'
  }[status] || 'Exportar a Excel';

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        className="btn-primary"
        onClick={handleExport}
        disabled={status === 'exporting' || status === 'importing'}
        style={getStyle()}
      >
        {label}
      </button>
      <button
        className="btn-sm"
        onClick={handleImport}
        disabled={status === 'exporting' || status === 'importing'}
        style={{ background: '#2a2c38', color: '#9ca3af' }}
        title="Recargar desde Excel"
      >
        ↻ Excel
      </button>
    </div>
  );
}
