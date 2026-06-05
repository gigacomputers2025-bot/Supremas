import React, { useState } from 'react';
import Header from './Header';
import ProductsPanel from './ProductsPanel';
import PaymentsPanel from './PaymentsPanel';
import ChannelsPanel from './ChannelsPanel';
import ZonesPanel from './ZonesPanel';
import CustomersPanel from './CustomersPanel';
import OrdersPanel from './OrdersPanel';
import SettingsPanel from './SettingsPanel';
import RecuentoPanel from './RecuentoPanel';
import EstadisticasPanel from './EstadisticasPanel';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('products');

  const handleExcelExport = async () => {
    try {
      const res = await fetch('/api/excel/export', { method: 'POST' });
      if (res.ok) alert('Excel exportado correctamente');
      else alert('Error al exportar Excel');
    } catch { alert('Error de conexión'); }
  };

  const handleExcelImport = async () => {
    if (!confirm('¿Recargar todos los datos desde el Excel? Se perderán los cambios no exportados.')) return;
    try {
      const res = await fetch('/api/excel/import', { method: 'POST' });
      if (res.ok) { alert('Datos recargados desde Excel'); window.location.reload(); }
      else alert('Error al importar');
    } catch { alert('Error de conexión'); }
  };

  return (
    <div style={{ background: '#0c0d11', minHeight: '100vh' }}>
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExcelExport={handleExcelExport}
        onExcelImport={handleExcelImport}
        onSettings={() => setActiveTab('settings')}
      />

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 24px' }}>
        <div className="card" style={{ minHeight: '65vh' }}>
          {activeTab === 'products' && <ProductsPanel />}
          {activeTab === 'customers' && <CustomersPanel />}
          {activeTab === 'payments' && <PaymentsPanel />}
          {activeTab === 'channels' && <ChannelsPanel />}
          {activeTab === 'zones' && <ZonesPanel />}
          {activeTab === 'orders' && <OrdersPanel />}
          {activeTab === 'settings' && <SettingsPanel />}
          {activeTab === 'recuento' && <RecuentoPanel />}
          {activeTab === 'estadisticas' && <EstadisticasPanel />}
        </div>
      </main>
    </div>
  );
}
