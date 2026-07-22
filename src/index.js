require('dotenv').config();

const { serve } = require('@hono/node-server');
const { createApp } = require('./server');
const { initDb } = require('./db');

initDb();

const port = process.env.PORT || 9595;
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Respondr Hono server running on http://localhost:${info.port}`);
});
