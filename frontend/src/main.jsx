import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function startApp() {
  // GitHub Pages mode: intercept /api/* fetch calls and route through GitHub API
  if (import.meta.env.VITE_GITHUB_MODE) {
    const { githubApiFetch } = await import('./github-api-fetch');
    const origFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (url.startsWith('/api/') || url.startsWith('api/')) {
        return githubApiFetch(url.startsWith('api/') ? '/' + url : url, init);
      }
      return origFetch(input, init);
    };
  }

  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', Roboto, sans-serif;
      background: #0c0d11;
      color: #c8c9d0;
    }
    input, select, button, textarea { font-family: inherit; font-size: inherit; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #23252e; white-space: nowrap; }
    th {
      background: #16171e;
      font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
      color: #6b6d7b; position: sticky; top: 0; z-index: 1;
    }
    tr:hover td { background: #1a1b26; }
    tbody tr td { color: #c8c9d0; }
    input, select {
      border: 1px solid #2a2c38; border-radius: 6px; padding: 6px 10px; width: 100%;
      background: #1a1b26; color: #e0e1e6; font-size: 13px;
    }
    input:focus, select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.25); }
    button { cursor: pointer; border: none; border-radius: 6px; padding: 7px 16px; font-size: 13px; font-weight: 500; transition: all 0.15s; }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-success { background: #16a34a; color: white; }
    .btn-success:hover { background: #15803d; }
    .btn-sm { padding: 5px 10px; font-size: 11px; border-radius: 4px; }
    .card {
      background: #121318; border-radius: 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
      padding: 20px; margin-bottom: 16px; border: 1px solid #1e2029;
    }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0c0d11; }
    ::-webkit-scrollbar-thumb { background: #2a2c38; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #3a3c48; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .save-indicator { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; transition: all 0.2s; }
  `;
  document.head.appendChild(style);

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
startApp();
