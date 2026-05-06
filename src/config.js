// src/config.js
// Loads configuration from Key Vault (production) or environment variables (local dev)

const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  keyVaultUrl: process.env.KEY_VAULT_URL,

  // Populated from Key Vault or env
  storageConnectionString: null,
  contentModeratorEndpoint: null,
  contentModeratorKey: null,
  cdnEndpoint: process.env.CDN_ENDPOINT || null,

  // Auth (Entra ID)
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  authEnabled: process.env.AUTH_ENABLED === 'true',

  appInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING
};

async function loadFromKeyVault() {
  if (!config.keyVaultUrl) {
    console.log('[Config] Key Vault URL not set — using env vars');
    return loadFromEnv();
  }

  try {
    console.log(`[Config] Loading secrets from Key Vault: ${config.keyVaultUrl}`);
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(config.keyVaultUrl, credential);

    const [storage, modEndpoint, modKey] = await Promise.all([
      client.getSecret('storage-connection-string').catch(() => null),
      client.getSecret('content-moderator-endpoint').catch(() => null),
      client.getSecret('content-moderator-key').catch(() => null)
    ]);

    config.storageConnectionString = storage?.value || process.env.STORAGE_CONNECTION_STRING;
    config.contentModeratorEndpoint = modEndpoint?.value || process.env.CONTENT_MODERATOR_ENDPOINT;
    config.contentModeratorKey = modKey?.value || process.env.CONTENT_MODERATOR_KEY;

    console.log('[Config] Secrets loaded from Key Vault successfully');
  } catch (err) {
    console.error('[Config] Key Vault load failed, falling back to env vars:', err.message);
    loadFromEnv();
  }
}

function loadFromEnv() {
  config.storageConnectionString = process.env.STORAGE_CONNECTION_STRING;
  config.contentModeratorEndpoint = process.env.CONTENT_MODERATOR_ENDPOINT;
  config.contentModeratorKey = process.env.CONTENT_MODERATOR_KEY;
}

function validate() {
  if (!config.storageConnectionString) {
    throw new Error('Missing STORAGE_CONNECTION_STRING — required for Blob Storage and Table Storage');
  }
}

module.exports = { config, loadFromKeyVault, validate };
