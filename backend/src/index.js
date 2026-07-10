import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, syncPriceListLabels, getDb } from './database.js';
import { importFromExcel, exportToExcel } from './excel-sync.js';
import { auditMiddleware } from './middleware/auditLog.js';
import { runScheduledBackup, createSnapshotBackup, preMutationBackup } from './middleware/autoBackup.js';

import productsRouter from './routes/products.js';
import paymentsRouter from './routes/payments.js';
import channelsRouter from './routes/channels.js';
import zonesRouter from './routes/zones.js';
import ordersRouter from './routes/orders.js';
import customersRouter from './routes/customers.js';
import settingsRouter from './routes/settings.js';
import backupsRouter from './routes/backups.js';
import githubRouter from './routes/github.js';
import statsRouter from './routes/stats.js';
import categoriesRouter from './routes/categories.js';
import recuentoRouter from './routes/recuento.js';
import enviosRouter from './routes/envios.js';
import priceListsRouter from './routes/price-lists.js';
import seedRouter from './routes/seed.js';
import repartidoresRouter from './routes/repartidores.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Audit middleware (adds req.audit)
app.use(auditMiddleware);

// Pre-mutation auto-backup middleware
app.use('/api', preMutationBackup);

// Serve static frontend files
const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Initialize DB
initDatabase();

// Create startup backup before any operations
try {
  const startupBackup = createSnapshotBackup();
  if (startupBackup.success) {
    console.log(`[Startup] Backup automático: ${startupBackup.filename}`);
  }
} catch (err) {
  console.error('[Startup] Error creating startup backup:', err.message);
}

// Import data from Excel on startup
try {
  await importFromExcel();
  console.log('Data imported from Excel successfully');
} catch (err) {
  console.error('Error importing from Excel (file may not exist yet):', err.message);
}

// Sync price list labels from existing price data
syncPriceListLabels();

// Routes
app.use('/api/products', productsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/github', githubRouter);
app.use('/api/stats', statsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/price-lists', priceListsRouter);
app.use('/api/recuento', recuentoRouter);
app.use('/api/envios', enviosRouter);
app.use('/api/seed', seedRouter);
app.use('/api/repartidores', repartidoresRouter);

// Excel sync endpoints
app.post('/api/excel/export', async (req, res) => {
  try {
    // Auto-backup before export
    createSnapshotBackup();
    await exportToExcel();
    res.json({ success: true, message: 'Excel exported successfully' });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/excel/import', async (req, res) => {
  try {
    // Safety backup before destructive import
    createSnapshotBackup();
    await importFromExcel();
    res.json({ success: true, message: 'Data imported from Excel' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Supremas corriendo en http://localhost:${PORT}`);

  // Start scheduled auto-backup
  try {
    const db = getDb();
    const intervalSetting = db.prepare(`SELECT value FROM settings WHERE key = 'auto_backup_interval'`).get();
    const intervalMinutes = intervalSetting ? parseInt(intervalSetting.value, 10) : 30;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`[AutoBackup] Programado cada ${intervalMinutes} minutos`);

    // Run first backup after 1 minute, then at interval
    setTimeout(() => {
      runScheduledBackup();
      setInterval(() => {
        runScheduledBackup();
      }, intervalMs);
    }, 60000);
  } catch (err) {
    console.error('[AutoBackup] Error starting scheduler:', err.message);
    // Fallback: run every 30 minutes
    setInterval(() => runScheduledBackup(), 30 * 60 * 1000);
  }
});
