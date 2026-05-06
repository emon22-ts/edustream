// src/services/telemetry.js
// Application Insights wrapper for custom events and metrics
// Drives the App Insights dashboard - the "advanced feature" demo

let appInsights = null;
let client = null;

function init(connectionString) {
  if (!connectionString) {
    console.log('[Telemetry] App Insights connection string not set - telemetry disabled');
    return;
  }

  appInsights = require('applicationinsights');
  appInsights.setup(connectionString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .setSendLiveMetrics(true)
    .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
    .start();

  client = appInsights.defaultClient;
  client.context.tags[client.context.keys.cloudRole] = 'edustream-api';

  console.log('[Telemetry] Application Insights enabled');
}

function trackEvent(name, properties = {}, metrics = {}) {
  if (!client) return;
  client.trackEvent({ name, properties, measurements: metrics });
}

function trackException(error, properties = {}) {
  if (!client) return;
  client.trackException({ exception: error, properties });
}

function trackMetric(name, value, properties = {}) {
  if (!client) return;
  client.trackMetric({ name, value, properties });
}

// Express middleware that records custom request metadata
function middleware() {
  return (req, res, next) => {
    if (!client) return next();
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      trackMetric('ApiRequestDuration', duration, {
        path: req.route?.path || req.path,
        method: req.method,
        status: String(res.statusCode)
      });
      if (res.statusCode >= 400) {
        trackEvent('ApiError', {
          path: req.path,
          method: req.method,
          status: String(res.statusCode)
        });
      }
    });
    next();
  };
}

module.exports = { init, trackEvent, trackException, trackMetric, middleware };
