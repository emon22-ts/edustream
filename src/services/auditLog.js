// src/services/auditLog.js
// Audit logging — every create/update/delete is logged to Table Storage

const { TableClient } = require('@azure/data-tables');
const { config } = require('../config');
const { v4: uuidv4 } = require('uuid');

let auditTable = null;

async function getAuditTable() {
  if (!auditTable) {
    auditTable = TableClient.fromConnectionString(config.storageConnectionString, 'auditlogs');
    try { await auditTable.createTable(); } catch(e) { if (e.statusCode !== 409) throw e; }
  }
  return auditTable;
}

async function log(action, userId, userName, resourceType, resourceId, details) {
  try {
    const table = await getAuditTable();
    await table.createEntity({
      partitionKey: resourceType,
      rowKey: uuidv4(),
      action,          // 'create', 'update', 'delete', 'login', 'register', 'ban'
      userId,
      userName,
      resourceType,    // 'course', 'comment', 'user'
      resourceId,
      details: JSON.stringify(details || {}),
      timestamp: new Date().toISOString(),
      ip: details?.ip || 'unknown'
    });
  } catch(e) {
    console.error('Audit log failed:', e.message);
    // Never throw — audit log failure should not break the request
  }
}

module.exports = { log };
