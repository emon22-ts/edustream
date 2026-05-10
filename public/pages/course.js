// pages/course.js
// Course detail page — full view, all media, comments, enroll

registerPage('course', async function(container, params) {
  if (!params.id) return navigate('home');

  container.innerHTML = `<div style="max-width:900px;margin:0 auto;padding:28px 28px 80px">
    <div style="font-size:13px;color:var(--ink-muted);margin-bottom:20px">
      <span onclick="navigate('home')" style="cursor:pointer;color:var(--amber)">Home</span>
      <span style="margin:0 6px">›</span>
      <span onclick="navigate('explore')" style="cursor:pointer;color:var(--amber)">Explore</span>
      <span style="margin:0 6px">›</span>
      <span id="breadcrumbTitle">Loading...</span>
    </div>
    <div id="courseDetailContent"><div style="padding:60px;text-align:center;color:var(--ink-muted)">Loading course...</div></div>
  </div>`;

  try {
    const course = await apiGet(`/courses/${params.id}`);
    const comments = await apiGet(`/courses/${params.id}/comments`);

    const breadcrumb = document.getElementById('breadcrumbTitle');
    if (breadcrumb) breadcrumb.textContent = course.title;

    document.title = `${course.title} — EduStream+`;

    const tags = (course.tags||[]).filter(Boolean).map(t => `<span style="border:1px solid var(--amber);color:var(--amber-deep);padding:3px 10px;border-radius:999px;font-size:12px;font-weight:500">${escapeHtml(t)}</span>`).join('');

    const counts = course.mediaCounts || {};
    const badges = Object.entries(counts).map(([type,n]) =>
      `<span style="background:var(--ink);color:var(--paper);padding:3px 10px;border-radius:999px;font-size:11px">${mediaIcon(type)} ${type} (${n})</span>`
    ).join('');

    document.getElementById('courseDetailContent').innerHTML = `
      <!-- HEADER -->
      <div style="background:var(--ink);border-radius:var(--radius-lg);padding:32px;margin-bottom:24px;color:var(--paper)">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${badges}</div>
        <h1 style="font-family:var(--serif);font-size:clamp(24px,4vw,40px);font-weight:500;line-height:1.1;margin-bottom:10px">${escapeHtml(course.title)}</h1>
        <p style="font-size:14px;opacity:0.7;font-style:italic;font-family:var(--serif);margin-bottom:16px">By <strong style="font-style:normal;opacity:1">${escapeHtml(course.instructor)}</strong> · ${escapeHtml(course.category||'General')} · ${formatDate(course.createdAt)}</p>
        ${course.description ? `<p style="font-size:15px;line-height:1.7;opacity:0.85;max-width:680px">${escapeHtml(course.description)}</p>` : ''}
        ${tags ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:16px">${tags}</div>` : ''}
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="enrollCourse('${course.id}')">📖 Enroll in this course</button>
          <button class="btn btn-secondary" style="border-color:rgba(255,255,255,0.3);color:rgba(255,255,255,0.8)" onclick="editCourse('${course.id}')">✏ Edit</button>
          <button class="btn btn-danger" style="border-color:rgba(255,255,255,0.3);color:rgba(255,255,255,0.6)" onclick="deleteCourseAndGoHome('${course.id}')">🗑 Delete</button>
        </div>
      </div>

      <!-- MEDIA SECTION -->
      ${course.media?.length ? `
      <div style="background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:24px;box-shadow:var(--shadow)">
        <div style="padding:16px 20px;border-bottom:1px solid var(--rule);display:flex;align-items:center;justify-content:space-between">
          <h2 style="font-family:var(--serif);font-size:18px;font-weight:500">Course Materials</h2>
          <span style="font-size:12px;color:var(--ink-muted);font-family:var(--mono)">${course.media.length} file${course.media.length!==1?'s':''}</span>
        </div>
        <div>${renderMediaViewer(course)}</div>
      </div>` : `
      <div class="empty-state" style="margin-bottom:24px">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No media yet</div>
        <div class="empty-text">No files have been uploaded for this course.</div>
      </div>`}

      <!-- DISCUSSION -->
      <div style="background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow)">
        <div style="padding:16px 20px;border-bottom:1px solid var(--rule);display:flex;align-items:center;justify-content:space-between">
          <h2 style="font-family:var(--serif);font-size:18px;font-weight:500">Discussion</h2>
          <span style="font-size:12px;color:var(--ink-muted);font-family:var(--mono)">${comments.length} comment${comments.length!==1?'s':''}</span>
        </div>
        <div style="padding:20px">
          <div id="detailCommentsList" style="margin-bottom:20px">
            ${comments.length ? comments.map(c => `
              <div style="border-left:2px solid var(--rule);padding:6px 0 6px 14px;margin-bottom:14px">
                <div style="font-size:12px;font-weight:600;margin-bottom:3px">${escapeHtml(c.authorName)} <span style="font-weight:400;color:var(--ink-muted);font-style:italic;font-family:var(--serif)">${formatRelative(c.createdAt)}</span></div>
                <div style="font-size:14px;color:var(--ink-soft);line-height:1.5">${escapeHtml(c.text)}</div>
              </div>`).join('') : '<div style="font-size:14px;color:var(--ink-muted);font-style:italic;font-family:var(--serif)">No comments yet. Be the first!</div>'}
          </div>
          <div style="display:flex;gap:10px">
            <input type="text" id="detailCommentInput" placeholder="Add a comment..." style="flex:1;padding:10px 14px;border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:13px;background:var(--paper-tint)" onkeypress="if(event.key==='Enter')detailAddComment('${course.id}')">
            <button class="btn btn-primary" onclick="detailAddComment('${course.id}')">Post</button>
          </div>
        </div>
      </div>`;

    // Add comment function for this page
    window.detailAddComment = async (courseId) => {
      if (!requireAuth()) return;
      const input = document.getElementById('detailCommentInput');
      const text = input?.value?.trim();
      if (!text) return;
      try {
        const comment = await apiPost(`/courses/${courseId}/comments`, { text });
        input.value = '';
        const list = document.getElementById('detailCommentsList');
        if (list) {
          const div = document.createElement('div');
          div.style.cssText = 'border-left:2px solid var(--rule);padding:6px 0 6px 14px;margin-bottom:14px';
          div.innerHTML = `<div style="font-size:12px;font-weight:600;margin-bottom:3px">${escapeHtml(comment.authorName)} <span style="font-weight:400;color:var(--ink-muted);font-style:italic;font-family:var(--serif)">just now</span></div><div style="font-size:14px;color:var(--ink-soft);line-height:1.5">${escapeHtml(comment.text)}</div>`;
          list.appendChild(div);
          // Remove "no comments" message if present
          const empty = list.querySelector('div[style*="font-style:italic"]');
          if (empty && empty.textContent.includes('No comments')) empty.remove();
        }
        toast('Comment posted', 'success');
      } catch(e) { toast(e.message, 'error'); }
    };

    window.deleteCourseAndGoHome = async (id) => {
      if (!requireAuth()) return;
      if (!confirm('Delete this course and all its media?')) return;
      try {
        await apiDelete(`/courses/${id}`);
        toast('Course deleted', 'success');
        navigate('home');
      } catch(e) { toast(e.message, 'error'); }
    };

  } catch(e) {
    document.getElementById('courseDetailContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Course not found</div>
        <div class="empty-text">${e.message}</div>
        <button class="btn btn-primary" style="margin-top:16px" onclick="navigate('home')">Go Home</button>
      </div>`;
  }
});
