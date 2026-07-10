import React, { useState } from 'react';
import Header from './Header';
import { API_BASE } from '../config';
import Footer from './Footer';
import HomeScreen from './HomeScreen';
import ProductsPanel from './ProductsPanel';
import PaymentsPanel from './PaymentsPanel';
import ChannelsPanel from './ChannelsPanel';
import ZonesPanel from './ZonesPanel';
import CustomersPanel from './CustomersPanel';
import OrdersPanel from './OrdersPanel';
import SettingsPanel from './SettingsPanel';
import RecuentoPanel from './RecuentoPanel';
import EnviosPanel from './EnviosPanel';
import RepartidoresPanel from './RepartidoresPanel';
import EstadisticasPanel from './EstadisticasPanel';
import CategoriesPanel from './CategoriesPanel';
import PriceListPanel from './PriceListPanel';
import { useToast, useServerStatus } from './shared';

export default function Dashboard() {
  const [mode, setMode] = useState('home');
  const [activeTab, setActiveTab] = useState('products');
  const toast = useToast();
  const { connected, checking } = useServerStatus();

  const hiddenTabs = mode === 'orders' ? ALL_TABS_KEYS.filter(k => k !== 'orders') : ['orders'];
  const currentTab = mode === 'orders' ? 'orders' : activeTab;

  const handleBackHome = () => {
    setMode('home');
    setActiveTab('products');
  };

  const handleNewOrder = () => {
    setMode('orders');
  };

  const handleManagement = () => {
    setMode('management');
    setActiveTab('products');
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  const handleExcelExport = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/excel/export`, { method: 'POST' });
      if (res.ok) toast.success('Excel exportado correctamente');
      else toast.error('Error al exportar Excel');
    } catch { toast.error('Error de conexión'); }
  };

  const handleExcelImport = async () => {
    if (!confirm('¿Recargar todos los datos desde el Excel? Se perderán los cambios no exportados.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/excel/import`, { method: 'POST' });
      if (res.ok) { toast.success('Datos recargados desde Excel — recargando...'); setTimeout(() => window.location.reload(), 1000); }
      else toast.error('Error al importar');
    } catch { toast.error('Error de conexión'); }
  };

  const handleSeedData = async () => {
    if (!confirm('¿Poblar la base de datos con datos de prueba? Se eliminarán TODOS los datos existentes. Se creará un backup de seguridad automáticamente.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/seed`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const { stats } = data;
        toast.success(`Datos de prueba cargados: ${stats.products} productos, ${stats.customers} clientes, ${stats.repartidores || 0} repartidores, ${stats.orders} pedidos`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch { toast.error('Error de conexión al sembrar datos'); }
  };

  if (mode === 'home') {
    return (
      <div style={{ position: 'relative' }}>
        <HomeScreen onNewOrder={handleNewOrder} onManagement={handleManagement} />
        <Footer />
        {!checking && !connected && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(12,13,17,0.92)', backdropFilter: 'blur(2px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
          }}>
            <span style={{ fontSize: 48, marginBottom: 12 }}>🔌</span>
            <h3 style={{ color: '#ef4444', fontSize: 18, marginBottom: 8 }}>Servidor Desconectado</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', maxWidth: 360 }}>
              No se puede conectar con el servidor en localhost:3001.
              Verifica que el servidor esté corriendo e intenta de nuevo.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: 16, background: '#2563eb', color: 'white', padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13 }}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: '#0c0d11', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        activeTab={currentTab}
        onTabChange={handleTabChange}
        onExcelExport={handleExcelExport}
        onExcelImport={handleExcelImport}
        onSeedData={handleSeedData}
        onSettings={() => handleTabChange('settings')}
        hiddenTabs={hiddenTabs}
        onBackHome={handleBackHome}
        showActions={mode === 'management'}
      />

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 24px', flex: 1, width: '100%', position: 'relative' }}>
        <div className="card" style={{ minHeight: '65vh', position: 'relative' }}>
          {currentTab === 'products' && <ProductsPanel />}
          {currentTab === 'customers' && <CustomersPanel />}
          {currentTab === 'payments' && <PaymentsPanel />}
          {currentTab === 'channels' && <ChannelsPanel />}
          {currentTab === 'zones' && <ZonesPanel />}
          {currentTab === 'orders' && <OrdersPanel />}
          {currentTab === 'settings' && <SettingsPanel />}
          {currentTab === 'recuento' && <RecuentoPanel />}
          {currentTab === 'estadisticas' && <EstadisticasPanel />}
          {currentTab === 'categories' && <CategoriesPanel />}
          {currentTab === 'pricelist' && <PriceListPanel />}
          {currentTab === 'repartidores' && <RepartidoresPanel />}
          {currentTab === 'envios' && <EnviosPanel />}

          {!checking && !connected && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(12,13,17,0.92)', backdropFilter: 'blur(2px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 999, borderRadius: 10,
            }}>
              <span style={{ fontSize: 48, marginBottom: 12 }}>🔌</span>
              <h3 style={{ color: '#ef4444', fontSize: 18, marginBottom: 8 }}>Servidor Desconectado</h3>
              <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', maxWidth: 360 }}>
                No se puede conectar con el servidor en localhost:3001.
                Verifica que el servidor esté corriendo e intenta de nuevo.
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{ marginTop: 16, background: '#2563eb', color: 'white', padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13 }}
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

const ALL_TABS_KEYS = [
  'products', 'customers', 'payments', 'channels', 'zones',
  'orders', 'recuento', 'estadisticas', 'categories',
  'pricelist', 'repartidores', 'envios',
];
