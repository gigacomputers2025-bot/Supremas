import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDb, setGithubToken } from './database.js';

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
import repartidoresRouter from './routes/repartidores.js';
import seedRouter from './routes/seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static frontend files
const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Initialize JSON data
initDatabase();

// Set GitHub token from settings if available
try {
  const db = getDb();
  const tokenSetting = db.prepare(`SELECT value FROM settings WHERE key = 'github_token'`).get();
  if (tokenSetting && tokenSetting.value) {
    setGithubToken(tokenSetting.value);
    console.log('GitHub token loaded from settings');
  }
} catch (e) {
  console.log('No GitHub token in settings');
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
app.use('/api/categories', categoriesRouter);
app.use('/api/price-lists', priceListsRouter);
app.use('/api/recuento', recuentoRouter);
app.use('/api/envios', enviosRouter);
app.use('/api/repartidores', repartidoresRouter);
app.use('/api/seed', seedRouter);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Supremas corriendo en http://localhost:${PORT}`);
});
