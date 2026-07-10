import React from 'react';

export default function HomeScreen({ onNewOrder, onManagement }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0c0d11',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 40,
      padding: 40,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <ChickenLogoBig />
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#e8e9ed', letterSpacing: '-0.5px', margin: 0 }}>Supremas</h1>
        <p style={{ fontSize: 14, color: '#6b6d7b', margin: 0 }}>Panel de Gestión</p>
      </div>

      <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onNewOrder} style={{
          width: 280,
          height: 200,
          background: 'linear-gradient(145deg, #1a1b26, #0f1015)',
          border: '2px solid #3b82f6',
          borderRadius: 16,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          transition: 'all 0.2s',
          boxShadow: '0 8px 32px rgba(59,130,246,0.15)',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#60a5fa'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(59,130,246,0.25)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(59,130,246,0.15)'; e.currentTarget.style.transform = 'none'; }}
        >
          <span style={{ fontSize: 56, lineHeight: 1 }}>📝</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#e8e9ed' }}>Nuevo Pedido</span>
          <span style={{ fontSize: 12, color: '#6b6d7b' }}>Crear y gestionar pedidos</span>
        </button>

        <button onClick={onManagement} style={{
          width: 280,
          height: 200,
          background: 'linear-gradient(145deg, #1a1b26, #0f1015)',
          border: '2px solid #7c3aed',
          borderRadius: 16,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          transition: 'all 0.2s',
          boxShadow: '0 8px 32px rgba(124,58,237,0.15)',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.25)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.15)'; e.currentTarget.style.transform = 'none'; }}
        >
          <span style={{ fontSize: 56, lineHeight: 1 }}>⚙️</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#e8e9ed' }}>Gestión</span>
          <span style={{ fontSize: 12, color: '#6b6d7b' }}>Productos, clientes, precios, etc.</span>
        </button>
      </div>
    </div>
  );
}

function ChickenLogoBig() {
  return (
    <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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
