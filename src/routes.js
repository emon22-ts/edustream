// src/routes.js
// REST API — supports multi-media courses (videos, images, audio together)

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('./services/tablestorage');
const storage = require('./services/storage');
const moderator = require('./services/moderator');
const telemetry = require('./services/telemetry');
const { requireAuth } = require('./middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    service: 'edustream-api',
    version: '1.1.0',
    supportedMedia: Object.keys(storage.MEDIA_TYPES)
  });
});

router.get('/media-types', (req, res) => {
  const types = {};
  for (const [type, def] of Object.entries(storage.MEDIA_TYPES)) {
    types[type] = {
      icon: def.icon,
      maxSizeMB: def.maxSizeMB,
      acceptHeader: def.allowedMimes.join(',')
    };
  }
  res.json(types);
});

// COURSES
router.get('/courses', async (req, res, next) => {
  try {
    const { category, search, mediaType, limit } = req.query;
    const courses = await db.Courses.list({
      category, search, mediaType,
      limit: limit ? parseInt(limit) : 50
    });
    telemetry.trackEvent('CoursesListed', { count: String(courses.length) });
    res.json(courses);
  } catch (err) { next(err); }
});

router.get('/courses/:id', async (req, res, next) => {
  try {
    const course = await db.Courses.get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    telemetry.trackEvent('CourseViewed', { courseId: course.id });
    res.json(course);
  } catch (err) { next(err); }
});

router.post('/courses', requireAuth, upload.array('media', 5), async (req, res, next) => {
  try {
    const { title, description, instructor, category, tags } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const moderation = await moderator.moderateText(`${title} ${description || ''}`);
    if (!moderation.approved) {
      telemetry.trackEvent('ContentModerationBlocked', {
        reason: moderation.reason,
        categories: JSON.stringify(moderation.categories)
      });
      return res.status(400).json({ error: 'Content flagged by moderation', details: moderation.categories });
    }

    const mediaItems = [];
    if (req.files?.length) {
      for (const file of req.files) {
        const v = storage.validateFile(file);
        if (!v.valid) return res.status(400).json({ error: v.error, file: file.originalname });
      }
      const uploadStart = Date.now();
      const uploaded = await Promise.all(req.files.map(f => storage.uploadMedia(f)));
      mediaItems.push(...uploaded);
      telemetry.trackMetric('MediaUploadDuration', Date.now() - uploadStart, {
        fileCount: String(req.files.length),
        totalSize: String(req.files.reduce((s, f) => s + f.size, 0))
      });
    }

    const mediaCounts = mediaItems.reduce((acc, m) => {
      acc[m.mediaType] = (acc[m.mediaType] || 0) + 1;
      return acc;
    }, {});

    const course = {
      id: uuidv4(),
      title: title.trim(),
      description: description?.trim() || '',
      instructor: instructor?.trim() || (req.user?.name || 'Unknown'),
      category: category || 'General',
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : [],
      media: mediaItems,
      mediaCounts,
      mediaTypes: Object.keys(mediaCounts),
      createdBy: req.user?.id || 'anonymous',
      createdByName: req.user?.name || 'Anonymous',
      moderationStatus: moderation.reason,
      createdAt: new Date().toISOString()
    };

    const created = await db.Courses.create(course);
    telemetry.trackEvent('CourseCreated', {
      courseId: created.id,
      mediaCount: String(mediaItems.length),
      mediaTypes: course.mediaTypes.join(',')
    });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put('/courses/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, description, category, tags } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);

    if (updates.title || updates.description) {
      const moderation = await moderator.moderateText(`${updates.title || ''} ${updates.description || ''}`);
      if (!moderation.approved) {
        return res.status(400).json({ error: 'Content flagged by moderation', details: moderation.categories });
      }
    }

    const updated = await db.Courses.update(req.params.id, updates);
    if (!updated) return res.status(404).json({ error: 'Course not found' });
    telemetry.trackEvent('CourseUpdated', { courseId: req.params.id });
    res.json(updated);
  } catch (err) { next(err); }
});

router.post('/courses/:id/media', requireAuth, upload.array('media', 5), async (req, res, next) => {
  try {
    const course = await db.Courses.get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (!req.files?.length) return res.status(400).json({ error: 'No files provided' });

    for (const file of req.files) {
      const v = storage.validateFile(file);
      if (!v.valid) return res.status(400).json({ error: v.error, file: file.originalname });
    }

    const uploaded = await Promise.all(req.files.map(f => storage.uploadMedia(f)));
    const newMedia = [...(course.media || []), ...uploaded];
    const newCounts = newMedia.reduce((acc, m) => {
      acc[m.mediaType] = (acc[m.mediaType] || 0) + 1;
      return acc;
    }, {});

    const updated = await db.Courses.update(req.params.id, {
      media: newMedia,
      mediaCounts: newCounts,
      mediaTypes: Object.keys(newCounts)
    });
    telemetry.trackEvent('MediaAdded', { courseId: req.params.id, added: String(uploaded.length) });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/courses/:id/media/:blobName', requireAuth, async (req, res, next) => {
  try {
    const course = await db.Courses.get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const target = (course.media || []).find(m => m.blobName === req.params.blobName);
    if (!target) return res.status(404).json({ error: 'Media item not found' });

    await storage.deleteMedia(target);

    const newMedia = (course.media || []).filter(m => m.blobName !== req.params.blobName);
    const newCounts = newMedia.reduce((acc, m) => {
      acc[m.mediaType] = (acc[m.mediaType] || 0) + 1;
      return acc;
    }, {});

    const updated = await db.Courses.update(req.params.id, {
      media: newMedia,
      mediaCounts: newCounts,
      mediaTypes: Object.keys(newCounts)
    });
    telemetry.trackEvent('MediaRemoved', { courseId: req.params.id });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete('/courses/:id', requireAuth, async (req, res, next) => {
  try {
    const course = await db.Courses.get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.media?.length) await storage.deleteMultiple(course.media);
    await db.Courses.delete(req.params.id);
    telemetry.trackEvent('CourseDeleted', { courseId: req.params.id, mediaCount: String(course.media?.length || 0) });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) { next(err); }
});

// COMMENTS
router.get('/courses/:id/comments', async (req, res, next) => {
  try {
    const comments = await db.Comments.listForCourse(req.params.id);
    res.json(comments);
  } catch (err) { next(err); }
});

router.post('/courses/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text required' });

    const moderation = await moderator.moderateText(text);
    if (!moderation.approved) {
      return res.status(400).json({ error: 'Comment flagged by moderation', details: moderation.categories });
    }

    const comment = {
      id: uuidv4(),
      courseId: req.params.id,
      text: text.trim(),
      authorId: req.user?.id || 'anonymous',
      authorName: req.user?.name || 'Anonymous',
      createdAt: new Date().toISOString()
    };
    const created = await db.Comments.create(comment);
    telemetry.trackEvent('CommentPosted', { courseId: req.params.id });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.delete('/comments/:id', requireAuth, async (req, res, next) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'courseId query param required' });
    const ok = await db.Comments.delete(req.params.id, courseId);
    if (!ok) return res.status(404).json({ error: 'Comment not found' });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

// ENROLLMENTS
router.post('/courses/:id/enroll', requireAuth, async (req, res, next) => {
  try {
    const enrollment = {
      id: uuidv4(),
      userId: req.user?.id || 'anonymous',
      courseId: req.params.id,
      progressPct: 0,
      enrolledAt: new Date().toISOString()
    };
    const created = await db.Enrollments.enroll(enrollment);
    telemetry.trackEvent('UserEnrolled', { courseId: req.params.id });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.get('/users/me/enrollments', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const enrollments = await db.Enrollments.listForUser(userId);
    res.json(enrollments);
  } catch (err) { next(err); }
});

router.get('/auth/status', (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user || null,
    authEnabled: require('./config').config.authEnabled
  });
});

module.exports = router;
