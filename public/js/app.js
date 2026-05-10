// js/app.js
// Core application — router, auth, shared utilities

const API = '/api';
let currentAccount = null;

// ============================================================
// ROUTER
// ============================================================
const routes = {};

function registerPage(name, renderFn) {
  routes[name] = renderFn;
}

async function navigate(page, params = {}, pushState = true) {
  const render = routes[page] || routes['home'];

  // Update nav active state
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  // Update URL
  if (pushState) {
    const url = page === 'home' ? '/' : `/${page}${params.id ? '/' + params.id : ''}`;
    history.pushState({ page, params }, '', url);
  }

  // Show loading
  showLoading();

  // Render page
  const content = document.getElementById('page-content');
  content.innerHTML = '<div style="padding:60px;text-align:center;color:var(--ink-muted)">Loading...</div>';

  try {
    await render(content, params);
  } catch(e) {
    content.innerHTML = `<div class="empty-state" style="margin:40px auto;max-width:500px">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">Something went wrong</div>
      <div class="empty-text">${e.message}</div>
    </div>`;
  }

  hideLoading();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Handle browser back/forward
window.addEventListener('popstate', e => {
  const state = e.state || { page: 'home', params: {} };
  navigate(state.page, state.params, false);
});

// ============================================================
// AUTH
// ============================================================
function showLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
  setTimeout(() => document.getElementById('loginUsername').focus(), 100);
}

function hideLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}

async function submitLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');

  if (username === 'admin' && password === 'edustream2024') {
    currentAccount = { id: 'admin', name: 'Admin User', username: 'admin', points: 940, streak: 7 };
    sessionStorage.setItem('edustream_user', JSON.stringify(currentAccount));
    hideLoginModal();
    updateAuthUI();
    toast('Signed in as Admin User', 'success');
    // Refresh current page
    const state = history.state || { page: 'home', params: {} };
    navigate(state.page, state.params, false);
  } else {
    err.textContent = 'Invalid username or password';
    err.style.display = 'block';
  }
}

function signOut() {
  currentAccount = null;
  sessionStorage.removeItem('edustream_user');
  updateAuthUI();
  toast('Signed out', 'success');
  navigate('home');
}

function updateAuthUI() {
  const pill = document.getElementById('userPill');
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const userName = document.getElementById('userName');

  if (currentAccount) {
    if (userName) userName.textContent = currentAccount.name;
    pill?.classList.add('visible');
    if (signInBtn) signInBtn.style.display = 'none';
    if (signOutBtn) signOutBtn.style.display = 'inline-block';
  } else {
    pill?.classList.remove('visible');
    if (signInBtn) signInBtn.style.display = 'inline-block';
    if (signOutBtn) signOutBtn.style.display = 'none';
  }
}

function requireAuth() {
  if (!currentAccount) {
    showLoginModal();
    return false;
  }
  return true;
}

async function getAuthHeader() {
  return {};
}

function initAuth() {
  const saved = sessionStorage.getItem('edustream_user');
  if (saved) {
    try { currentAccount = JSON.parse(saved); } catch(e) {}
  }
  updateAuthUI();
}

// ============================================================
// TOAST + LOADING
// ============================================================
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  setTimeout(() => t.className = '', 4000);
}

function showLoading() {
  const lb = document.getElementById('loadingBar');
  if (lb) { lb.className = 'loading-bar active'; }
}

function hideLoading() {
  const lb = document.getElementById('loadingBar');
  if (lb) {
    lb.className = 'loading-bar done';
    setTimeout(() => lb.className = 'loading-bar', 300);
  }
}

// ============================================================
// LIGHTBOX
// ============================================================
function openLightbox(url) {
  document.getElementById('lightboxImg').src = url;
  document.getElementById('lightbox').classList.add('show');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('show');
}

// ============================================================
// MOBILE NAV
// ============================================================
function toggleMobileNav() {
  document.getElementById('mobileNav').classList.toggle('open');
}

// ============================================================
// UTILITIES
// ============================================================
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}

function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function mediaIcon(type) {
  return type === 'video' ? '🎬' : type === 'image' ? '🖼' : '🎵';
}

// ============================================================
// SHARED API HELPERS
// ============================================================
async function apiGet(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function apiPost(path, body, isFormData = false) {
  const auth = await getAuthHeader();
  const opts = {
    method: 'POST',
    headers: isFormData ? auth : { 'Content-Type': 'application/json', ...auth },
    body: isFormData ? body : JSON.stringify(body)
  };
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiPut(path, body) {
  const auth = await getAuthHeader();
  const res = await fetch(API + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function apiDelete(path) {
  const auth = await getAuthHeader();
  const res = await fetch(API + path, { method: 'DELETE', headers: auth });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ============================================================
// SHARED MEDIA RENDERER
// ============================================================
function renderMediaViewer(c) {
  const media = c.media || [];
  if (!media.length) return '<div style="background:var(--ink);border-radius:var(--radius);padding:28px;text-align:center;color:rgba(255,255,255,0.3);font-style:italic;font-family:var(--serif);font-size:13px">No media attached</div>';

  const grouped = { video: [], image: [], audio: [] };
  media.forEach(m => grouped[m.mediaType]?.push(m));

  const tabs = [], panels = [];
  let first = true;

  for (const type of ['video', 'image', 'audio']) {
    const items = grouped[type];
    if (!items.length) continue;
    const icon = mediaIcon(type);
    const label = type[0].toUpperCase() + type.slice(1) + (items.length > 1 ? 's' : '');
    const id = `${c.id}-${type}`;

    tabs.push(`<button class="m-tab ${first ? 'active' : ''}" data-tab="${id}" onclick="switchMediaTab('${c.id}','${type}')">${icon} ${label}<span class="m-tab-count">${items.length}</span></button>`);
    panels.push(`<div class="media-content" id="panel-${id}" style="${first ? '' : 'display:none'}">${renderMediaItems(c.id, type, items)}</div>`);
    first = false;
  }

  return `<div class="media-viewer"><div class="media-tabbar">${tabs.join('')}</div>${panels.join('')}</div>`;
}

function renderMediaItems(courseId, type, items) {
  if (type === 'video') return items.map((m, i) => `
    <div class="media-item-wrap" style="${i > 0 ? 'display:none' : ''}">
      <video controls preload="metadata" src="${m.cdnUrl || m.directUrl}" style="width:100%;display:block;background:black;max-height:400px"></video>
    </div>`).join('');

  if (type === 'audio') return items.map(m => `
    <div style="padding:10px 14px 0;color:var(--paper);font-size:12px;font-family:var(--mono)">🎵 ${escapeHtml(m.originalName || 'Audio')}</div>
    <audio controls preload="metadata" src="${m.cdnUrl || m.directUrl}" style="width:calc(100% - 28px);margin:10px 14px;display:block"></audio>`).join('');

  if (type === 'image') return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:4px;padding:4px;background:rgba(255,255,255,0.03)">${
    items.map(m => `<img src="${m.cdnUrl || m.directUrl}" alt="${escapeHtml(m.originalName || '')}" onclick="openLightbox('${m.cdnUrl || m.directUrl}')" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:3px;cursor:pointer">`).join('')
  }</div>`;
  return '';
}

function switchMediaTab(courseId, type) {
  document.querySelectorAll(`[data-tab^="${courseId}-"]`).forEach(t =>
    t.classList.toggle('active', t.dataset.tab === `${courseId}-${type}`)
  );
  document.querySelectorAll(`[id^="panel-${courseId}-"]`).forEach(p =>
    p.style.display = p.id === `panel-${courseId}-${type}` ? 'block' : 'none'
  );
}

// ============================================================
// COURSE CARD RENDERER (shared)
// ============================================================
function renderCourseCard(c, options = {}) {
  const { showActions = true, compact = false } = options;
  const tags = (c.tags || []).filter(Boolean).map(t => `<span class="c-tag">${escapeHtml(t)}</span>`).join('');
  const counts = c.mediaCounts || {};
  const badges = Object.entries(counts).map(([type, n]) =>
    `<span class="c-badge">${mediaIcon(type)} ${n}</span>`
  ).join('');

  const actions = showActions ? `
    <div class="c-actions">
      <button class="btn btn-sm btn-secondary" onclick="navigate('course', {id:'${c.id}'})">📖 View</button>
      <button class="btn btn-sm btn-secondary" onclick="enrollCourse('${c.id}')">+ Enroll</button>
      <button class="btn btn-sm btn-secondary" onclick="editCourse('${c.id}')">✏ Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteCourse('${c.id}')">🗑 Delete</button>
    </div>` : '';

  return `
    <article class="course card" id="course-${c.id}" style="overflow:hidden;margin-bottom:18px;cursor:pointer" onclick="navigate('course',{id:'${c.id}'})">
      <div class="c-strip" onclick="event.stopPropagation()">
        <span class="c-cat">${escapeHtml(c.category || 'General')}</span>
        <span style="color:var(--rule-strong)">·</span>
        <span class="c-date">${formatRelative(c.createdAt)}</span>
        <div class="c-badges" style="margin-left:auto;display:flex;gap:5px">${badges}</div>
      </div>
      <div class="c-body" onclick="event.stopPropagation()">
        <h3 class="c-title" onclick="navigate('course',{id:'${c.id}'})" style="cursor:pointer">${escapeHtml(c.title)}</h3>
        <p class="c-by">By <strong>${escapeHtml(c.instructor)}</strong></p>
        ${!compact && c.description ? `<p class="c-desc">${escapeHtml(c.description)}</p>` : ''}
        ${tags ? `<div class="c-tags">${tags}</div>` : ''}
        ${!compact ? renderMediaViewer(c) : ''}
        ${actions}
      </div>
    </article>`;
}

// Global CRUD functions used across pages
async function enrollCourse(id) {
  if (!requireAuth()) return;
  try {
    await apiPost(`/courses/${id}/enroll`, {});
    toast('📖 Enrolled in course!', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

async function editCourse(id) {
  if (!requireAuth()) return;
  const t = prompt('New title:');
  if (!t) return;
  try {
    await apiPut(`/courses/${id}`, { title: t });
    toast('Course updated', 'success');
    // Refresh current page
    const state = history.state || { page: 'home', params: {} };
    navigate(state.page, state.params, false);
  } catch(e) { toast(e.message, 'error'); }
}

async function deleteCourse(id) {
  if (!requireAuth()) return;
  if (!confirm('Delete this course and all its media?')) return;
  try {
    await apiDelete(`/courses/${id}`);
    toast('Course deleted', 'success');
    document.getElementById(`course-${id}`)?.remove();
  } catch(e) { toast(e.message, 'error'); }
}
