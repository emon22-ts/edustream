// pages/explore.js
// Explore page — browse all courses, advanced filters, sort, grid/list view

registerPage('explore', async function(container) {
  container.innerHTML = `
    <div class="explore-page" style="max-width:1280px;margin:0 auto;padding:28px 28px 80px">
      <div class="page-header">
        <h1 class="page-title">🧭 <em>Explore</em> Courses</h1>
        <p class="page-subtitle">Discover video lectures, illustrated notes, and audio recordings from the community.</p>
      </div>

      <!-- FILTERS -->
      <div class="explore-filters card" style="padding:20px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:12px;align-items:end">
        <div>
          <label style="display:block;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:var(--ink-soft);margin-bottom:5px">Search</label>
          <input type="search" id="exploreSearch" placeholder="Title or description..." style="width:100%;padding:9px 12px;border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:13px;background:var(--paper-tint)">
        </div>
        <div>
          <label style="display:block;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:var(--ink-soft);margin-bottom:5px">Category</label>
          <select id="exploreCat" style="width:100%;padding:9px 12px;border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:13px;background:var(--paper-tint)">
            <option value="">All categories</option>
            <option>General</option><option>Technology</option><option>Business</option>
            <option>Science</option><option>Arts</option><option>Humanities</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:var(--ink-soft);margin-bottom:5px">Sort by</label>
          <select id="exploreSort" style="width:100%;padding:9px 12px;border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:13px;background:var(--paper-tint)">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
            <option value="media">Most media</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="exploreLoad()">Search</button>
      </div>

      <!-- MEDIA TYPE PILLS -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
        <span style="font-size:12px;color:var(--ink-muted);align-self:center;margin-right:4px">Filter by media:</span>
        <button class="pill active" data-etype="" onclick="exploreSetType('')">All</button>
        <button class="pill" data-etype="video" onclick="exploreSetType('video')">🎬 Video</button>
        <button class="pill" data-etype="image" onclick="exploreSetType('image')">🖼 Image</button>
        <button class="pill" data-etype="audio" onclick="exploreSetType('audio')">🎵 Audio</button>
      </div>

      <!-- STATS BAR -->
      <div id="exploreStats" style="font-size:13px;color:var(--ink-muted);margin-bottom:16px;font-style:italic;font-family:var(--serif)">Loading courses...</div>

      <!-- CATEGORY CHIPS -->
      <div id="exploreCategoryChips" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px"></div>

      <!-- RESULTS GRID -->
      <div id="exploreGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px"></div>
    </div>`;

  let exploreMediaType = '';
  let allCourses = [];

  window.exploreSetType = (type) => {
    exploreMediaType = type;
    document.querySelectorAll('[data-etype]').forEach(p => p.classList.toggle('active', p.dataset.etype === type));
    exploreRender();
  };

  window.exploreLoad = async () => {
    showLoading();
    try {
      const search = document.getElementById('exploreSearch')?.value || '';
      const cat = document.getElementById('exploreCat')?.value || '';
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (cat) params.set('category', cat);
      allCourses = await apiGet(`/courses?${params}`);
      exploreRender();
      buildCategoryChips();
    } catch(e) { toast('Failed to load: ' + e.message, 'error'); }
    finally { hideLoading(); }
  };

  function buildCategoryChips() {
    const cats = [...new Set(allCourses.map(c => c.category).filter(Boolean))];
    const el = document.getElementById('exploreCategoryChips');
    if (!el || !cats.length) return;
    el.innerHTML = cats.map(cat => `
      <span onclick="document.getElementById('exploreCat').value='${cat}';exploreLoad()" style="padding:4px 12px;background:var(--paper-tint);border:1px solid var(--rule);border-radius:999px;font-size:12px;cursor:pointer;transition:all 0.12s" onmouseover="this.style.background='var(--paper-deep)'" onmouseout="this.style.background='var(--paper-tint)'">
        ${cat}
      </span>`).join('');
  }

  function exploreRender() {
    let courses = [...allCourses];

    // Filter by media type
    if (exploreMediaType) {
      courses = courses.filter(c => (c.mediaTypes || []).includes(exploreMediaType));
    }

    // Sort
    const sort = document.getElementById('exploreSort')?.value || 'newest';
    if (sort === 'newest') courses.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'oldest') courses.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sort === 'title') courses.sort((a,b) => a.title.localeCompare(b.title));
    else if (sort === 'media') courses.sort((a,b) => (b.media?.length||0) - (a.media?.length||0));

    const statsEl = document.getElementById('exploreStats');
    if (statsEl) statsEl.textContent = `Showing ${courses.length} of ${allCourses.length} courses`;

    const grid = document.getElementById('exploreGrid');
    if (!grid) return;

    if (!courses.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No courses found</div>
        <div class="empty-text">Try different filters or search terms.</div>
      </div>`;
      return;
    }

    grid.innerHTML = courses.map(c => {
      const counts = c.mediaCounts || {};
      const badges = Object.entries(counts).map(([t,n]) => `<span style="background:var(--ink);color:var(--paper);padding:2px 7px;border-radius:999px;font-size:10px">${mediaIcon(t)} ${n}</span>`).join(' ');
      const tags = (c.tags||[]).slice(0,3).map(t => `<span style="border:1px solid var(--amber);color:var(--amber-deep);padding:2px 7px;border-radius:999px;font-size:11px">${escapeHtml(t)}</span>`).join(' ');

      return `<div class="card" onclick="navigate('course',{id:'${c.id}'})" style="cursor:pointer;overflow:hidden;display:flex;flex-direction:column;transition:box-shadow 0.2s">
        <!-- Card image/media preview -->
        ${getExploreCardPreview(c)}
        <div style="padding:16px;flex:1;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <h3 style="font-family:var(--serif);font-size:17px;font-weight:500;line-height:1.3;color:var(--ink)">${escapeHtml(c.title)}</h3>
            <div style="display:flex;gap:4px;flex-shrink:0">${badges}</div>
          </div>
          <div style="font-size:12px;color:var(--ink-muted);font-style:italic;font-family:var(--serif)">By ${escapeHtml(c.instructor)}</div>
          ${c.description ? `<p style="font-size:13px;color:var(--ink-soft);line-height:1.5;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(c.description)}</p>` : ''}
          ${tags ? `<div style="display:flex;gap:4px;flex-wrap:wrap">${tags}</div>` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding-top:10px;border-top:1px dashed var(--rule)">
            <span style="font-size:11px;color:var(--ink-muted)">${formatRelative(c.createdAt)}</span>
            <span style="font-size:11px;color:var(--amber);font-weight:500">${escapeHtml(c.category||'General')}</span>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function getExploreCardPreview(c) {
    const images = (c.media||[]).filter(m => m.mediaType === 'image');
    const videos = (c.media||[]).filter(m => m.mediaType === 'video');
    if (images.length) {
      return `<div style="height:160px;overflow:hidden;background:var(--ink)"><img src="${images[0].cdnUrl||images[0].directUrl}" style="width:100%;height:100%;object-fit:cover;opacity:0.85"></div>`;
    }
    if (videos.length) {
      return `<div style="height:160px;background:var(--ink);display:flex;align-items:center;justify-content:center;font-size:40px">🎬</div>`;
    }
    const audios = (c.media||[]).filter(m => m.mediaType === 'audio');
    if (audios.length) {
      return `<div style="height:160px;background:var(--ink);display:flex;align-items:center;justify-content:center;font-size:40px">🎵</div>`;
    }
    return `<div style="height:160px;background:var(--paper-tint);display:flex;align-items:center;justify-content:center;font-size:40px;border-bottom:1px solid var(--rule)">📚</div>`;
  }

  // Add search on enter
  document.getElementById('exploreSearch')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') exploreLoad();
  });
  document.getElementById('exploreSort')?.addEventListener('change', exploreRender);

  // Initial load
  exploreLoad();
});
