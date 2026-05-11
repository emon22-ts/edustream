// src/services/storage.js
// Multi-media Azure Blob Storage service
// Supports videos, images, and audio with type-aware containers and validation

const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const { config } = require('../config');

// Media type definitions — drives validation, container routing, and thumbnails
const MEDIA_TYPES = {
  video: {
    container: 'videos',
    mimePrefixes: ['video/'],
    allowedMimes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'],
    maxSizeMB: 1024,
    icon: '🎬'
  },
  image: {
    container: 'images',
    mimePrefixes: ['image/'],
    allowedMimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxSizeMB: 100,
    icon: '🖼️'
  },
  audio: {
    container: 'audio',
    mimePrefixes: ['audio/'],
    allowedMimes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/aac'],
    maxSizeMB: 200,
    icon: '🎵'
  }
};

let blobServiceClient;
let containers = {};
let credential;
let accountName;

async function init() {
  blobServiceClient = BlobServiceClient.fromConnectionString(config.storageConnectionString);

  // Create one container per media type — better organisation, separate lifecycle policies
  for (const [type, def] of Object.entries(MEDIA_TYPES)) {
    const container = blobServiceClient.getContainerClient(def.container);
    await container.createIfNotExists({ access: 'blob' });
    containers[type] = container;
  }

  // Extract credential for SAS URL generation
  const match = config.storageConnectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/);
  if (match) {
    accountName = match[1];
    credential = new StorageSharedKeyCredential(match[1], match[2]);
  }

  console.log(`[Storage] Initialized containers: ${Object.values(MEDIA_TYPES).map(t => t.container).join(', ')}`);
}

// Detect which media type a file is, by its MIME
function detectMediaType(mimetype) {
  for (const [type, def] of Object.entries(MEDIA_TYPES)) {
    if (def.mimePrefixes.some(p => mimetype.startsWith(p))) {
      if (def.allowedMimes.includes(mimetype)) return type;
    }
  }
  return null;
}

// Validate a file against its detected type's constraints
function validateFile(file) {
  if (!file) return { valid: false, error: 'No file provided' };
  const type = detectMediaType(file.mimetype);
  if (!type) return { valid: false, error: `Unsupported media type: ${file.mimetype}` };
  const def = MEDIA_TYPES[type];
  if (file.size > def.maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File too large (max ${def.maxSizeMB} MB for ${type})` };
  }
  return { valid: true, type, def };
}

async function uploadMedia(file) {
  const validation = validateFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const { type, def } = validation;
  const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const blobName = `${Date.now()}-${safeName}`;
  const blockBlobClient = containers[type].getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype,
      blobCacheControl: 'public, max-age=31536000' // 1 year — aggressive cache for CDN
    },
    metadata: {
      originalName: encodeURIComponent(file.originalname),
      uploadedAt: new Date().toISOString(),
      mediaType: type
    }
  });

  // Use CDN URL if configured, otherwise direct blob URL
  const directUrl = blockBlobClient.url;
  const cdnUrl = config.cdnEndpoint
    ? directUrl.replace(/https:\/\/[^.]+\.blob\.core\.windows\.net/, config.cdnEndpoint)
    : directUrl;

  return {
    blobName,
    container: def.container,
    mediaType: type,
    mimeType: file.mimetype,
    directUrl,
    cdnUrl,
    size: file.size,
    originalName: file.originalname
  };
}

async function deleteMedia(mediaItem) {
  if (!mediaItem) return false;
  // Accepts either a media object or a raw URL string (backwards compat)
  const url = typeof mediaItem === 'string' ? mediaItem : (mediaItem.directUrl || mediaItem.cdnUrl);
  const container = typeof mediaItem === 'object' && mediaItem.container ? mediaItem.container : null;
  if (!url) return false;

  try {
    let containerName = container;
    let blobName;
    if (!containerName) {
      const m = url.match(/\.net\/([^/]+)\/(.+?)(?:\?|$)/);
      if (!m) return false;
      containerName = m[1];
      blobName = decodeURIComponent(m[2]);
    } else {
      const m = url.match(new RegExp(`/${containerName}/(.+?)(?:\\?|$)`));
      if (!m) return false;
      blobName = decodeURIComponent(m[1]);
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.deleteBlob(blobName);
    return true;
  } catch (e) {
    console.warn('[Storage] Delete failed:', e.message);
    return false;
  }
}

async function deleteMultiple(mediaItems = []) {
  const results = await Promise.all(mediaItems.map(m => deleteMedia(m)));
  return results.filter(Boolean).length;
}

function generateSasUrl(containerName, blobName, hours = 1) {
  if (!credential) return null;
  const expiresOn = new Date(Date.now() + hours * 60 * 60 * 1000);
  const sas = generateBlobSASQueryParameters({
    containerName,
    blobName,
    permissions: BlobSASPermissions.parse('r'),
    expiresOn
  }, credential).toString();
  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;
}

module.exports = {
  init,
  uploadMedia,
  deleteMedia,
  deleteMultiple,
  generateSasUrl,
  validateFile,
  detectMediaType,
  MEDIA_TYPES
};
