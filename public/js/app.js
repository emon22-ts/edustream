// js/app.js - Core SPA router, auth, shared utilities
const API = '/api';
let currentAccount = null;
const routes = {};

// ── ROUTER ──
function registerPage(name, fn) { routes[name] = fn; }

async function navigate(page, params, pushState) {
  if (pushState === undefined) pushState = true;
  if (!params) params = {};
  const render = routes[page] || routes['home'];
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
  if (pushState) {
    const url = page === 'home' ? '/' : ('/' + page + (params.id ? '/' + params.id : ''));
    history.pushState({ page: page, params: params }, '', url);
  }
  showLoading();
  const content = document.getElementById('page-content');
  content.innerHTML = '<div style="padding:80px;text-align:center;color:var(--ink-muted);font-family:var(--serif);font-style:italic">Loading...</div>';
  try { await render(content, params); }
  catch(e) {
    console.error('Page render error:', e);
    content.innerHTML = '<div class="empty-state" style="margin:40px auto;max-width:500px"><div class="empty-icon">⚠️</div><div class="empty-title">Something went wrong</div><div class="empty-text">' + escapeHtml(e.message) + '</div></div>';
  }
  hideLoading();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('popstate', function(e) {
  var state = e.state || { page: 'home', params: {} };
  navigate(state.page, state.params, false);
});

// ── AUTH MODAL (Login + Register) ──
function showLoginModal() {
  document.getElementById('authModal').style.display = 'flex';
  switchAuthTab('login');
  setTimeout(function(){ var el = document.getElementById('loginEmail'); if(el) el.focus(); }, 100);
}

function showRegisterModal() {
  document.getElementById('authModal').style.display = 'flex';
  switchAuthTab('register');
  setTimeout(function(){ var el = document.getElementById('regName'); if(el) el.focus(); }, 100);
}

function hideAuthModal() {
  document.getElementById('authModal').style.display = 'none';
  document.getElementById('authError').style.display = 'none';
}

function switchAuthTab(tab) {
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach(function(t){ t.classList.toggle('active', t.dataset.tab === tab); });
  document.getElementById('authError').style.display = 'none';
}

async function submitLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPassword').value;
  var err = document.getElementById('authError');
  if (!email || !password) { showAuthError('Please fill in all fields'); return; }
  try {
    var res = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    currentAccount = data.user;
    sessionStorage.setItem('edustream_user', JSON.stringify(currentAccount));
    hideAuthModal();
    updateAuthUI();
    toast('Welcome back, ' + currentAccount.name + '!', 'success');
    var state = history.state || { page: 'home', params: {} };
    navigate(state.page, state.params, false);
  } catch(e) { showAuthError(e.message); }
}

async function submitRegister() {
  var name = document.getElementById('regName').value.trim();
  var email = document.getElementById('regEmail').value.trim();
  var password = document.getElementById('regPassword').value;
  var confirm = document.getElementById('regConfirm').value;
  if (!name || !email || !password) { showAuthError('Please fill in all fields'); return; }
  if (password !== confirm) { showAuthError('Passwords do not match'); return; }
  if (password.length < 6) { showAuthError('Password must be at least 6 characters'); return; }
  try {
    var res = await fetch(API + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, password: password })
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    currentAccount = data.user;
    sessionStorage.setItem('edustream_user', JSON.stringify(currentAccount));
    hideAuthModal();
    updateAuthUI();
    toast('Welcome to EduStream+, ' + currentAccount.name + '!', 'success');
    var state = history.state || { page: 'home', params: {} };
    navigate(state.page, state.params, false);
  } catch(e) { showAuthError(e.message); }
}

function showAuthError(msg) {
  var err = document.getElementById('authError');
  err.textContent = msg;
  err.style.display = 'block';
}

function signOut() {
  currentAccount = null;
  sessionStorage.removeItem('edustream_user');
  updateAuthUI();
  toast('Signed out', 'success');
  navigate('home');
}

function updateAuthUI() {
  var pill = document.getElementById('userPill');
  var signInBtn = document.getElementById('signInBtn');
  var signOutBtn = document.getElementById('signOutBtn');
  var userName = document.getElementById('userName');
  if (currentAccount) {
    if (userName) userName.textContent = currentAccount.name;
    if (pill) pill.classList.add('visible');
    if (signInBtn) signInBtn.style.display = 'none';
    if (signOutBtn) signOutBtn.style.display = 'inline-block';
  } else {
    if (pill) pill.classList.remove('visible');
    if (signInBtn) signInBtn.style.display = 'inline-block';
    if (signOutBtn) signOutBtn.style.display = 'none';
  }
}

function requireAuth() {
  if (!currentAccount) { showLoginModal(); return false; }
  return true;
}

async function getAuthHeader() {
  if (!currentAccount) return {};
  return { 'X-User-Id': currentAccount.id, 'X-User-Name': currentAccount.name };
}

function initAuth() {
  var saved = sessionStorage.getItem('edustream_user');
  if (saved) { try { currentAccount = JSON.parse(saved); } catch(e) {} }
  updateAuthUI();
}

// ── TOAST + LOADING ──
function toast(msg, type) {
  if (!type) type = 'success';
  var t = document.getElementById('toast');
  t.textContent = msg; t.className = 'show ' + type;
  setTimeout(function(){ t.className = ''; }, 4000);
}

function showLoading() {
  var lb = document.getElementById('loadingBar');
  if (lb) lb.className = 'loading-bar active';
}

function hideLoading() {
  var lb = document.getElementById('loadingBar');
  if (lb) { lb.className = 'loading-bar done'; setTimeout(function(){ lb.className = 'loading-bar'; }, 300); }
}

// ── LIGHTBOX ──
function openLightbox(url) {
  document.getElementById('lightboxImg').src = url;
  document.getElementById('lightbox').classList.add('show');
}
function closeLightbox() { document.getElementById('lightbox').classList.remove('show'); }

// ── MOBILE NAV ──
function toggleMobileNav() { document.getElementById('mobileNav').classList.toggle('open'); }

// ── UTILITIES ──
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function formatRelative(iso) {
  if (!iso) return '';
  var diff = Date.now() - new Date(iso).getTime();
  var mins = Math.floor(diff/60000), hours = Math.floor(mins/60), days = Math.floor(hours/24);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  if (hours < 24) return hours + 'h ago';
  if (days < 7) return days + 'd ago';
  return formatDate(iso);
}
function mediaIcon(type) {
  return type === 'video' ? '🎬' : type === 'image' ? '🖼' : '🎵';
}

// ── API HELPERS ──
async function apiGet(path) {
  var res = await fetch(API + path);
  if (!res.ok) throw new Error('API error: ' + res.status);
  return res.json();
}
async function apiPost(path, body, isFormData) {
  var auth = await getAuthHeader();
  var opts = { method: 'POST', headers: isFormData ? auth : Object.assign({'Content-Type':'application/json'}, auth), body: isFormData ? body : JSON.stringify(body) };
  var res = await fetch(API + path, opts);
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
async function apiPut(path, body) {
  var auth = await getAuthHeader();
  var res = await fetch(API + path, { method:'PUT', headers: Object.assign({'Content-Type':'application/json'}, auth), body: JSON.stringify(body) });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
async function apiDelete(path) {
  var auth = await getAuthHeader();
  var res = await fetch(API + path, { method:'DELETE', headers: auth });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── MEDIA RENDERER ──
function renderMediaViewer(c) {
  var media = c.media || [];
  if (!media.length) return '<div style="background:var(--ink);border-radius:var(--radius);padding:28px;text-align:center;color:rgba(255,255,255,0.3);font-style:italic;font-family:var(--serif);font-size:13px">No media attached</div>';
  var grouped = { video:[], image:[], audio:[] };
  media.forEach(function(m){ if(grouped[m.mediaType]) grouped[m.mediaType].push(m); });
  var tabs = [], panels = [], first = true;
  ['video','image','audio'].forEach(function(type){
    var items = grouped[type];
    if (!items.length) return;
    var icon = mediaIcon(type);
    var label = type[0].toUpperCase() + type.slice(1) + (items.length > 1 ? 's' : '');
    var id = c.id + '-' + type;
    tabs.push('<button class="m-tab ' + (first?'active':'') + '" data-tab="' + id + '" onclick="switchMediaTab(\'' + c.id + '\',\'' + type + '\')">' + icon + ' ' + label + '<span class="m-tab-count">' + items.length + '</span></button>');
    panels.push('<div class="media-content" id="panel-' + id + '" style="' + (first?'':'display:none') + '">' + renderMediaItems(c.id, type, items) + '</div>');
    first = false;
  });
  return '<div class="media-viewer"><div class="media-tabbar">' + tabs.join('') + '</div>' + panels.join('') + '</div>';
}

function renderMediaItems(courseId, type, items) {
  if (type === 'video') return items.map(function(m,i){
    return '<div style="' + (i>0?'display:none':'') + '">' + createAdvancedPlayer(m.cdnUrl||m.directUrl, courseId, i) + '</div>';
  }).join('');
  if (type === 'audio') return items.map(function(m){ return '<div><div style="padding:10px 14px 0;color:var(--paper);font-size:12px;font-family:var(--mono)">🎵 ' + escapeHtml(m.originalName||'Audio') + '</div><audio controls preload="metadata" src="' + (m.cdnUrl||m.directUrl) + '" style="width:calc(100% - 28px);margin:10px 14px;display:block"></audio></div>'; }).join('');
  if (type === 'image') return '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:4px;padding:4px">' + items.map(function(m){ return '<img src="' + (m.cdnUrl||m.directUrl) + '" alt="' + escapeHtml(m.originalName||'') + '" onclick="openLightbox(\'' + (m.cdnUrl||m.directUrl) + '\')" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:3px;cursor:pointer">'; }).join('') + '</div>';
  return '';
}

function switchMediaTab(courseId, type) {
  document.querySelectorAll('[data-tab^="' + courseId + '-"]').forEach(function(t){ t.classList.toggle('active', t.dataset.tab === courseId+'-'+type); });
  document.querySelectorAll('[id^="panel-' + courseId + '-"]').forEach(function(p){ p.style.display = p.id === 'panel-'+courseId+'-'+type ? 'block' : 'none'; });
}

// ── COURSE CARD ──
function renderCourseCard(c, opts) {
  if (!opts) opts = {};
  var showActions = opts.showActions !== false;
  var isOwner = currentAccount && (c.createdBy === currentAccount.id || c.createdByName === currentAccount.name);
  var tags = (c.tags||[]).filter(Boolean).map(function(t){ return '<span class="c-tag">' + escapeHtml(t) + '</span>'; }).join('');
  var badges = Object.entries(c.mediaCounts||{}).map(function(e){ return '<span class="c-badge">' + mediaIcon(e[0]) + ' ' + e[1] + '</span>'; }).join('');
  // Add ratings and progress
  var ratingsHtml = renderStars(c.id, 0);
  var progressHtml = '<div class="progress-wrap">' + renderProgressBar(c.id) + '</div>';

  var actions = showActions ? '<div class="c-actions">' +
    '<button class="btn btn-sm btn-secondary" onclick="navigate(\'course\',{id:\'' + c.id + '\'})">📖 View</button>' +
    '<button class="btn btn-sm btn-secondary" onclick="enrollCourse(\'' + c.id + '\')">+ Enroll</button>' +
    (isOwner ? '<button class="btn btn-sm btn-secondary" onclick="editCourse(\'' + c.id + '\')">✏ Edit</button>' : '') +
    (isOwner ? '<button class="btn btn-sm btn-danger" onclick="deleteCourse(\'' + c.id + '\')">🗑 Delete</button>' : '') +
    '</div>' : '';
  var commentSection = '<div class="c-comments"><div class="c-comments-head">Discussion</div><div class="comments-list" id="clist-' + c.id + '"><div style="font-size:13px;color:var(--ink-muted);font-style:italic">Loading...</div></div>' +
    '<div class="comment-add"><input type="text" placeholder="Add a comment..." onkeypress="if(event.key===\'Enter\') addComment(\'' + c.id + '\', this)"><button onclick="addComment(\'' + c.id + '\', this.previousElementSibling)">Post</button></div></div>';
  return '<article class="course card" id="course-' + c.id + '" style="overflow:hidden;margin-bottom:18px">' +
    '<div class="c-strip"><span class="c-cat">' + escapeHtml(c.category||'General') + '</span><span style="color:var(--rule-strong)">·</span><span class="c-date">' + formatRelative(c.createdAt) + '</span><div style="margin-left:auto;display:flex;gap:5px">' + badges + '</div></div>' +
    '<div class="c-body"><h3 class="c-title" onclick="navigate(\'course\',{id:\'' + c.id + '\'})">' + escapeHtml(c.title) + '</h3>' +
    '<p class="c-by">By <strong>' + escapeHtml(c.instructor) + '</strong></p>' +
    (c.description ? '<p class="c-desc">' + escapeHtml(c.description) + '</p>' : '') +
    (tags ? '<div class="c-tags">' + tags + '</div>' : '') +
    renderMediaViewer(c) + ratingsHtml + progressHtml + actions + '</div>' + commentSection + '</article>';
}

// ── GLOBAL CRUD ──
async function enrollCourse(id) {
  if (!requireAuth()) return;
  try { await apiPost('/courses/' + id + '/enroll', {}); toast('Enrolled!', 'success'); } catch(e) { toast(e.message, 'error'); }
}

async function editCourse(id) {
  if (!requireAuth()) return;
  var t = prompt('New title:');
  if (!t) return;
  try {
    await apiPut('/courses/' + id, { title: t });
    toast('Updated', 'success');
    var state = history.state || { page:'home', params:{} };
    navigate(state.page, state.params, false);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteCourse(id) {
  if (!requireAuth()) return;
  if (!confirm('Delete this course?')) return;
  try {
    await apiDelete('/courses/' + id);
    toast('Deleted', 'success');
    document.getElementById('course-' + id)?.remove();
  } catch(e) { toast(e.message, 'error'); }
}

async function addComment(courseId, inputEl) {
  if (!requireAuth()) return;
  var text = inputEl.value.trim();
  if (!text) return;
  try {
    await apiPost('/courses/' + courseId + '/comments', { text: text });
    inputEl.value = '';
    loadComments(courseId);
    toast('Comment posted', 'success');
    addNotification(currentAccount.name + ' commented on a course', 'comment', 'course/' + courseId);
  } catch(e) { toast(e.message, 'error'); }
}

async function loadComments(courseId) {
  try {
    var comments = await apiGet('/courses/' + courseId + '/comments');
    var el = document.getElementById('clist-' + courseId);
    if (!el) return;
    if (!comments.length) { el.innerHTML = '<div style="font-size:13px;color:var(--ink-muted);font-style:italic">No comments yet.</div>'; return; }
    el.innerHTML = comments.map(function(c){ return '<div class="comment-row"><span class="comment-author">' + escapeHtml(c.authorName) + '</span><span class="comment-date">' + formatRelative(c.createdAt) + '</span><div class="comment-text">' + escapeHtml(c.text) + '</div></div>'; }).join('');
  } catch(e) {}
}

// ── DARK MODE ──
function initDarkMode() {
  const saved = localStorage.getItem('edustream_theme');
  if (saved === 'dark') applyDarkMode(true);
}

function applyDarkMode(dark) {
  var btn = document.getElementById('darkToggle');
  if (dark) {
    // Dark mode — body and content go dark, header stays dark (it already is)
    document.body.style.background = '#111827';
    document.body.style.color = '#e5e7eb';
    document.documentElement.style.setProperty('--paper', '#1f2937');
    document.documentElement.style.setProperty('--paper-tint', '#111827');
    document.documentElement.style.setProperty('--paper-deep', '#0f172a');
    document.documentElement.style.setProperty('--ink', '#f9fafb');
    document.documentElement.style.setProperty('--ink-soft', '#d1d5db');
    document.documentElement.style.setProperty('--ink-muted', '#9ca3af');
    document.documentElement.style.setProperty('--rule', '#374151');
    document.documentElement.style.setProperty('--rule-strong', '#4b5563');
    document.documentElement.style.setProperty('--amber-pale', '#1c1008');
    document.documentElement.style.setProperty('--burgundy', '#f87171');
    // Keep header dark (it uses --ink as bg so it stays dark)
    if (btn) btn.textContent = '☀️';
  } else {
    document.body.style.background = '';
    document.body.style.color = '';
    document.documentElement.style.setProperty('--paper', '#f5edd8');
    document.documentElement.style.setProperty('--paper-tint', '#ede4ce');
    document.documentElement.style.setProperty('--paper-deep', '#e4d9be');
    document.documentElement.style.setProperty('--ink', '#0e1a2b');
    document.documentElement.style.setProperty('--ink-soft', '#2c3e55');
    document.documentElement.style.setProperty('--ink-muted', '#6b7a8d');
    document.documentElement.style.setProperty('--rule', '#d4c9b0');
    document.documentElement.style.setProperty('--rule-strong', '#b8ac94');
    document.documentElement.style.setProperty('--amber-pale', '#fdf0e0');
    document.documentElement.style.setProperty('--burgundy', '#7a1f2e');
    if (btn) btn.textContent = '🌙';
  }
}

function toggleDarkMode() {
  var isDark = localStorage.getItem('edustream_theme') === 'dark';
  isDark = !isDark;
  localStorage.setItem('edustream_theme', isDark ? 'dark' : 'light');
  applyDarkMode(isDark);
  toast(isDark ? '🌙 Dark mode on' : '☀️ Light mode on', 'success');
}

// ── RATINGS ──
function renderStars(courseId, currentRating) {
  if (!currentRating) currentRating = 0;
  var avg = getRating(courseId);
  var html = '<div class="rating-stars" style="display:flex;align-items:center;gap:6px;margin-bottom:10px">';
  html += '<span style="font-size:11px;color:var(--ink-muted)">Rate:</span>';
  for (var i = 1; i <= 5; i++) {
    var filled = i <= Math.round(avg.avg);
    html += '<span onclick="rateCoure(\'' + courseId + '\',' + i + ')" style="cursor:pointer;font-size:20px;color:' + (filled ? '#f5a623' : 'var(--rule-strong)') + ';transition:color 0.15s" onmouseover="this.style.color=\'#f5a623\'" onmouseout="this.style.color=\'' + (filled ? '#f5a623' : 'var(--rule-strong)') + '\'">★</span>';
  }
  html += '<span style="font-size:12px;color:var(--ink-muted);font-family:var(--mono)">' + (avg.count > 0 ? avg.avg.toFixed(1) + ' (' + avg.count + ')' : 'No ratings') + '</span>';
  html += '</div>';
  return html;
}

function getRating(courseId) {
  var ratings = JSON.parse(localStorage.getItem('ratings_' + courseId) || '[]');
  if (!ratings.length) return { avg: 0, count: 0 };
  var avg = ratings.reduce(function(s, r) { return s + r; }, 0) / ratings.length;
  return { avg: avg, count: ratings.length };
}

function rateCoure(courseId, stars) {
  if (!requireAuth()) return;
  var ratings = JSON.parse(localStorage.getItem('ratings_' + courseId) || '[]');
  ratings.push(stars);
  localStorage.setItem('ratings_' + courseId, JSON.stringify(ratings));
  // Update stars display
  var containers = document.querySelectorAll('.rating-stars');
  containers.forEach(function(el) {
    if (el.closest('[id="course-' + courseId + '"]')) {
      el.outerHTML = renderStars(courseId, stars);
    }
  });
  toast('Rated ' + stars + ' ★', 'success');
}

// ── PROGRESS TRACKING ──
function getProgress(courseId) {
  return parseInt(localStorage.getItem('progress_' + courseId) || '0');
}

function setProgress(courseId, pct) {
  localStorage.setItem('progress_' + courseId, Math.min(100, Math.max(0, pct)));
}

function renderProgressBar(courseId) {
  var pct = getProgress(courseId);
  return '<div style="margin-bottom:10px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
    '<span style="font-size:11px;color:var(--ink-muted)">Progress</span>' +
    '<span style="font-size:11px;font-family:var(--mono);color:var(--ink-muted)">' + pct + '%</span>' +
    '</div>' +
    '<div style="height:4px;background:var(--rule);border-radius:2px;overflow:hidden">' +
    '<div style="height:100%;background:var(--amber);border-radius:2px;width:' + pct + '%;transition:width 0.3s"></div>' +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-top:6px">' +
    [25, 50, 75, 100].map(function(p) {
      return '<button onclick="updateProgress(\'' + courseId + '\',' + p + ')" style="flex:1;padding:3px;font-size:10px;border:1px solid var(--rule);background:' + (pct >= p ? 'var(--amber)' : 'transparent') + ';color:' + (pct >= p ? 'white' : 'var(--ink-muted)') + ';border-radius:3px;cursor:pointer;font-family:var(--sans)">' + p + '%</button>';
    }).join('') +
    '</div>' +
    '</div>';
}

function updateProgress(courseId, pct) {
  setProgress(courseId, pct);
  // Re-render progress bar
  var el = document.querySelector('#course-' + courseId + ' .progress-wrap');
  if (el) el.outerHTML = '<div class="progress-wrap">' + renderProgressBar(courseId) + '</div>';
  toast('Progress updated to ' + pct + '%', 'success');
}

// ── ADVANCED VIDEO PLAYER ──
function createAdvancedPlayer(videoUrl, courseId, mediaIndex) {
  var savedTime = parseFloat(localStorage.getItem('vp_' + courseId + '_' + mediaIndex) || '0');
  return `<div class="adv-player" id="player-${courseId}-${mediaIndex}" style="position:relative;background:#000;border-radius:var(--radius);overflow:hidden">
    <video id="vid-${courseId}-${mediaIndex}" src="${videoUrl}" style="width:100%;display:block;max-height:420px" preload="metadata"
      ontimeupdate="vpProgress('${courseId}','${mediaIndex}')"
      onloadedmetadata="this.currentTime=${savedTime}">
    </video>
    <!-- Custom controls -->
    <div class="vp-controls" style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.85));padding:8px 12px">
      <!-- Progress bar -->
      <div onclick="vpSeek(event,this,'${courseId}','${mediaIndex}')" style="height:4px;background:rgba(255,255,255,0.3);border-radius:2px;cursor:pointer;margin-bottom:8px;position:relative">
        <div id="vp-bar-${courseId}-${mediaIndex}" style="height:100%;background:var(--amber);border-radius:2px;width:0%;transition:width 0.5s linear;pointer-events:none"></div>
      </div>
      <!-- Buttons row -->
      <div style="display:flex;align-items:center;gap:10px">
        <button onclick="vpToggle('${courseId}','${mediaIndex}')" id="vp-btn-${courseId}-${mediaIndex}" style="background:transparent;border:none;color:white;font-size:18px;cursor:pointer;padding:2px 6px">▶</button>
        <span id="vp-time-${courseId}-${mediaIndex}" style="color:rgba(255,255,255,0.7);font-size:11px;font-family:var(--mono)">0:00 / 0:00</span>
        <div style="flex:1"></div>
        <!-- Speed control -->
        <select onchange="vpSpeed('${courseId}','${mediaIndex}',this.value)" style="background:rgba(0,0,0,0.6);color:white;border:1px solid rgba(255,255,255,0.3);border-radius:3px;padding:2px 6px;font-size:11px;cursor:pointer">
          <option value="0.5">0.5×</option>
          <option value="0.75">0.75×</option>
          <option value="1" selected>1×</option>
          <option value="1.25">1.25×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
        </select>
        <!-- Fullscreen -->
        <button onclick="vpFullscreen('${courseId}','${mediaIndex}')" style="background:transparent;border:none;color:white;font-size:14px;cursor:pointer;padding:2px 6px">⛶</button>
      </div>
    </div>
  </div>`;
}

function vpToggle(cId, mIdx) {
  var vid = document.getElementById('vid-'+cId+'-'+mIdx);
  var btn = document.getElementById('vp-btn-'+cId+'-'+mIdx);
  if (!vid) return;
  if (vid.paused) { vid.play(); btn.textContent = '⏸'; }
  else { vid.pause(); btn.textContent = '▶'; }
}

function vpProgress(cId, mIdx) {
  var vid = document.getElementById('vid-'+cId+'-'+mIdx);
  if (!vid || !vid.duration) return;
  var pct = (vid.currentTime / vid.duration) * 100;
  var bar = document.getElementById('vp-bar-'+cId+'-'+mIdx);
  if (bar) bar.style.width = pct + '%';
  var timeEl = document.getElementById('vp-time-'+cId+'-'+mIdx);
  if (timeEl) timeEl.textContent = vpFmt(vid.currentTime) + ' / ' + vpFmt(vid.duration);
  // Save position every 5 seconds
  if (Math.floor(vid.currentTime) % 5 === 0) {
    localStorage.setItem('vp_'+cId+'_'+mIdx, vid.currentTime);
    // Update progress
    var watchedPct = Math.round(pct);
    if (watchedPct > getProgress(cId)) setProgress(cId, watchedPct);
  }
}

function vpSeek(e, el, cId, mIdx) {
  var vid = document.getElementById('vid-'+cId+'-'+mIdx);
  if (!vid || !vid.duration) return;
  var rect = el.getBoundingClientRect();
  var pct = (e.clientX - rect.left) / rect.width;
  vid.currentTime = pct * vid.duration;
}

function vpSpeed(cId, mIdx, speed) {
  var vid = document.getElementById('vid-'+cId+'-'+mIdx);
  if (vid) vid.playbackRate = parseFloat(speed);
}

function vpFullscreen(cId, mIdx) {
  var player = document.getElementById('player-'+cId+'-'+mIdx);
  if (player) {
    if (document.fullscreenElement) document.exitFullscreen();
    else player.requestFullscreen();
  }
}

function vpFmt(s) {
  var m = Math.floor(s/60), sec = Math.floor(s%60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  var vids = document.querySelectorAll('video');
  if (!vids.length) return;
  var vid = vids[0];
  if (e.code === 'Space') { e.preventDefault(); vid.paused ? vid.play() : vid.pause(); }
  else if (e.code === 'ArrowRight') { e.preventDefault(); vid.currentTime += 10; }
  else if (e.code === 'ArrowLeft') { e.preventDefault(); vid.currentTime -= 10; }
  else if (e.code === 'ArrowUp') { e.preventDefault(); vid.volume = Math.min(1, vid.volume + 0.1); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); vid.volume = Math.max(0, vid.volume - 0.1); }
});

// ── NOTIFICATIONS ──
var notifications = JSON.parse(localStorage.getItem('edustream_notifs') || '[]');

function addNotification(msg, type, link) {
  notifications.unshift({ id: Date.now(), msg, type: type||'info', link, read: false, time: new Date().toISOString() });
  if (notifications.length > 50) notifications = notifications.slice(0, 50);
  localStorage.setItem('edustream_notifs', JSON.stringify(notifications));
  updateNotifBadge();
}

function updateNotifBadge() {
  var unread = notifications.filter(function(n){ return !n.read; }).length;
  var badge = document.getElementById('notifBadge');
  if (badge) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = unread > 0 ? 'flex' : 'none';
  }
}

function toggleNotifications() {
  var panel = document.getElementById('notifPanel');
  if (!panel) return;
  var isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    // Mark all as read
    notifications.forEach(function(n){ n.read = true; });
    localStorage.setItem('edustream_notifs', JSON.stringify(notifications));
    updateNotifBadge();
    renderNotifPanel();
  }
}

function renderNotifPanel() {
  var list = document.getElementById('notifList');
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--ink-muted);font-style:italic;font-family:var(--serif)">No notifications yet</div>';
    return;
  }
  list.innerHTML = notifications.slice(0,20).map(function(n) {
    return '<div onclick="' + (n.link ? 'navigate(\''+n.link+'\');toggleNotifications()' : '') + '" style="padding:12px 16px;border-bottom:1px solid var(--rule);cursor:'+(n.link?'pointer':'default')+';background:'+(n.read?'transparent':'var(--amber-pale)')+';transition:background 0.15s" onmouseover="this.style.background=\'var(--paper-tint)\'" onmouseout="this.style.background=\''+(n.read?'transparent':'var(--amber-pale)')+'\'">'+
      '<div style="font-size:13px;color:var(--ink);margin-bottom:3px">' + escapeHtml(n.msg) + '</div>'+
      '<div style="font-size:11px;color:var(--ink-muted)">' + formatRelative(n.time) + '</div>'+
    '</div>';
  }).join('');
}
