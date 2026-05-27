// ── EDUSTREAM+ APP.JS ── Core router, auth, dark mode, utilities

// ── PAGE REGISTRY ──
const pages = {};
function registerPage(name, fn) { pages[name] = fn; }

// ── STATE ──
var currentAccount = null;
var currentPage = 'home';
var darkMode = false;

// ── ROUTER ──
function navigate(page, params) {
  currentPage = page;
  var content = document.getElementById('page-content');
  if (!content) return;
  content.innerHTML = '<div style="padding:40px;text-align:center;color:var(--ink-muted)">Loading...</div>';
  if (pages[page]) {
    pages[page](content, params || {});
  } else {
    content.innerHTML = '<div style="padding:40px;text-align:center"><h2>Page not found</h2></div>';
  }
  // Update active nav
  document.querySelectorAll('.nav-link').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
  // Update mobile nav
  document.querySelectorAll('.mob-nav-btn').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

// ── AUTH UI ──
function updateAuthUI() {
  var signInBtn = document.getElementById('signInBtn');
  var signOutBtn = document.getElementById('signOutBtn');
  var userPill = document.getElementById('userPill');
  var userAvatar = document.getElementById('userAvatar');
  var userName = document.getElementById('userName');

  if (currentAccount) {
    if (signInBtn) signInBtn.style.display = 'none';
    if (signOutBtn) signOutBtn.style.display = 'inline-block';
    if (userPill) userPill.style.display = 'inline-flex';
    if (userAvatar) userAvatar.textContent = (currentAccount.name || 'U').charAt(0).toUpperCase();
    if (userName) userName.textContent = currentAccount.name || currentAccount.username || '';
  } else {
    if (signInBtn) signInBtn.style.display = 'inline-block';
    if (signOutBtn) signOutBtn.style.display = 'none';
    if (userPill) userPill.style.display = 'none';
  }
}

function showLoginModal() {
  var m = document.getElementById('authModal');
  if (m) { m.style.display = 'flex'; switchAuthTab('login'); }
}

function hideLoginModal() {
  var m = document.getElementById('authModal');
  if (m) m.style.display = 'none';
  var err = document.getElementById('authError');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
}

function switchAuthTab(tab) {
  var loginForm = document.getElementById('loginForm');
  var registerForm = document.getElementById('registerForm');
  var tabs = document.querySelectorAll('.auth-tab');
  tabs.forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tab); });
  if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
  if (registerForm) registerForm.style.display = tab === 'register' ? 'block' : 'none';
  var err = document.getElementById('authError');
  if (err) { err.style.display = 'none'; err.textContent = ''; }
}

async function submitLogin() {
  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPassword').value;
  var err = document.getElementById('authError');
  try {
    var res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'Invalid credentials'; err.style.display = 'block'; return; }
    currentAccount = data.user;
    sessionStorage.setItem('edustream_user', JSON.stringify(currentAccount));
    hideLoginModal();
    updateAuthUI();
    toast('Welcome back, ' + (currentAccount.name || currentAccount.username) + '!', 'success');
    navigate(currentPage);
  } catch(e) { err.textContent = 'Login failed. Try again.'; err.style.display = 'block'; }
}

async function submitRegister() {
  var name = document.getElementById('regName').value.trim();
  var email = document.getElementById('regEmail').value.trim();
  var password = document.getElementById('regPassword').value;
  var confirm = document.getElementById('regConfirm').value;
  var err = document.getElementById('authError');
  if (password !== confirm) { err.textContent = 'Passwords do not match'; err.style.display = 'block'; return; }
  if (password.length < 6) { err.textContent = 'Password must be at least 6 characters'; err.style.display = 'block'; return; }
  try {
    var res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, password: password })
    });
    var data = await res.json();
    if (!res.ok) { err.textContent = data.error || 'Registration failed'; err.style.display = 'block'; return; }
    currentAccount = data.user;
    sessionStorage.setItem('edustream_user', JSON.stringify(currentAccount));
    hideLoginModal();
    updateAuthUI();
    toast('Account created! Welcome, ' + (currentAccount.name || name) + '!', 'success');
    navigate(currentPage);
  } catch(e) { err.textContent = 'Registration failed. Try again.'; err.style.display = 'block'; }
}

async function signOut() {
  try { await fetch('/api/auth/logout', { method: 'POST' }); } catch(e) {}
  currentAccount = null;
  sessionStorage.removeItem('edustream_user');
  updateAuthUI();
  toast('Signed out', 'success');
  navigate('home');
}

// ── DARK MODE ──
function initDarkMode() {
  darkMode = localStorage.getItem('edustream_dark') === 'true';
  applyDarkMode(darkMode);
}

function toggleDarkMode() {
  darkMode = !darkMode;
  localStorage.setItem('edustream_dark', darkMode);
  applyDarkMode(darkMode);
}

function applyDarkMode(dark) {
  var btn = document.getElementById('darkToggle');
  if (dark) {
    document.documentElement.style.setProperty('--paper', '#1e2433');
    document.documentElement.style.setProperty('--paper-tint', '#252b3b');
    document.documentElement.style.setProperty('--paper-deep', '#1a1f2e');
    document.documentElement.style.setProperty('--ink-soft', '#cbd5e1');
    document.documentElement.style.setProperty('--ink-muted', '#94a3b8');
    document.documentElement.style.setProperty('--rule', '#334155');
    document.documentElement.style.setProperty('--rule-strong', '#475569');
    document.body.style.background = '#1e2433';
    document.body.style.color = '#e2e8f0';
    document.querySelectorAll('.card,.s-card,.upload-panel,.filter-bar,.comment-box').forEach(function(el) {
      el.style.background = '#252b3b'; el.style.borderColor = '#334155';
    });
    document.querySelectorAll('select,input:not([type=file]),textarea').forEach(function(el) {
      el.style.color = '#e2e8f0'; el.style.background = '#1a1f2e'; el.style.borderColor = '#334155';
    });
    if (btn) btn.textContent = '☀️';
  } else {
    document.documentElement.style.setProperty('--paper', '#f5edd8');
    document.documentElement.style.setProperty('--paper-tint', '#ede4ce');
    document.documentElement.style.setProperty('--paper-deep', '#e4d9be');
    document.documentElement.style.setProperty('--ink-soft', '#2c3e55');
    document.documentElement.style.setProperty('--ink-muted', '#6b7a8d');
    document.documentElement.style.setProperty('--rule', '#d4c9b0');
    document.documentElement.style.setProperty('--rule-strong', '#b8ac94');
    document.body.style.background = '';
    document.body.style.color = '';
    document.querySelectorAll('.card,.s-card,.upload-panel,.filter-bar,.comment-box').forEach(function(el) {
      el.style.background = ''; el.style.borderColor = '';
    });
    document.querySelectorAll('select,input:not([type=file]),textarea').forEach(function(el) {
      el.style.color = ''; el.style.background = ''; el.style.borderColor = '';
    });
    if (btn) btn.textContent = '🌙';
  }
  // Always keep header/hero/streak dark
  document.querySelectorAll('header,.hero-band,.streak-card').forEach(function(el) {
    el.style.background = '#0e1a2b';
  });
  document.querySelectorAll('.hero-hl,.streak-title,.streak-sub,.streak-msg,.stat-label,.stat-val').forEach(function(el) {
    el.style.color = '#f5edd8';
  });
}

// ── NAV ──
function scrollToSection(section) {
  document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
  if (event && event.target) event.target.classList.add('active');
  if (section === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
  else if (section === 'library') { var el = document.querySelector('.lib-hd'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
  else if (section === 'upload') { var el2 = document.querySelector('.upload-panel'); if (el2) el2.scrollIntoView({ behavior: 'smooth' }); }
}

function showLiveRooms() {
  navigate('liverooms');
}

function toggleMobileNav() {
  var nav = document.getElementById('mobileNav');
  if (nav) nav.classList.toggle('open');
}

// ── TOAST ──
function toast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (type === 'error' ? ' toast-error' : '');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function() { t.className = 'toast'; }, 3500);
}

// ── SKELETON LOADERS ──
function skeletonCard() {
  return '<div class="skeleton-card"><div class="skeleton skeleton-img"></div><div style="padding:16px"><div class="skeleton skeleton-line" style="width:70%;margin-bottom:10px"></div><div class="skeleton skeleton-line" style="width:50%;margin-bottom:8px"></div><div class="skeleton skeleton-line" style="width:90%"></div></div></div>';
}

function showSkeletons(containerId, count) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var html = '';
  for (var i = 0; i < (count || 3); i++) html += skeletonCard();
  el.innerHTML = '<div class="card-grid">' + html + '</div>';
}

// ── SEARCH AUTOCOMPLETE ──
function acSearch(query, containerId, onSelect) {
  if (!query || query.length < 2) { acHide(); return; }
  fetch('/api/courses?search=' + encodeURIComponent(query))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var courses = Array.isArray(data) ? data : (data.courses || []);
      acShow(courses.slice(0, 6), onSelect);
    })
    .catch(function() {});
}

function acShow(items, onSelect) {
  acHide();
  if (!items.length) return;
  var box = document.createElement('div');
  box.id = 'ac-dropdown';
  box.style.cssText = 'position:absolute;background:var(--paper);border:1px solid var(--rule);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.15);z-index:200;width:100%;max-height:280px;overflow-y:auto;top:100%;left:0';
  items.forEach(function(c) {
    var item = document.createElement('div');
    item.style.cssText = 'padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--rule);font-size:14px;color:var(--ink)';
    item.textContent = c.title + (c.instructor ? ' — ' + c.instructor : '');
    item.onmouseenter = function() { item.style.background = 'var(--paper-tint)'; };
    item.onmouseleave = function() { item.style.background = ''; };
    item.onclick = function() { acHide(); if (onSelect) onSelect(c); };
    box.appendChild(item);
  });
  var inp = document.querySelector('.search-wrap');
  if (inp) { inp.style.position = 'relative'; inp.appendChild(box); }
}

function acHide() {
  var old = document.getElementById('ac-dropdown');
  if (old) old.remove();
}

// ── IMAGE PREVIEW ──
function renderFilePreviews(files, containerId, onRemove) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  Array.from(files).forEach(function(f, i) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;display:inline-block;margin:6px';
    if (f.type.startsWith('image/')) {
      var img = document.createElement('img');
      img.style.cssText = 'width:80px;height:60px;object-fit:cover;border-radius:6px;border:2px solid var(--rule)';
      var reader = new FileReader();
      reader.onload = function(e) { img.src = e.target.result; };
      reader.readAsDataURL(f);
      wrap.appendChild(img);
    } else {
      var icon = document.createElement('div');
      icon.style.cssText = 'width:80px;height:60px;border-radius:6px;background:var(--paper-tint);border:2px solid var(--rule);display:flex;align-items:center;justify-content:center;font-size:24px';
      icon.textContent = f.type.startsWith('video/') ? '🎬' : '🎵';
      wrap.appendChild(icon);
    }
    var name = document.createElement('div');
    name.style.cssText = 'font-size:10px;color:var(--ink-muted);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px';
    name.textContent = f.name;
    var rm = document.createElement('button');
    rm.style.cssText = 'position:absolute;top:-6px;right:-6px;background:#e74c3c;color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;line-height:1;padding:0';
    rm.textContent = '×';
    rm.onclick = function() { if (onRemove) onRemove(i); };
    wrap.appendChild(name);
    wrap.appendChild(rm);
    el.appendChild(wrap);
  });
}

// ── NOTIFICATIONS ──
var notifications = [];
function addNotification(msg, type) {
  notifications.unshift({ msg: msg, type: type || 'info', time: new Date() });
  if (notifications.length > 20) notifications.pop();
  var badge = document.getElementById('notifBadge');
  if (badge) { badge.textContent = notifications.length; badge.style.display = 'inline-block'; }
}

function toggleNotifications() {
  var panel = document.getElementById('notifPanel');
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) {
    var html = notifications.length ? notifications.map(function(n) {
      return '<div style="padding:10px 14px;border-bottom:1px solid var(--rule);font-size:13px;color:var(--ink)">' + n.msg + '</div>';
    }).join('') : '<div style="padding:20px;text-align:center;color:var(--ink-muted);font-size:13px">No notifications</div>';
    panel.innerHTML = html;
    panel.style.display = 'block';
    var badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';
  } else {
    panel.style.display = 'none';
  }
}

// ── SIDEBAR DATA ──
async function loadSidebarData() {
  try {
    var res = await fetch('/api/courses');
    var courses = await res.json();
    if (!Array.isArray(courses)) courses = courses.courses || [];

    // My Courses count
    var myCount = document.getElementById('myCoursesCount');
    if (myCount && currentAccount) {
      var mine = courses.filter(function(c) { return c.createdBy === currentAccount.id || c.createdByName === currentAccount.name; });
      myCount.textContent = mine.length;
    }

    // Featured — 3 most recent
    var featList = document.getElementById('featuredList');
    if (featList) {
      var sorted = courses.slice().sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      featList.innerHTML = sorted.slice(0, 3).map(function(c) {
        return '<div class="feat-item" onclick="navigate(\'course\',{id:\'' + c.id + '\'})" style="cursor:pointer;padding:8px 0;border-bottom:1px solid var(--rule)">' +
          '<div class="feat-title" style="font-size:13px;font-weight:500;color:var(--ink)">' + (c.title || 'Untitled') + '</div>' +
          '<div style="font-size:11px;color:var(--ink-muted)">' + (c.instructor || '') + '</div></div>';
      }).join('');
    }

    // Leaderboard — top instructors by course count
    var lbList = document.getElementById('leaderboardList');
    if (lbList) {
      var counts = {};
      courses.forEach(function(c) { var k = c.instructor || 'Unknown'; counts[k] = (counts[k] || 0) + 1; });
      var ranked = Object.keys(counts).map(function(k) { return { name: k, count: counts[k] }; })
        .sort(function(a, b) { return b.count - a.count; }).slice(0, 5);
      lbList.innerHTML = ranked.map(function(r, i) {
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--rule)">' +
          '<span style="font-size:16px">' + ['🥇','🥈','🥉','4️⃣','5️⃣'][i] + '</span>' +
          '<div><div class="lb-name" style="font-size:13px;font-weight:500;color:var(--ink)">' + r.name + '</div>' +
          '<div style="font-size:11px;color:var(--ink-muted)">' + r.count + ' course' + (r.count > 1 ? 's' : '') + '</div></div></div>';
      }).join('');
    }

    // Streak
    var streakNum = document.getElementById('streakNum');
    var streakMsg = document.getElementById('streakMsg');
    if (streakNum && currentAccount) {
      var mine2 = courses.filter(function(c) { return c.createdBy === currentAccount.id || c.createdByName === currentAccount.name; });
      streakNum.textContent = Math.min(mine2.length, 7);
      if (streakMsg) streakMsg.textContent = mine2.length ? 'Keep learning daily!' : 'Create your first course!';
    }
  } catch(e) { console.warn('Sidebar load failed:', e); }
}

// ── RATINGS ──
async function rateCourse(courseId, stars) {
  var saved = JSON.parse(localStorage.getItem('ratings') || '{}');
  saved[courseId] = stars;
  localStorage.setItem('ratings', JSON.stringify(saved));
  document.querySelectorAll('[data-rating-id="' + courseId + '"] .star').forEach(function(s, i) {
    s.style.color = i < stars ? '#f59e0b' : '#d1d5db';
  });
  toast('Rated ' + stars + ' star' + (stars > 1 ? 's' : ''), 'success');
}

function getRating(courseId) {
  var saved = JSON.parse(localStorage.getItem('ratings') || '{}');
  return saved[courseId] || 0;
}

function renderStars(courseId) {
  var current = getRating(courseId);
  var html = '<span data-rating-id="' + courseId + '">';
  for (var i = 1; i <= 5; i++) {
    html += '<span class="star" data-s="' + i + '" onclick="rateCourse(\'' + courseId + '\',' + i + ')" style="cursor:pointer;font-size:16px;color:' + (i <= current ? '#f59e0b' : '#d1d5db') + '">★</span>';
  }
  html += '</span>';
  return html;
}

// ── PROGRESS ──
function saveProgress(courseId, pct) {
  var saved = JSON.parse(localStorage.getItem('progress') || '{}');
  saved[courseId] = pct;
  localStorage.setItem('progress', JSON.stringify(saved));
}

function getProgress(courseId) {
  var saved = JSON.parse(localStorage.getItem('progress') || '{}');
  return saved[courseId] || 0;
}

// ── BOOT ──
(function() {
  var saved = sessionStorage.getItem('edustream_user');
  if (saved) { try { currentAccount = JSON.parse(saved); } catch(e) {} }
  document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    updateAuthUI();
    navigate('home');
    loadSidebarData();
    // Close dropdowns on outside click
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.search-wrap')) acHide();
      if (!e.target.closest('.notif-wrap')) {
        var p = document.getElementById('notifPanel');
        if (p) p.style.display = 'none';
      }
    });
  });
})();

function initAuth() { /* alias - auth handled in boot */ }
function showLoading(id) { showSkeletons(id, 4); }
