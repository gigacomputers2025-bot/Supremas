import React from 'react';
import { useServerStatus } from './shared/ServerStatusContext';

export default function Footer() {
  const { connected, health, checking } = useServerStatus();

  return (
    <div style={{
      background: '#0f1015',
      borderTop: '1px solid #1e2029',
      padding: '6px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 11,
      color: '#6b6d7b',
      position: 'sticky',
      bottom: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
          background: checking ? '#eab308' : connected ? '#16a34a' : '#ef4444',
          transition: 'background 0.3s',
        }} />
        <span>
          {checking ? 'Verificando...' : connected ? 'Servidor conectado' : 'Servidor desconectado'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {connected && health && (
          <>
            <span>{health.totalBackups} backups</span>
            {health.latestBackup && <span>Último backup: {new Date(health.latestBackup.date).toLocaleDateString('es-AR')}</span>}
          </>
        )}
        <span>Supremas v2.0</span>
      </div>
    </div>
  );
}
