import { Router } from 'express';
import { getDb, getToken } from '../database.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = join(__dirname, '..', 'backups');
if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

const router = Router();

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

// Test GitHub connection
router.post('/test', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const ghRes = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
    });
    if (!ghRes.ok) {
      const err = await ghRes.json();
      return res.status(400).json({ error: err.message || 'Invalid token' });
    }
    const user = await ghRes.json();
    res.json({ success: true, login: user.login, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync all data JSON files directly to GitHub repo
router.post('/sync-data', async (req, res) => {
  try {
    const db = getDb();
    const allSettings = db.prepare(`SELECT * FROM settings`).all();
    const config = {};
    for (const s of allSettings) config[s.key] = s.value;

    const token = getToken() || config.github_token;
    const repo = config.github_repo;
    if (!token) return res.status(400).json({ error: 'GitHub token not configured' });
    if (!repo) return res.status(400).json({ error: 'GitHub repo not configured (format: owner/repo)' });

    const tables = ['categories', 'combo_items', 'customers', 'delivery_zones', 'orders', 'payment_methods', 'price_list_labels', 'price_lists', 'products', 'sales_channels', 'settings'];
    const results = [];

    // Cache SHAs for all files first
    const shaCache = {};
    for (const table of tables) {
      try {
        const url = `https://api.github.com/repos/${repo}/contents/data/${table}.json`;
        const getRes = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
        });
        if (getRes.ok) {
          const fileInfo = await getRes.json();
          shaCache[table] = fileInfo.sha;
        }
      } catch {}
    }

    for (const table of tables) {
      try {
        const data = db.prepare(`SELECT * FROM ${table}`).all();
        const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');

        const url = `https://api.github.com/repos/${repo}/contents/data/${table}.json`;
        const putBody = {
          message: `Sync ${table} from Supremas`,
          content,
          sha: shaCache[table] || undefined
        };

        const putRes = await fetch(url, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
          body: JSON.stringify(putBody)
        });

        if (putRes.ok) {
          const updated = await putRes.json();
          shaCache[table] = updated.content?.sha;
          results.push({ table, status: 'ok', size: data.length });
        } else {
          const err = await putRes.json();
          results.push({ table, status: 'error', message: `${putRes.status}: ${err.message || 'Unknown'}` });
        }
      } catch (e) {
        results.push({ table, status: 'error', message: e.message });
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full sync: create encrypted backup and push to GitHub as release
router.post('/sync', async (req, res) => {
  try {
    const db = getDb();
    const settings = db.prepare(`SELECT * FROM settings`).all();
    const config = {};
    for (const s of settings) config[s.key] = s.value;

    const token = getToken() || config.github_token;
    const repo = config.github_repo;
    const password = config.backup_password;

    if (!token) return res.status(400).json({ error: 'GitHub token not configured' });
    if (!repo) return res.status(400).json({ error: 'GitHub repo not configured (format: owner/repo)' });
    if (!password) return res.status(400).json({ error: 'Backup password not configured' });

    // Create backup data
    const tables = ['products', 'price_lists', 'payment_methods', 'sales_channels', 'delivery_zones', 'customers', 'orders', 'settings'];
    const backup = {};
    for (const table of tables) {
      try { backup[table] = db.prepare(`SELECT * FROM ${table}`).all(); } catch (e) { backup[table] = []; }
    }
    backup._metadata = {
      exported_at: new Date().toISOString(),
      version: '1.0',
      app: 'Supremas'
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const salt = crypto.randomBytes(16);
    const key = deriveKey(password, salt);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(jsonStr, 'utf8'), cipher.final()]);
    const payload = Buffer.concat([salt, iv, encrypted]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `supremas-backup-${timestamp}.enc`;
    const filepath = join(BACKUP_DIR, filename);
    writeFileSync(filepath, payload);

    // Create GitHub release
    const tagName = `backup-${timestamp}`;
    const releaseRes = await fetch(`https://api.github.com/repos/${repo}/releases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tag_name: tagName,
        name: `Backup ${new Date().toLocaleDateString('es-AR')}`,
        body: `Backup automático de Supremas - ${new Date().toLocaleString('es-AR')}`,
        draft: false,
        prerelease: false
      })
    });

    if (!releaseRes.ok) {
      const err = await releaseRes.json();
      // If release already exists (same tag), try to get it
      if (releaseRes.status === 422) {
        // Get existing release by tag
        const getRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tagName}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
        });
        if (getRes.ok) {
          const existing = await getRes.json();
          // Upload asset to existing release
          const assetUrl = `https://uploads.github.com/repos/${repo}/releases/${existing.id}/assets?name=${encodeURIComponent(filename)}`;
          const assetRes = await fetch(assetUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/octet-stream',
              'Content-Length': payload.length.toString()
            },
            body: payload
          });
          if (!assetRes.ok) {
            const assetErr = await assetRes.json();
            return res.status(500).json({ error: assetErr.message || 'Failed to upload asset' });
          }
          return res.json({ success: true, filename, release: existing.html_url });
        }
      }
      return res.status(500).json({ error: err.message || 'Failed to create release' });
    }

    const release = await releaseRes.json();

    // Upload backup as release asset
    const assetUrl = `https://uploads.github.com/repos/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(filename)}`;
    const assetRes = await fetch(assetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/octet-stream',
        'Content-Length': payload.length.toString()
      },
      body: payload
    });

    if (!assetRes.ok) {
      const assetErr = await assetRes.json();
      return res.status(500).json({ error: assetErr.message || 'Failed to upload asset' });
    }

    res.json({ success: true, filename, release: release.html_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
