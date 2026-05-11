// src/services/sas.js
// Generates SAS tokens for direct browser-to-blob uploads
// This bypasses the App Service for large files — no timeout risk

const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const { config } = require('../config');

function parseConn() {
  const conn = config.storageConnectionString;
  const account = conn.match(/AccountName=([^;]+)/)?.[1];
  const key = conn.match(/AccountKey=([^;]+)/)?.[1];
  if (!account || !key) throw new Error('Invalid storage connection string');
  return { account, key };
}

function getMediaType(mimeType) {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  throw new Error('Unsupported file type: ' + mimeType);
}

function getContainer(mediaType) {
  return mediaType + 's'; // videos, images, audio
}

async function generateUploadSAS(fileName, mimeType) {
  const { account, key } = parseConn();
  const mediaType = getMediaType(mimeType);
  const container = getContainer(mediaType);
  const blobName = uuidv4() + '-' + fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  const credential = new StorageSharedKeyCredential(account, key);
  
  // Generate SAS valid for 2 hours
  const expiresOn = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const sasToken = generateBlobSASQueryParameters({
    containerName: container,
    blobName: blobName,
    permissions: BlobSASPermissions.parse('cw'), // create + write
    startsOn: new Date(Date.now() - 60000), // 1 min ago to avoid clock skew
    expiresOn: expiresOn,
    contentType: mimeType,
  }, credential).toString();

  const uploadUrl = `https://${account}.blob.core.windows.net/${container}/${blobName}?${sasToken}`;
  const directUrl = `https://${account}.blob.core.windows.net/${container}/${blobName}`;

  return {
    uploadUrl,    // Use this to PUT the file directly
    directUrl,    // Use this to access the file after upload
    blobName,
    container,
    mediaType,
    originalName: fileName,
    mimeType,
    expiresOn: expiresOn.toISOString()
  };
}

module.exports = { generateUploadSAS };
