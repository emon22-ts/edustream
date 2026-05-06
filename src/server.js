// src/server.js
// EduStream+ main server entry point

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { config, loadFromKeyVault, validate } = require('./config');
const telemetry = require('./services/telemetry');
const tablestorage = require('./services/tablestorage');
const storage = require('./services/storage');
const { attachUser } = require('./middleware/auth');
const routes = require('./routes');

async function main() {
  telemetry.init(config.appInsightsConnectionString);

  await loadFromKeyVault();
  validate();

  await tablestorage.init();
  await storage.init();

  const app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://alcdn.msauth.net", "https://fonts.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        mediaSrc: ["'self'", "https://*.blob.core.windows.net", "https://*.azureedge.net"],
        connectSrc: ["'self'", "https://login.microsoftonline.com", "https://graph.microsoft.com"]
      }
    }
  }));

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('combined'));
  app.use(telemetry.middleware());
  app.use(attachUser);

  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again shortly' }
  });
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) return writeLimiter(req, res, next);
    next();
  });

  app.use('/api', routes);
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });

  app.use((err, req, res, next) => {
    console.error('[Error]', err);
    telemetry.trackException(err, { path: req.path, method: req.method });
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error'
    });
  });

  app.listen(config.port, () => {
    console.log(`\n=================================================`);
    console.log(`  EduStream+ running on port ${config.port}`);
    console.log(`  Environment: ${config.nodeEnv}`);
    console.log(`  Auth: ${config.authEnabled ? 'enabled' : 'disabled'}`);
    console.log(`  Key Vault: ${config.keyVaultUrl ? 'configured' : 'using env vars'}`);
    console.log(`  CDN: ${config.cdnEndpoint ? 'configured' : 'direct blob URLs'}`);
    console.log(`  App Insights: ${config.appInsightsConnectionString ? 'enabled' : 'disabled'}`);
    console.log(`  NoSQL: Azure Table Storage`);
    console.log(`=================================================\n`);
  });
}

main().catch(err => {
  console.error('[Fatal] Startup failed:', err);
  process.exit(1);
});
