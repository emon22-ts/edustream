// pages/home.js
// Home page — hero band, upload panel, course library, sidebar

registerPage('home', async function(container) {
  container.innerHTML = `
    <!-- HERO BAND -->
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

    <!-- MAIN -->
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
          <input type="search" id="searchInput" placeholder="Search title or description..." oninput="homeDebounceSearch()">
          <select id="categoryFilter" onchange="homeLoadCourses()">
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
              <label>Media files</label>
              <div class="dropzone" id="upDropzone" onclick="document.getElementById('upMediaInput').click()">
                <div class="dz-icon">📥</div>
                <div class="dz-title">Drop files or click to browse</div>
                <div class="dz-hint">video 1GB · image 100MB · audio 200MB · up to 5 files</div>
                <input type="file" id="upMediaInput" multiple accept="video/*,image/*,audio/*" style="display:none">
              </div>
              <div class="file-list" id="upFileList"></div>
            </div>
            <div class="media-type-pills">
              <div class="mt-pill">🎬 Video</div>
              <div class="mt-pill">🖼 Image</div>
              <div class="mt-pill">🎵 Audio</div>
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

  // Init file picker
  let selectedFiles = [];
  const input = document.getElementById('upMediaInput');
  const dropzone = document.getElementById('upDropzone');

  input.addEventListener('change', e => {
    selectedFiles = Array.from(e.target.files).slice(0, 5);
    renderUpFileList();
  });
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragging'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault(); dropzone.classList.remove('dragging');
    selectedFiles = Array.from(e.dataTransfer.files).slice(0, 5);
    renderUpFileList();
  });

  function renderUpFileList() {
    const list = document.getElementById('upFileList');
    if (!selectedFiles.length) { list.innerHTML = ''; return; }
    list.innerHTML = selectedFiles.map((f, i) => {
      const icon = f.type.startsWith('video') ? '🎬' : f.type.startsWith('image') ? '🖼' : f.type.startsWith('audio') ? '🎵' : '📄';
      return `<div class="file-row"><span>${icon}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${escapeHtml(f.name)}</span><span style="font-size:10px;color:var(--ink-muted);font-family:var(--mono)">${(f.size/1024/1024).toFixed(1)}MB</span><button onclick="removeFile(${i})" style="background:transparent;border:none;cursor:pointer;color:var(--burgundy);font-size:15px">×</button></div>`;
    }).join('');
  }

  window.removeFile = (idx) => { selectedFiles.splice(idx, 1); renderUpFileList(); };

  window.homeCreateCourse = async () => {
    if (!requireAuth()) return;
    const title = document.getElementById('upTitle').value.trim();
    if (!title) return toast('Title is required', 'error');
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', document.getElementById('upDescription').value);
    fd.append('instructor', document.getElementById('upInstructor').value);
    fd.append('category', document.getElementById('upCategory').value);
    fd.append('tags', document.getElementById('upTags').value);
    selectedFiles.forEach(f => fd.append('media', f));
    const btn = document.getElementById('upCreateBtn');
    btn.disabled = true; btn.textContent = 'Publishing...';
    showLoading();
    try {
      await apiPost('/courses', fd, true);
      ['upTitle','upInstructor','upDescription','upTags'].forEach(id => document.getElementById(id).value = '');
      input.value = ''; selectedFiles = []; renderUpFileList();
      toast('Course published!', 'success');
      homeLoadCourses();
    } catch(e) { toast(e.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Publish course'; hideLoading(); }
  };

  // Search debounce
  let searchDebounce;
  window.homeDebounceSearch = () => { clearTimeout(searchDebounce); searchDebounce = setTimeout(homeLoadCourses, 300); };

  let homeMediaFilter = '';
  window.homeSetFilter = (type) => {
    homeMediaFilter = type;
    document.querySelectorAll('#mediaFilterGroup .pill').forEach(p => p.classList.toggle('active', p.dataset.type === type));
    homeLoadCourses();
  };

  window.homeLoadCourses = async () => {
    showLoading();
    try {
      const search = document.getElementById('searchInput')?.value || '';
      const category = document.getElementById('categoryFilter')?.value || '';
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (homeMediaFilter) params.set('mediaType', homeMediaFilter);
      const courses = await apiGet(`/courses?${params}`);
      const count = courses.length;
      const libCount = document.getElementById('libCount');
      if (libCount) libCount.textContent = `${count} ${count === 1 ? 'course' : 'courses'}`;
      const statCourses = document.getElementById('statCourses');
      if (statCourses) statCourses.textContent = count;
      const list = document.getElementById('courseList');
      if (!list) return;
      if (!courses.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">The library is empty</div><div class="empty-text">Be the first to publish a course.</div></div>`;
        return;
      }
      list.innerHTML = courses.map(c => renderCourseCard(c)).join('');
      courses.forEach(c => homeLoadComments(c.id));
      loadSidebarData(courses);
    } catch(e) { toast('Failed to load courses: ' + e.message, 'error'); }
    finally { hideLoading(); }
  };

  window.homeLoadComments = async (courseId) => {
    try {
      const comments = await apiGet(`/courses/${courseId}/comments`);
      const section = document.querySelector(`#course-${courseId} .c-comments`);
      if (!section) return;
      const list = section.querySelector('.comments-list');
      if (!list) return;
      if (!comments.length) { list.innerHTML = '<div style="font-size:13px;color:var(--ink-muted);font-style:italic;font-family:var(--serif)">No discussion yet.</div>'; return; }
      list.innerHTML = comments.map(c => `
        <div class="comment-row">
          <span class="comment-author">${escapeHtml(c.authorName)}</span>
          <span class="comment-date">${formatRelative(c.createdAt)}</span>
          <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>`).join('');
    } catch(e) {}
  };

  window.addComment = async (courseId, inputEl) => {
    if (!requireAuth()) return;
    const text = inputEl.value.trim();
    if (!text) return;
    try {
      await apiPost(`/courses/${courseId}/comments`, { text });
      inputEl.value = '';
      homeLoadComments(courseId);
      toast('Comment posted', 'success');
    } catch(e) { toast(e.message, 'error'); }
  };

  // Load courses
  homeLoadCourses();
});

// Sidebar data loader
async function loadSidebarData(courses) {
  if (!courses) {
    try { courses = await apiGet('/courses'); } catch(e) { return; }
  }

  // Featured — 3 most recent
  const recent = [...courses].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  const featEl = document.getElementById('featuredList');
  if (featEl) {
    featEl.innerHTML = recent.length ? recent.map((c,i) => {
      const types = Object.entries(c.mediaCounts || {}).map(([t,n]) => `${mediaIcon(t)} ${t}`).join(' · ') || 'No media';
      return `<div class="feat-item" onclick="navigate('course',{id:'${c.id}'})">
        <div class="feat-rank">#${i+1} RECENT</div>
        <div class="feat-title">${escapeHtml(c.title)}</div>
        <div class="feat-meta">${types}</div>
      </div>`;
    }).join('') : '<div class="feat-item"><div class="feat-meta">No courses yet</div></div>';
  }

  // Leaderboard — count by instructor
  const counts = {};
  courses.forEach(c => { const n = c.instructor || 'Unknown'; counts[n] = (counts[n]||0) + 1; });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,4);
  const lbEl = document.getElementById('leaderboardList');
  if (lbEl && sorted.length) {
    const max = sorted[0][1];
    lbEl.innerHTML = sorted.map(([name,count],i) => {
      const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const pts = count*100 + (4-i)*20;
      const pct = Math.round((count/max)*100);
      return `<div class="lb-row">
        <span class="lb-pos">${i+1}</span>
        <div class="lb-av">${initials}</div>
        <span class="lb-name">${escapeHtml(name)}</span>
        <span class="lb-pts">${pts}</span>
        <div class="lb-bar-wrap"><div class="lb-bar" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  }

  // Streak — days with activity
  const dates = [...new Set(courses.map(c => new Date(c.createdAt).toDateString()))].sort((a,b) => new Date(b)-new Date(a));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const diff = Math.floor((today - new Date(dates[i])) / 86400000);
    if (diff <= i+1) streak++; else break;
  }
  if (streak === 0 && dates.length > 0) streak = 1;

  const streakEl = document.getElementById('streakNumber');
  const streakMsg = document.getElementById('streakMsg');
  const streakDays = document.getElementById('streakDays');
  if (streakEl) streakEl.textContent = streak;
  if (streakMsg) streakMsg.textContent = streak >= 7 ? `${streak} days in a row — amazing!` : streak >= 3 ? `${streak} days active — keep going!` : `${streak} day${streak!==1?'s':''} active`;

  // Day dots for current week
  if (streakDays) {
    const days = ['M','T','W','T','F','S','S'];
    const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0
    streakDays.innerHTML = days.map((d,i) => {
      const cls = i < todayIdx ? 'done' : i === todayIdx ? 'today' : 'off';
      return `<div class="s-day ${cls}">${d}</div>`;
    }).join('');
  }

  // My courses count
  const myCount = document.getElementById('sideMyCount');
  if (myCount) myCount.textContent = courses.length;
}
