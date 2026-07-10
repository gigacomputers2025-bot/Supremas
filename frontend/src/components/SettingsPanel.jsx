import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from './shared';

const API_SETTINGS = '/api/settings';
const API_BACKUPS = '/api/backups';
const API_GITHUB = '/api/github';

export default function SettingsPanel() {
  const [githubToken, setGithubToken] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [backupPassword, setBackupPassword] = useState('');
  const [backups, setBackups] = useState([]);
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [ghConnected, setGhConnected] = useState(false);
  const [ghUser, setGhUser] = useState('');
  const [health, setHealth] = useState(null);
  const [autoBackupInterval, setAutoBackupInterval] = useState('30');
  const [autoBackupRetention, setAutoBackupRetention] = useState('20');
  const toast = useToast();

  useEffect(() => {
    fetch(API_SETTINGS).then(r => r.json()).then(data => {
      if (data.github_token) setGithubToken(data.github_token);
      if (data.github_repo) setGithubRepo(data.github_repo);
      if (data.backup_password) setBackupPassword(data.backup_password);
      if (data.auto_backup_interval) setAutoBackupInterval(data.auto_backup_interval);
      if (data.auto_backup_retention) setAutoBackupRetention(data.auto_backup_retention);
    }).catch(() => {});
    fetchBackups();
    fetchHealth();
  }, []);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch(`${API_BACKUPS}/list`);
      setBackups(await res.json());
    } catch {}
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BACKUPS}/health`);
      setHealth(await res.json());
    } catch {}
  }, []);

  const saveSetting = async (key, value) => {
    await fetch(`${API_SETTINGS}/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
  };

  const testGithub = async () => {
    setStatus('probando_token');
    try {
      const res = await fetch(`${API_GITHUB}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken })
      });
      const data = await res.json();
      if (data.success) {
        setGhConnected(true);
        setGhUser(data.login);
        setStatus(`conectado como ${data.login}`);
        await saveSetting('github_token', githubToken);
        toast.success('GitHub conectado');
      } else {
        setGhConnected(false);
        setStatus(`error: ${data.error}`);
        toast.error(data.error);
      }
    } catch (err) {
      setStatus(`error: ${err.message}`);
      toast.error(err.message);
    }
    setTimeout(() => setStatus(''), 4000);
  };

  const createBackup = async () => {
    if (!backupPassword) { setStatus('configura una contraseña primero'); toast.warning('Configura una contraseña'); setTimeout(() => setStatus(''), 3000); return; }
    setStatus('creando_backup');
    try {
      const res = await fetch(`${API_BACKUPS}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: backupPassword })
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`backup creado: ${data.filename}`);
        toast.success('Backup creado exitosamente');
        await saveSetting('backup_password', backupPassword);
        fetchBackups();
      } else {
        setStatus(`error: ${data.error}`);
        toast.error(data.error);
      }
    } catch (err) {
      setStatus(`error: ${err.message}`);
      toast.error(err.message);
    }
    setTimeout(() => setStatus(''), 4000);
  };

  const verifyBackup = async (filename) => {
    const pwd = prompt('Ingresa la contraseña del backup para verificar:');
    if (!pwd) return;
    try {
      const res = await fetch(`${API_BACKUPS}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, password: pwd })
      });
      const data = await res.json();
      if (data.valid) {
        toast.success(`Backup válido - ${data.tables.length} tablas, ${Object.values(data.tableCounts).reduce((a,b)=>a+b,0)} registros`);
      } else {
        toast.error(`Backup inválido: ${data.error}`);
      }
    } catch (err) {
      toast.error('Error al verificar');
    }
  };

  const restoreBackup = async (filename) => {
    const pwd = prompt('Ingresa la contraseña del backup para restaurar:');
    if (!pwd) return;
    if (!confirm(`¿Restaurar desde ${filename}? Se perderán los datos actuales.`)) return;
    setStatus('restaurando');
    try {
      const res = await fetch(`${API_BACKUPS}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, password: pwd })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('restaurado correctamente — recargando...');
        toast.success('Backup restaurado. Recargando...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus(`error: ${data.error}`);
        toast.error(data.error);
      }
    } catch (err) {
      setStatus(`error: ${err.message}`);
      toast.error(err.message);
    }
    setTimeout(() => setStatus(''), 5000);
  };

  const deleteBackup = async (filename) => {
    if (!confirm(`¿Eliminar ${filename}?`)) return;
    await fetch(`${API_BACKUPS}/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    fetchBackups();
    toast.success('Backup eliminado');
  };

  const syncToGithub = async () => {
    if (!githubToken || !githubRepo || !backupPassword) {
      setStatus('completa token, repo y contraseña primero');
      toast.warning('Completa token, repo y contraseña');
      setTimeout(() => setStatus(''), 3000);
      return;
    }
    setSyncing(true);
    setStatus('sincronizando_a_github');
    try {
      const res = await fetch(`${API_GITHUB}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`sincronizado! ${data.release || ''}`);
        toast.success('Sincronizado con GitHub');
        fetchBackups();
      } else {
        setStatus(`error: ${data.error}`);
        toast.error(data.error);
      }
    } catch (err) {
      setStatus(`error: ${err.message}`);
      toast.error(err.message);
    }
    setSyncing(false);
    setTimeout(() => setStatus(''), 5000);
  };

  const saveAutoBackupConfig = () => {
    saveSetting('auto_backup_interval', autoBackupInterval);
    saveSetting('auto_backup_retention', autoBackupRetention);
    toast.success('Configuración de auto-backup guardada (aplicará al reiniciar)');
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('es-AR') : '-';
  const formatSize = (s) => s > 1024 ? `${(s / 1024).toFixed(1)} KB` : `${s} B`;

  const btnStyle = (bg) => ({ background: bg, color: 'white', padding: '8px 18px', fontSize: 13, fontWeight: 500, borderRadius: 6 });
  const inputStyle = { width: '100%', padding: '8px 12px', fontSize: 13 };
  const sectionStyle = { marginBottom: 24 };
  const labelStyle = { fontSize: 11, fontWeight: 600, color: '#9ca3af', display: 'block', marginBottom: 4 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 24 }}>⚙</span>
        <h2 style={{ fontSize: 18, color: '#e8e9ed' }}>Configuración</h2>
      </div>

      {status && (
        <div style={{ background: '#1a1b26', border: '1px solid #2a2c38', borderRadius: 6, padding: '8px 14px', marginBottom: 16, fontSize: 13, color: status.includes('error') ? '#f87171' : '#34d399' }}>
          {status}
        </div>
      )}

      {/* Health Status */}
      {health && (
        <div className="card" style={sectionStyle}>
          <h3 style={{ fontSize: 15, color: '#e0e1e6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>❤</span> Estado del Sistema
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 12, color: '#c8c9d0' }}>
            <div style={{ background: '#0c0d11', padding: '8px 12px', borderRadius: 6 }}>
              <span style={{ color: '#9ca3af', display: 'block', fontSize: 10 }}>BACKUPS TOTALES</span>
              <span style={{ fontSize: 18, fontWeight: 700 }}>{health.totalBackups}</span>
            </div>
            <div style={{ background: '#0c0d11', padding: '8px 12px', borderRadius: 6 }}>
              <span style={{ color: '#9ca3af', display: 'block', fontSize: 10 }}>AUTO-BACKUP</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>c/{health.config.autoBackupInterval} min</span>
            </div>
            <div style={{ background: '#0c0d11', padding: '8px 12px', borderRadius: 6 }}>
              <span style={{ color: '#9ca3af', display: 'block', fontSize: 10 }}>RETENCIÓN</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>últimos {health.config.autoBackupRetention}</span>
            </div>
          </div>
          {health.latestBackup && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#6b6d7b' }}>
              Último backup: {health.latestBackup.filename} ({formatDate(health.latestBackup.date)})
            </div>
          )}
        </div>
      )}

      {/* Auto-Backup Configuration */}
      <div className="card" style={sectionStyle}>
        <h3 style={{ fontSize: 15, color: '#e0e1e6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⏱</span> Auto-Backup Programado
        </h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Intervalo (minutos)</label>
            <input
              type="number"
              min="5"
              max="1440"
              style={{ width: 120, padding: '6px 8px' }}
              value={autoBackupInterval}
              onChange={e => setAutoBackupInterval(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Retención (backups)</label>
            <input
              type="number"
              min="3"
              max="100"
              style={{ width: 120, padding: '6px 8px' }}
              value={autoBackupRetention}
              onChange={e => setAutoBackupRetention(e.target.value)}
            />
          </div>
          <button style={btnStyle('#2563eb')} onClick={saveAutoBackupConfig}>Guardar Config</button>
        </div>
        <p style={{ fontSize: 11, color: '#6b6d7b', marginTop: 8 }}>
          Los cambios se aplicarán al reiniciar el servidor. Backup automático también se crea antes de cada modificación.
        </p>
      </div>

      {/* GitHub Connection */}
      <div className="card" style={sectionStyle}>
        <h3 style={{ fontSize: 15, color: '#e0e1e6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔗</span> Conexión GitHub
          {ghConnected && <span style={{ fontSize: 11, color: '#34d399', background: '#064e3b', padding: '2px 8px', borderRadius: 10 }}>conectado {ghUser}</span>}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Token GitHub</label>
            <input style={inputStyle} type="password" placeholder="ghp_..." value={githubToken} onChange={e => setGithubToken(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Repositorio (owner/repo)</label>
            <input style={inputStyle} placeholder="ej: usuario/supremas-backups" value={githubRepo} onChange={e => setGithubRepo(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnStyle('#2563eb')} onClick={testGithub}>Probar Conexión</button>
          <button style={{ ...btnStyle('#2a2c38'), color: '#9ca3af', border: '1px solid #3a3c48' }} onClick={() => { saveSetting('github_token', githubToken); saveSetting('github_repo', githubRepo); toast.success('Configuración guardada'); }}>Guardar</button>
        </div>
      </div>

      {/* Backup Password */}
      <div className="card" style={sectionStyle}>
        <h3 style={{ fontSize: 15, color: '#e0e1e6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔐</span> Contraseña de Respaldo
        </h3>
        <p style={{ fontSize: 12, color: '#6b6d7b', marginBottom: 8 }}>Usada para encriptar/desencriptar backups.</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ ...inputStyle, maxWidth: 300 }} type="password" placeholder="Contraseña para backups" value={backupPassword} onChange={e => setBackupPassword(e.target.value)} />
          <button style={btnStyle('#2a2c38')} onClick={() => { saveSetting('backup_password', backupPassword); toast.success('Contraseña guardada'); }}>Guardar</button>
        </div>
      </div>

      {/* Backups */}
      <div className="card" style={sectionStyle}>
        <h3 style={{ fontSize: 15, color: '#e0e1e6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>💾</span> Gestión de Backups
        </h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button style={btnStyle('#16a34a')} onClick={createBackup}>Crear Backup Encriptado</button>
          <button style={{ ...btnStyle('#2563eb'), opacity: syncing ? 0.6 : 1 }} onClick={syncToGithub} disabled={syncing}>
            {syncing ? 'Sincronizando...' : 'Sincronizar con GitHub'}
          </button>
        </div>

        {backups.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b6d7b', padding: 12, textAlign: 'center' }}>Sin backups todavía</p>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '35vh', overflowY: 'auto' }}>
            <table style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th style={{ width: 80 }}>Tamaño</th>
                  <th style={{ width: 160 }}>Fecha</th>
                  <th style={{ width: 180 }}></th>
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.filename}>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{b.filename}</td>
                    <td style={{ fontSize: 12 }}>{formatSize(b.size)}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(b.date)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-primary btn-sm" onClick={() => verifyBackup(b.filename)} title="Verificar integridad">✓</button>
                        <a href={`${API_BACKUPS}/download/${encodeURIComponent(b.filename)}`} className="btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-block', color: 'white' }}>⬇</a>
                        <button className="btn-primary btn-sm" onClick={() => restoreBackup(b.filename)}>↻</button>
                        <button className="btn-danger btn-sm" onClick={() => deleteBackup(b.filename)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
