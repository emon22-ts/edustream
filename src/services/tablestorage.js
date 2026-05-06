// src/services/tablestorage.js
// Azure Table Storage NoSQL service - replaces Cosmos DB for cost-sensitive deployments
// Tables: courses, comments, enrollments
//
// Why Table Storage:
//   - Available on every Azure subscription (no regional policy restrictions)
//   - True NoSQL key-value store with PartitionKey/RowKey indexing
//   - Pay-per-request, ~£0.04/GB/month — student-budget friendly
//   - Same Storage Account as Blob, simplifying credential management

const { TableClient, AzureNamedKeyCredential, odata } = require('@azure/data-tables');
const { config } = require('../config');

let coursesTable, commentsTable, enrollmentsTable;

// Helper: parse connection string for credentials
function parseStorageConn() {
  const conn = config.storageConnectionString;
  const accountMatch = conn.match(/AccountName=([^;]+)/);
  const keyMatch = conn.match(/AccountKey=([^;]+)/);
  if (!accountMatch || !keyMatch) throw new Error('Invalid storage connection string');
  return { account: accountMatch[1], key: keyMatch[1] };
}

async function init() {
  const { account, key } = parseStorageConn();
  const credential = new AzureNamedKeyCredential(account, key);
  const tableUrl = `https://${account}.table.core.windows.net`;

  coursesTable = new TableClient(tableUrl, 'courses', credential);
  commentsTable = new TableClient(tableUrl, 'comments', credential);
  enrollmentsTable = new TableClient(tableUrl, 'enrollments', credential);

  // Idempotent — won't error if tables already exist
  await Promise.all([
    coursesTable.createTable().catch(e => { if (e.statusCode !== 409) throw e; }),
    commentsTable.createTable().catch(e => { if (e.statusCode !== 409) throw e; }),
    enrollmentsTable.createTable().catch(e => { if (e.statusCode !== 409) throw e; })
  ]);

  console.log('[TableStorage] Initialized: courses, comments, enrollments');
}

// Helpers: serialize complex fields (arrays, objects) as JSON strings
// because Table Storage only supports flat property types
function serialize(course) {
  const flat = { ...course };
  if (course.tags) flat.tagsJson = JSON.stringify(course.tags);
  if (course.media) flat.mediaJson = JSON.stringify(course.media);
  if (course.mediaCounts) flat.mediaCountsJson = JSON.stringify(course.mediaCounts);
  if (course.mediaTypes) flat.mediaTypesJson = JSON.stringify(course.mediaTypes);
  // Remove the nested originals — keep only the JSON string versions
  delete flat.tags;
  delete flat.media;
  delete flat.mediaCounts;
  delete flat.mediaTypes;
  return flat;
}

function deserialize(entity) {
  if (!entity) return null;
  const out = { ...entity };
  // Strip metadata properties that start with `odata.`
  delete out['odata.metadata'];
  delete out['odata.etag'];
  delete out.etag;
  delete out.timestamp;

  // Restore JSON-encoded fields
  if (entity.tagsJson) { try { out.tags = JSON.parse(entity.tagsJson); } catch { out.tags = []; } }
  if (entity.mediaJson) { try { out.media = JSON.parse(entity.mediaJson); } catch { out.media = []; } }
  if (entity.mediaCountsJson) { try { out.mediaCounts = JSON.parse(entity.mediaCountsJson); } catch { out.mediaCounts = {}; } }
  if (entity.mediaTypesJson) { try { out.mediaTypes = JSON.parse(entity.mediaTypesJson); } catch { out.mediaTypes = []; } }
  delete out.tagsJson;
  delete out.mediaJson;
  delete out.mediaCountsJson;
  delete out.mediaTypesJson;

  // PartitionKey/RowKey are Table Storage internals; expose 'id' instead
  out.id = entity.rowKey;
  delete out.partitionKey;
  delete out.rowKey;
  return out;
}

// ============================================================
// COURSES
// ============================================================
const Courses = {
  async list({ category, search, mediaType, limit = 50 } = {}) {
    const filters = [];
    if (category) filters.push(odata`category eq ${category}`);

    const queryOptions = filters.length ? { filter: filters.join(' and ') } : {};
    const results = [];
    let count = 0;

    for await (const entity of coursesTable.listEntities({ queryOptions })) {
      if (count >= limit * 2) break; // Over-fetch to allow client-side filtering
      const course = deserialize(entity);

      // Client-side filtering for fields that need text search or array contains
      if (search) {
        const searchLower = search.toLowerCase();
        const titleMatch = course.title?.toLowerCase().includes(searchLower);
        const descMatch = course.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descMatch) continue;
      }
      if (mediaType && !(course.mediaTypes || []).includes(mediaType)) continue;

      results.push(course);
      count++;
    }

    // Sort by createdAt descending
    results.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return results.slice(0, limit);
  },

  async get(id) {
    try {
      const entity = await coursesTable.getEntity('course', id);
      return deserialize(entity);
    } catch (e) {
      if (e.statusCode === 404) return null;
      throw e;
    }
  },

  async create(course) {
    const flat = serialize(course);
    const entity = {
      partitionKey: 'course',
      rowKey: course.id,
      ...flat
    };
    delete entity.id; // Don't double-store
    await coursesTable.createEntity(entity);
    return course;
  },

  async update(id, updates) {
    const existing = await this.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    const flat = serialize(merged);
    const entity = {
      partitionKey: 'course',
      rowKey: id,
      ...flat
    };
    delete entity.id;
    await coursesTable.updateEntity(entity, 'Replace');
    return merged;
  },

  async delete(id) {
    try {
      await coursesTable.deleteEntity('course', id);
      return true;
    } catch (e) {
      if (e.statusCode === 404) return false;
      throw e;
    }
  }
};

// ============================================================
// COMMENTS — partitioned by courseId for fast per-course queries
// ============================================================
const Comments = {
  async listForCourse(courseId) {
    const results = [];
    const queryOptions = { filter: odata`PartitionKey eq ${courseId}` };
    for await (const entity of commentsTable.listEntities({ queryOptions })) {
      results.push(deserialize(entity));
    }
    results.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return results;
  },

  async create(comment) {
    const entity = {
      partitionKey: comment.courseId,
      rowKey: comment.id,
      text: comment.text,
      authorId: comment.authorId,
      authorName: comment.authorName,
      createdAt: comment.createdAt
    };
    await commentsTable.createEntity(entity);
    return comment;
  },

  async delete(id, courseId) {
    try {
      await commentsTable.deleteEntity(courseId, id);
      return true;
    } catch (e) { return false; }
  }
};

// ============================================================
// ENROLLMENTS — partitioned by userId
// ============================================================
const Enrollments = {
  async listForUser(userId) {
    const results = [];
    const queryOptions = { filter: odata`PartitionKey eq ${userId}` };
    for await (const entity of enrollmentsTable.listEntities({ queryOptions })) {
      results.push(deserialize(entity));
    }
    return results;
  },

  async enroll(enrollment) {
    const entity = {
      partitionKey: enrollment.userId,
      rowKey: enrollment.id,
      courseId: enrollment.courseId,
      progressPct: enrollment.progressPct,
      enrolledAt: enrollment.enrolledAt
    };
    await enrollmentsTable.createEntity(entity);
    return enrollment;
  }
};

module.exports = { init, Courses, Comments, Enrollments };
