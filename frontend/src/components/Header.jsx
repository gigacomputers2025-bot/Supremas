import React from 'react';

export default function Header({ activeTab, onTabChange, onExcelExport, onExcelImport, onSeedData, onSettings, onSyncToGitHub, hiddenTabs = [], onBackHome, showActions = true }) {
  const ALL_TABS = [
    { key: 'products', label: 'Productos' },
    { key: 'customers', label: 'Clientes' },
    { key: 'payments', label: 'Medios de Pago' },
    { key: 'channels', label: 'Canales de Venta' },
    { key: 'zones', label: 'Zonas de Reparto' },
    { key: 'orders', label: 'Pedidos' },
    { key: 'recuento', label: 'Recuento' },
    { key: 'estadisticas', label: 'Estadísticas' },
    { key: 'categories', label: 'Categorías' },
    { key: 'pricelist', label: 'Lista de Precios' },
    { key: 'repartidores', label: 'Repartidores' },
    { key: 'envios', label: 'Envíos' },
  ];

  const TABS = ALL_TABS.filter(t => !hiddenTabs.includes(t.key));

  return (
    <header style={{
      background: '#0f1015',
      borderBottom: '1px solid #1e2029',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Top bar with logo and buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 56,
        maxWidth: 1440,
        margin: '0 auto',
        width: '100%',
      }}>
        {/* Logo + name + back button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onBackHome && (
            <button
              onClick={onBackHome}
              style={{
                background: 'transparent',
                border: '1px solid #2a2c38',
                borderRadius: 6,
                padding: '4px 8px',
                cursor: 'pointer',
                color: '#9ca3af',
                fontSize: 12,
                transition: 'all 0.15s',
                marginRight: 4,
              }}
              title="Volver al inicio"
            >
              ← Inicio
            </button>
          )}
          <ChickenLogo />
          <div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#e8e9ed', letterSpacing: '-0.3px' }}>Supremas</span>
            <span style={{ fontSize: 11, color: '#6b6d7b', marginLeft: 8 }}>Panel de Gestión</span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showActions && (
            <>
              <ActionButton label="Datos de Prueba" icon="🧪" onClick={onSeedData} style={{ borderColor: '#7c3aed', color: '#a78bfa' }} />
              <ActionButton label="Exportar Excel" icon="📥" onClick={onExcelExport} />
              <ActionButton label="Importar Excel" icon="📤" onClick={onExcelImport} />
              {onSyncToGitHub && <ActionButton label="Sincronizar con GitHub" icon="☁️" onClick={onSyncToGitHub} style={{ borderColor: '#059669', color: '#34d399' }} />}
            </>
          )}
          {showActions && (
            <button
              onClick={onSettings}
              style={{
                background: activeTab === 'settings' ? '#1a1b26' : 'transparent',
                border: '1px solid transparent',
                borderColor: activeTab === 'settings' ? '#3b82f6' : '#2a2c38',
                borderRadius: 6,
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: 16,
                color: activeTab === 'settings' ? '#e0e1e6' : '#6b6d7b',
                transition: 'all 0.15s',
              }}
              title="Configuración"
            >
              ⚙
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        paddingLeft: 24,
        maxWidth: 1440,
        margin: '0 auto',
        overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            style={{
              padding: '8px 18px',
              border: 'none',
              background: 'transparent',
              borderBottom: t.key === activeTab ? '2px solid #3b82f6' : '2px solid transparent',
              color: t.key === activeTab ? '#e0e1e6' : '#6b6d7b',
              fontWeight: t.key === activeTab ? 600 : 500,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: -1,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </header>
  );
}

function ChickenLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="50" cy="62" rx="28" ry="24" fill="#f59e0b" />
      <circle cx="50" cy="36" r="16" fill="#f59e0b" />
      <path d="M42 22 L44 14 L48 20 L50 12 L52 20 L56 14 L58 22" fill="#ef4444" />
      <ellipse cx="50" cy="48" rx="4" ry="6" fill="#ef4444" />
      <path d="M50 42 L60 44 L50 46Z" fill="#f97316" />
      <circle cx="46" cy="34" r="3" fill="#1a1a1a" />
      <circle cx="45.5" cy="33.5" r="1" fill="white" />
      <ellipse cx="38" cy="58" rx="10" ry="8" fill="#d97706" opacity="0.6" />
      <path d="M72 52 Q85 40 82 28 Q78 38 74 48Z" fill="#d97706" />
      <path d="M74 54 Q90 44 88 32 Q84 42 78 50Z" fill="#f59e0b" />
      <line x1="44" y1="84" x2="42" y2="96" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
      <line x1="56" y1="84" x2="58" y2="96" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 96 L42 96 L48 96" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M52 96 L58 96 L64 96" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ActionButton({ label, icon, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid #2a2c38',
        borderRadius: 6,
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: 12,
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        transition: 'all 0.15s',
        ...style,
      }}
      title={label}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
    </button>
  );
}
