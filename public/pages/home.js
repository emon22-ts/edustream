// pages/home.js
async function apiGet(path) {
  const r = await fetch('/api' + path, {credentials:'include'});
  if (!r.ok) throw new Error(r.status);
  return r.json();
}
// pages/home.js - Home page with skeletons, autocomplete, image previews

async function apiPost(path, body, isFormData) {
  const opts = { method: 'POST' };
  if (isFormData) { opts.body = body; }
  else { opts.headers = {'Content-Type':'application/json'}; opts.body = JSON.stringify(body); }
  const r = await fetch('/api' + path, opts);
  return r.json();
}
async function apiPut(path, body) {
  const r = await fetch('/api' + path, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  return r.json();
}
async function apiDelete(path) {
  const r = await fetch('/api' + path, { method:'DELETE' });
  return r.json();
}
registerPage('home', async function(container) {
  container.innerHTML = `
    <div class="hero-band">
      <div class="hero-inner">
        <div class="hero-hl">
          A cloud library of <em>knowledge</em>,<br>
          delivered <em>on demand</em><span class="dot">.</span>
        </div>
        <div class="hero-stats">
          <div class="stat"><div class="stat-num" id="statCourses">—</div><div class="stat-label">Courses live</div></div>
          <div class="stat"><div class="stat-num">0</div><div class="stat-label">Failures</div></div>
          <div class="stat"><div class="stat-num">✓</div><div class="stat-label">Uptime</div></div>
        </div>
      </div>
    </div>

    <div class="home-main">
      <!-- SIDEBAR -->
      <aside class="sidebar" id="homeSidebar">
        <div class="s-card">
          <div class="s-head"><span class="s-head-title">My Learning</span></div>
          <div class="s-row" onclick="navigate('dashboard')"><div class="s-icon">📚</div><span class="s-label">My Courses</span><span class="s-badge" id="sideMyCount">—</span></div>
          <div class="s-row" onclick="navigate('dashboard',{tab:'enrolled'})"><div class="s-icon">🔖</div><span class="s-label">Enrolled</span><span class="s-badge" id="sideEnrolledCount">—</span></div>
          <div class="s-row" onclick="navigate('explore')"><div class="s-icon">🧭</div><span class="s-label">Explore All</span></div>
        </div>
        <div class="s-card">
          <div class="s-head"><span class="s-head-title">Featured this week</span></div>
          <div id="featuredList"><div class="feat-item"><div class="feat-title" style="color:var(--ink-muted);font-style:italic">Loading...</div></div></div>
        </div>
        <div class="s-card">
          <div class="s-head"><span class="s-head-title">Leaderboard</span></div>
          <div id="leaderboardList"><div class="lb-row"><span class="lb-name" style="color:var(--ink-muted);font-style:italic">Loading...</span></div></div>
        </div>
        <div class="streak-card">
          <div class="streak-top">
            <div class="streak-num" id="streakNumber">—</div>
            <div>
              <div class="streak-title">Day streak 🔥</div>
              <div class="streak-sub">Keep learning daily</div>
            </div>
          </div>
          <div class="streak-days" id="streakDays"></div>
          <div class="streak-msg" id="streakMsg">Loading your streak...</div>
        </div>
      </aside>

      <!-- CONTENT -->
      <div class="home-content">
        <!-- FILTER BAR -->
        <div class="filter-bar">
          <div class="search-wrap" style="flex:1;min-width:180px;position:relative">
            <input type="search" id="searchInput" placeholder="Search title or description..." oninput="homeDebounceSearch()" style="width:100%;padding:7px 11px;background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:13px;color:var(--ink)">
            <div id="acDropdown" class="autocomplete-dropdown" style="display:none"></div>
          </div>
          <select id="categoryFilter" onchange="homeLoadCourses()" style="padding:7px 11px;background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:13px">
            <option value="">All categories</option>
            <option>General</option><option>Technology</option><option>Business</option>
            <option>Science</option><option>Arts</option><option>Humanities</option>
          </select>
          <div class="pill-group" id="mediaFilterGroup">
            <button class="pill active" data-type="" onclick="homeSetFilter('')">All</button>
            <button class="pill" data-type="video" onclick="homeSetFilter('video')">🎬 Video</button>
            <button class="pill" data-type="image" onclick="homeSetFilter('image')">🖼 Image</button>
            <button class="pill" data-type="audio" onclick="homeSetFilter('audio')">🎵 Audio</button>
          </div>
        </div>

        <div class="two-col">
          <!-- UPLOAD PANEL -->
          <aside class="upload-panel">
            <h3 class="up-title">Contribute a course</h3>
            <p class="up-sub">Upload videos, images, and audio together.</p>
            <div class="field"><label>Title</label><input type="text" id="upTitle" placeholder="e.g. Foundations of Cloud Computing"></div>
            <div class="field"><label>Instructor</label><input type="text" id="upInstructor" placeholder="e.g. Dr. Patel"></div>
            <div class="field"><label>Description</label><textarea id="upDescription" placeholder="What will learners gain?"></textarea></div>
            <div class="field"><label>Category</label>
              <select id="upCategory">
                <option>General</option><option>Technology</option><option>Business</option>
                <option>Science</option><option>Arts</option><option>Humanities</option>
              </select>
            </div>
            <div class="field"><label>Tags (comma-separated)</label><input type="text" id="upTags" placeholder="azure, cloud, serverless"></div>
            <div class="field">
              <label>Media files (video 1GB · image 100MB · audio 200MB)</label>
              <div class="dropzone" id="upDropzone" onclick="document.getElementById('upMediaInput').click()">
                <div class="dz-icon">📥</div>
                <div class="dz-title">Drop files or click to browse</div>
                <div class="dz-hint">Up to 5 files · images show preview</div>
                <input type="file" id="upMediaInput" multiple accept="video/*,image/*,audio/*" style="display:none">
              </div>
              <!-- PREVIEW AREA -->
              <div id="upPreviewArea"></div>
            </div>
            <div id="upProgressWrap" style="display:none;margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-muted);margin-bottom:4px">
                <span id="upProgressLabel">Uploading...</span>
                <span id="upProgressPct">0%</span>
              </div>
              <div style="height:6px;background:var(--rule);border-radius:3px;overflow:hidden">
                <div id="upProgressBar" style="height:100%;background:var(--amber);width:0%;transition:width 0.3s;border-radius:3px"></div>
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;padding:11px" id="upCreateBtn" onclick="homeCreateCourse()">Publish course</button>
          </aside>

          <!-- LIBRARY -->
          <section>
            <div class="lib-hd">
              <h2 class="lib-title">The <em>Library</em></h2>
              <span class="lib-count" id="libCount">0 courses</span>
            </div>
            <div id="courseList"></div>
          </section>
        </div>
      </div>
    </div>`;

  // ── FILE HANDLING WITH PREVIEWS ──
  let selectedFiles = [];
  const input = document.getElementById('upMediaInput');
  const dropzone = document.getElementById('upDropzone');

  function updatePreviews() {
    renderFilePreviews(selectedFiles, 'upPreviewArea', removePreviewFile);
  }

  window.removePreviewFile = function(idx) {
    selectedFiles.splice(idx, 1);
    updatePreviews();
  };

  input.addEventListener('change', e => {
    selectedFiles = [...selectedFiles, ...Array.from(e.target.files)].slice(0, 5);
    updatePreviews();
    input.value = '';
  });

  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragging'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault(); dropzone.classList.remove('dragging');
    selectedFiles = [...selectedFiles, ...Array.from(e.dataTransfer.files)].slice(0, 5);
    updatePreviews();
  });

  // ── AUTOCOMPLETE ──
  const searchInput = document.getElementById('searchInput');
  const acDrop = document.getElementById('acDropdown');
  let acCourses = [];
  let acIdx = -1;

  searchInput.addEventListener('input', function() {
    homeDebounceSearch();
    const q = this.value.trim();
    if (!q) { acDrop.style.display = 'none'; return; }
    const matches = acCourses.filter(c =>
      c.title?.toLowerCase().includes(q.toLowerCase()) ||
      c.instructor?.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 7);
    if (!matches.length) { acDrop.style.display = 'none'; return; }
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    acDrop.innerHTML = matches.map(c => {
      const icon = mediaIcon(Object.keys(c.mediaCounts || {video:1})[0]);
      const title = escapeHtml(c.title).replace(re, '<span class="ac-highlight">$1</span>');
      return `<div class="autocomplete-item" onclick="navigate('course',{id:'${c.id}'});acDrop.style.display='none'">
        <span class="autocomplete-icon">${icon}</span>
        <div style="flex:1"><div class="autocomplete-title">${title}</div><div class="autocomplete-meta">${escapeHtml(c.instructor)} · ${escapeHtml(c.category||'General')}</div></div>
      </div>`;
    }).join('');
    acDrop.style.display = 'block';
  });

  searchInput.addEventListener('keydown', e => {
    const items = acDrop.querySelectorAll('.autocomplete-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); acIdx = Math.min(acIdx+1, items.length-1); items.forEach((el,i) => el.classList.toggle('ac-selected', i===acIdx)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); acIdx = Math.max(acIdx-1, -1); items.forEach((el,i) => el.classList.toggle('ac-selected', i===acIdx)); }
    else if (e.key === 'Enter' && acIdx >= 0) items[acIdx]?.click();
    else if (e.key === 'Escape') acDrop.style.display = 'none';
  });

  document.addEventListener('click', e => {
    if (!searchInput.contains(e.target) && !acDrop.contains(e.target)) acDrop.style.display = 'none';
  });

  // ── CREATE COURSE ──
  window.homeCreateCourse = async () => {
    if (!currentAccount) { showLoginModal(); return; }
    const title = document.getElementById('upTitle').value.trim();
    if (!title) return toast('Title is required', 'error');
    const btn = document.getElementById('upCreateBtn');
    const progressWrap = document.getElementById('upProgressWrap');
    btn.disabled = true;
    showLoading();

    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', document.getElementById('upDescription').value);
      fd.append('instructor', document.getElementById('upInstructor').value);
      fd.append('category', document.getElementById('upCategory').value);
      fd.append('tags', document.getElementById('upTags').value);
      btn.textContent = 'Creating course...';
      const course = await apiPost('/courses', fd, true);

      if (selectedFiles.length > 0) {
        progressWrap.style.display = 'block';
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const label = document.getElementById('upProgressLabel');
          const pct = document.getElementById('upProgressPct');
          const bar = document.getElementById('upProgressBar');
          if (label) label.textContent = `Uploading ${i+1}/${selectedFiles.length}: ${file.name.slice(0,25)}...`;
          btn.textContent = `Uploading ${i+1}/${selectedFiles.length}...`;
          try {
            const sasData = await apiPost('/upload/sas', { fileName: file.name, mimeType: file.type });
            await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.upload.onprogress = e => {
                if (e.lengthComputable) {
                  const p = Math.round((e.loaded/e.total)*100);
                  if (bar) bar.style.width = p + '%';
                  if (pct) pct.textContent = p + '%';
                }
              };
              xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed'));
              xhr.onerror = () => reject(new Error('Network error'));
              xhr.open('PUT', sasData.uploadUrl);
              xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
              xhr.setRequestHeader('Content-Type', file.type);
              xhr.send(file);
            });
            await apiPost('/upload/confirm', { courseId: course.id, blobName: sasData.blobName, container: sasData.container, mediaType: sasData.mediaType, originalName: sasData.originalName, mimeType: sasData.mimeType, directUrl: sasData.directUrl });
          } catch(uploadErr) { toast('Failed to upload ' + file.name + ': ' + uploadErr.message, 'error'); }
        }
        progressWrap.style.display = 'none';
      }

      ['upTitle','upInstructor','upDescription','upTags'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
      input.value = ''; selectedFiles = [];
      document.getElementById('upPreviewArea').innerHTML = '';
      toast('Course published! 🎉', 'success');
      homeLoadCourses();
    } catch(e) { toast(e.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Publish course'; hideLoading(); }
  };

  // ── SEARCH + FILTER ──
  let searchDebounce;
  window.homeDebounceSearch = () => { clearTimeout(searchDebounce); searchDebounce = setTimeout(homeLoadCourses, 300); };

  let homeMediaFilter = '';
  window.homeSetFilter = type => {
    homeMediaFilter = type;
    document.querySelectorAll('#mediaFilterGroup .pill').forEach(p => p.classList.toggle('active', p.dataset.type === type));
    homeLoadCourses();
  };


function renderCourseCard(c) {
  const progress = getProgress ? getProgress(c.id) : 0;
  const stars = renderStars ? renderStars(c.id) : '';
  const mediaIcons = (c.mediaTypes||[]).map(t=>t==='video'?'🎬':t==='image'?'🖼':'🎵').join(' ');
  return `<div class="card" style="margin-bottom:16px;padding:16px;border:1px solid var(--rule);border-radius:8px;background:var(--paper)">
    <div style="font-family:var(--serif);font-size:18px;font-weight:500;margin-bottom:4px">${escapeHtml(c.title||'Untitled')}</div>
    <div style="font-size:12px;color:var(--ink-muted);margin-bottom:8px">by ${escapeHtml(c.instructor||'')} · ${escapeHtml(c.category||'')} ${mediaIcons}</div>
    <div style="font-size:13px;color:var(--ink-soft);margin-bottom:10px">${escapeHtml((c.description||'').slice(0,120))}${(c.description||'').length>120?'…':''}</div>
    ${stars}
    ${progress>0?`<div style="height:4px;background:var(--rule);border-radius:2px;margin-top:8px"><div style="height:4px;background:var(--amber);width:${progress}%;border-radius:2px"></div></div>`:''}
    <div style="display:flex;gap:8px;margin-top:10px">
      <button onclick="navigate('course',{id:'${c.id}'})" style="flex:1;padding:7px;background:var(--amber);color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px">View</button>
      <button onclick="homeDeleteCourse('${c.id}')" style="padding:7px 12px;background:transparent;border:1px solid var(--rule);border-radius:4px;cursor:pointer;font-size:13px">Delete</button>
    </div>
  </div>`;
}

window.homeDeleteCourse = async function(id) {
  if (!confirm('Delete this course?')) return;
  await fetch('/api/courses/'+id, {method:'DELETE',credentials:'include'});
  homeLoadCourses();
  toast('Course deleted', 'success');
};

  window.homeLoadCourses = async () => {
    showLoading();
    showSkeletons('courseList', 3);
    try {
      const search = document.getElementById('searchInput')?.value || '';
      const category = document.getElementById('categoryFilter')?.value || '';
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (homeMediaFilter) params.set('mediaType', homeMediaFilter);
      let courses = await apiGet(`/courses?${params}`);
      acCourses = courses; // update autocomplete cache
      courses = Array.isArray(courses) ? courses : [];
      const count = courses.length;
      const libCount = document.getElementById('libCount');
      if (libCount) libCount.textContent = `${count} ${count===1?'course':'courses'}`;
      const statEl = document.getElementById('statCourses');
      if (statEl) statEl.textContent = count;
      const list = document.getElementById('courseList');
      if (!list) return;
      if (!courses.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">The library is empty</div><div class="empty-text">Be the first to publish a course.</div></div>`;
        return;
      }
      list.innerHTML = courses.map(c => renderCourseCard(c)).join('');
      courses.forEach(c => loadComments(c.id));
      loadSidebarData(courses);
    } catch(e) { toast('Failed to load courses: ' + e.message, 'error'); }
    finally { hideLoading(); }
  };

  homeLoadCourses();
});

async function loadSidebarData(courses) {
  if (!Array.isArray(courses)) courses = [];
  if (!courses) { try { courses = await apiGet('/courses'); } catch(e) { return; } }
  const recent = [...courses].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,3);
  const featEl = document.getElementById('featuredList');
  if (featEl) {
    featEl.innerHTML = recent.length ? recent.map((c,i) => {
      const types = Object.entries(c.mediaCounts||{}).map(([t,n]) => `${mediaIcon(t)} ${t}`).join(' · ') || 'No media';
      return `<div class="feat-item" onclick="navigate('course',{id:'${c.id}'})">
        <div class="feat-rank">#${i+1} RECENT</div>
        <div class="feat-title">${escapeHtml(c.title)}</div>
        <div class="feat-meta">${types}</div>
      </div>`;
    }).join('') : '<div class="feat-item"><div class="feat-meta">No courses yet</div></div>';
  }
  const counts = {};
  courses.forEach(c => { const n = c.instructor||'Unknown'; counts[n]=(counts[n]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const lbEl = document.getElementById('leaderboardList');
  if (lbEl && sorted.length) {
    const max = sorted[0][1];
    lbEl.innerHTML = sorted.map(([name,count],i) => {
      const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const pts = count*100+(4-i)*20;
      const pct = Math.round((count/max)*100);
      return `<div class="lb-row"><span class="lb-pos">${i+1}</span><div class="lb-av">${initials}</div><span class="lb-name">${escapeHtml(name)}</span><span class="lb-pts">${pts}</span><div class="lb-bar-wrap"><div class="lb-bar" style="width:${pct}%"></div></div></div>`;
    }).join('');
  }
  const dates = [...new Set(courses.map(c=>new Date(c.createdAt).toDateString()))].sort((a,b)=>new Date(b)-new Date(a));
  let streak = 0;
  const today = new Date();
  for (let i=0;i<dates.length;i++) { const diff=Math.floor((today-new Date(dates[i]))/86400000); if(diff<=i+1)streak++; else break; }
  if (streak===0&&dates.length>0) streak=1;
  const streakEl = document.getElementById('streakNumber');
  const streakMsg = document.getElementById('streakMsg');
  const streakDays = document.getElementById('streakDays');
  if (streakEl) streakEl.textContent = streak;
  if (streakMsg) streakMsg.textContent = streak>=7?`${streak} days in a row — amazing!`:streak>=3?`${streak} days active — keep going!`:`${streak} day${streak!==1?'s':''} active`;
  if (streakDays) {
    const days = ['M','T','W','T','F','S','S'];
    const todayIdx = (new Date().getDay()+6)%7;
    streakDays.innerHTML = days.map((d,i) => {
      const cls = i<todayIdx?'done':i===todayIdx?'today':'off';
      return `<div class="s-day ${cls}">${d}</div>`;
    }).join('');
  }
  const myCount = document.getElementById('sideMyCount');
  if (myCount) myCount.textContent = courses.length;
}
