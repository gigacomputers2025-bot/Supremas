import React, { useState, useEffect, useCallback } from 'react';

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

  useEffect(() => {
    fetch(API_SETTINGS).then(r => r.json()).then(data => {
      if (data.github_token) setGithubToken(data.github_token);
      if (data.github_repo) setGithubRepo(data.github_repo);
      if (data.backup_password) setBackupPassword(data.backup_password);
    }).catch(() => {});
    fetchBackups();
  }, []);

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch(`${API_BACKUPS}/list`);
      setBackups(await res.json());
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
      } else {
        setGhConnected(false);
        setStatus(`error: ${data.error}`);
      }
    } catch (err) {
      setStatus(`error: ${err.message}`);
    }
    setTimeout(() => setStatus(''), 4000);
  };

  const createBackup = async () => {
    if (!backupPassword) { setStatus('configura una contraseña primero'); setTimeout(() => setStatus(''), 3000); return; }
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
        await saveSetting('backup_password', backupPassword);
        fetchBackups();
      } else {
        setStatus(`error: ${data.error}`);
      }
    } catch (err) {
      setStatus(`error: ${err.message}`);
    }
    setTimeout(() => setStatus(''), 4000);
  };

  const restoreBackup = async (filename) => {
    const pwd = prompt('Ingresa la contraseña del backup para restaurar:');
    if (!pwd) return;
    if (!confirm(`Restaurar desde ${filename}? Se perderán los datos actuales.`)) return;
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
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatus(`error: ${data.error}`);
      }
    } catch (err) {
      setStatus(`error: ${err.message}`);
    }
    setTimeout(() => setStatus(''), 5000);
  };

  const deleteBackup = async (filename) => {
    if (!confirm(`Eliminar ${filename}?`)) return;
    await fetch(`${API_BACKUPS}/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    fetchBackups();
  };

  const syncToGithub = async () => {
    if (!githubToken || !githubRepo || !backupPassword) {
      setStatus('completa token, repo y contraseña primero');
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
        fetchBackups();
      } else {
        setStatus(`error: ${data.error}`);
      }
    } catch (err) {
      setStatus(`error: ${err.message}`);
    }
    setSyncing(false);
    setTimeout(() => setStatus(''), 5000);
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
          <button style={{ ...btnStyle('#2a2c38'), color: '#9ca3af', border: '1px solid #3a3c48' }} onClick={() => { saveSetting('github_token', githubToken); saveSetting('github_repo', githubRepo); setStatus('guardado'); setTimeout(() => setStatus(''), 2000); }}>Guardar</button>
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
          <button style={btnStyle('#2a2c38')} onClick={() => { saveSetting('backup_password', backupPassword); setStatus('contraseña guardada'); setTimeout(() => setStatus(''), 2000); }}>Guardar</button>
        </div>
      </div>

      {/* Backups */}
      <div className="card" style={sectionStyle}>
        <h3 style={{ fontSize: 15, color: '#e0e1e6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>💾</span> Gestión de Backups
        </h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={btnStyle('#16a34a')} onClick={createBackup}>Crear Backup Encriptado</button>
          <button style={{ ...btnStyle('#2563eb'), opacity: syncing ? 0.6 : 1 }} onClick={syncToGithub} disabled={syncing}>
            {syncing ? 'Sincronizando...' : 'Sincronizar con GitHub'}
          </button>
        </div>

        {backups.length === 0 ? (
          <p style={{ fontSize: 13, color: '#6b6d7b', padding: 12, textAlign: 'center' }}>Sin backups todavía</p>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '35vh', overflowY: 'auto' }}>
            <table style={{ minWidth: 500 }}>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th style={{ width: 80 }}>Tamaño</th>
                  <th style={{ width: 160 }}>Fecha</th>
                  <th style={{ width: 140 }}></th>
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
                        <a href={`${API_BACKUPS}/download/${encodeURIComponent(b.filename)}`} className="btn-primary btn-sm" style={{ textDecoration: 'none', display: 'inline-block' }}>⬇</a>
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
