import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST || 'db';         // docker-compose uses 'db'; ECS task can use 'localhost'
const DB_USER = process.env.DB_USER || 'appuser';
const DB_PASSWORD = process.env.DB_PASSWORD || 'appsecret';
const DB_NAME = process.env.DB_NAME || 'company';
const DB_PORT = Number(process.env.DB_PORT || 5432);

app.use(express.json());
// Allow CORS for local dev only
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: ['http://localhost:8081','http://127.0.0.1:8081'], credentials: false }));
}

const pool = new Pool({
  host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, port: DB_PORT,
  max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000
});

async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS employees (
    id   VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL
  );`);
}

app.get('/api/health', async (req,res) => {
  try {
    await pool.query('SELECT 1 as ok');
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'db-failed', error: String(e) });
  }
});

app.get('/api/employees', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, name FROM employees ORDER BY id ASC');
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to list employees' });
  }
});

app.post('/api/employees', async (req, res) => {
  const { id, name } = req.body || {};
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });
  try {
    await pool.query('INSERT INTO employees (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name', [id, name]);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save employee' });
  }
});

app.listen(PORT, async () => {
  await ensureTable();
  console.log(`Backend listening on :${PORT}`);
});
