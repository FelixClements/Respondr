const { Hono } = require('hono');

function createApp() {
  const app = new Hono();

  app.get('/', (c) => c.html('<h1>Respondr</h1><p>Hono placeholder is running.</p>'));

  app.onError((err, c) => {
    console.error(err);
    return c.text('Internal Server Error', 500);
  });

  return app;
}

module.exports = { createApp };
