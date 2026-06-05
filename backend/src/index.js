import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database.js';
import { importFromExcel, exportToExcel } from './excel-sync.js';

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend files
const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Initialize DB
initDatabase();

// Import data from Excel on startup
try {
  await importFromExcel();
  console.log('Data imported from Excel successfully');
} catch (err) {
  console.error('Error importing from Excel (file may not exist yet):', err.message);
}

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

// Excel sync endpoints
app.post('/api/excel/export', async (req, res) => {
  try {
    await exportToExcel();
    res.json({ success: true, message: 'Excel exported successfully' });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/excel/import', async (req, res) => {
  try {
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
});
