const { Hono } = require('hono');
const { HTTPException } = require('hono/http-exception');
const { serveStatic } = require('@hono/node-server/serve-static');
const logger = require('../lib/logger');
const auth = require('./auth');
const { buildPageApp } = require('./pages');
const { buildApiApp } = require('./api');

function createApp() {
  const app = new Hono();

  auth.ensureAccountFromEnv();

  app.use('/static/*', serveStatic({
    root: './public',
    rewriteRequestPath: (path) => path.replace(/^\/static\//, '')
  }));

  app.use('/manifest.json', serveStatic({ path: './public/manifest.json' }));
  app.use('/sw.js', serveStatic({ path: './public/sw.js' }));
  app.use('/icon-192.png', serveStatic({ path: './public/icon-192.png' }));
  app.use('/icon-512.png', serveStatic({ path: './public/icon-512.png' }));
  app.use('/icon-maskable-192.png', serveStatic({ path: './public/icon-maskable-192.png' }));
  app.use('/icon-maskable-512.png', serveStatic({ path: './public/icon-maskable-512.png' }));
  app.use('/icon.svg', serveStatic({ path: './public/icon.svg' }));
  app.use('/icon-maskable.svg', serveStatic({ path: './public/icon-maskable.svg' }));

  app.use('*', auth.authMiddleware);

  app.use('*', async (c, next) => {
    logger.info(`${c.req.method} ${c.req.path}`);
    await next();
  });

  app.route('', buildPageApp());
  app.route('/api', buildApiApp());

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    logger.error(err.stack || err.message || err);
    return c.text('Internal Server Error', 500);
  });

  return app;
}

module.exports = { createApp };
