
// ── SKELETON LOADERS ──
function skeletonCard() {
  return `<div class="skeleton-card">
    <div class="skeleton skeleton-strip"></div>
    <div class="skeleton-body">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-sub"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-media"></div>
      <div class="skeleton-actions">
        <div class="skeleton skeleton-btn"></div>
        <div class="skeleton skeleton-btn"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    </div>
  </div>`;
}

function showSkeletons(containerId, count) {
  var el = document.getElementById(containerId);
  if (el) el.innerHTML = Array(count || 3).fill(skeletonCard()).join('');
}

// ── SEARCH AUTOCOMPLETE ──
var acAllCourses = [];
var acDropdown = null;
var acSelectedIdx = -1;

async function initAutocomplete(inputId, onSelect) {
  var input = document.getElementById(inputId);
  if (!input) return;

  // Load courses for autocomplete
  try {
    if (!acAllCourses.length) acAllCourses = await apiGet('/courses');
  } catch(e) {}

  // Wrap input in search-wrap div if not already
  if (!input.parentElement.classList.contains('search-wrap')) {
    var wrap = document.createElement('div');
    wrap.className = 'search-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    acDropdown = document.createElement('div');
    acDropdown.className = 'autocomplete-dropdown';
    acDropdown.style.display = 'none';
    wrap.appendChild(acDropdown);
  }

  input.addEventListener('input', function() {
    acSearch(input.value, onSelect);
  });

  input.addEventListener('keydown', function(e) {
    var items = acDropdown ? acDropdown.querySelectorAll('.autocomplete-item') : [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      acSelectedIdx = Math.min(acSelectedIdx + 1, items.length - 1);
      acUpdateSelected(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      acSelectedIdx = Math.max(acSelectedIdx - 1, -1);
      acUpdateSelected(items);
    } else if (e.key === 'Enter' && acSelectedIdx >= 0 && items[acSelectedIdx]) {
      items[acSelectedIdx].click();
    } else if (e.key === 'Escape') {
      acHide();
    }
  });

  document.addEventListener('click', function(e) {
    if (acDropdown && !acDropdown.contains(e.target) && e.target !== input) acHide();
  });
}

function acSearch(query, onSelect) {
  if (!acDropdown) return;
  acSelectedIdx = -1;
  if (!query || query.length < 1) { acHide(); return; }

  var q = query.toLowerCase();
  var matches = acAllCourses.filter(function(c) {
    return c.title?.toLowerCase().includes(q) ||
           c.instructor?.toLowerCase().includes(q) ||
           c.category?.toLowerCase().includes(q) ||
           (c.tags || []).some(function(t) { return t.toLowerCase().includes(q); });
  }).slice(0, 8);

  if (!matches.length) { acHide(); return; }

  acDropdown.innerHTML = matches.map(function(c, i) {
    var icon = mediaIcon(Object.keys(c.mediaCounts || {video: 1})[0] || 'video');
    var title = escapeHtml(c.title).replace(new RegExp('(' + escapeHtml(query) + ')', 'gi'), '<span class="ac-highlight">$1</span>');
    return `<div class="autocomplete-item" data-idx="${i}" onclick="acSelect('${c.id}')">
      <span class="autocomplete-icon">${icon}</span>
      <div style="flex:1;min-width:0">
        <div class="autocomplete-title">${title}</div>
        <div class="autocomplete-meta">${escapeHtml(c.instructor)} · ${escapeHtml(c.category || 'General')}</div>
      </div>
    </div>`;
  }).join('');

  acDropdown.style.display = 'block';

  window.acSelect = function(courseId) {
    acHide();
    if (onSelect) onSelect(courseId);
    else navigate('course', { id: courseId });
  };
}

function acUpdateSelected(items) {
  items.forEach(function(item, i) {
    item.classList.toggle('ac-selected', i === acSelectedIdx);
  });
}

function acHide() {
  if (acDropdown) acDropdown.style.display = 'none';
  acSelectedIdx = -1;
}

// ── IMAGE PREVIEW BEFORE UPLOAD ──
function renderFilePreviews(files, containerId, onRemove) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var images = files.filter(function(f) { return f.type.startsWith('image/'); });
  var videos = files.filter(function(f) { return f.type.startsWith('video/'); });
  var audios = files.filter(function(f) { return f.type.startsWith('audio/'); });

  var html = '';

  // Image grid with previews
  if (images.length) {
    html += '<div class="preview-grid">';
    images.forEach(function(f, i) {
      var url = URL.createObjectURL(f);
      var idx = files.indexOf(f);
      html += `<div class="preview-img-wrap">
        <img src="${url}" alt="${escapeHtml(f.name)}">
        <button class="preview-remove" onclick="removePreviewFile(${idx},'${containerId}')">×</button>
      </div>`;
    });
    html += '</div>';
  }

  // Video list
  videos.forEach(function(f) {
    var idx = files.indexOf(f);
    var size = (f.size / 1024 / 1024).toFixed(1);
    html += `<div class="preview-video">
      <span>🎬</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(f.name)}</span>
      <span style="font-family:var(--mono);font-size:10px;opacity:0.6">${size}MB</span>
      <button onclick="removePreviewFile(${idx},'${containerId}')" style="background:transparent;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:16px">×</button>
    </div>`;
  });

  // Audio list
  audios.forEach(function(f) {
    var idx = files.indexOf(f);
    var size = (f.size / 1024 / 1024).toFixed(1);
    html += `<div class="preview-audio">
      <span>🎵</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(f.name)}</span>
      <span style="font-family:var(--mono);font-size:10px;color:var(--ink-muted)">${size}MB</span>
      <button onclick="removePreviewFile(${idx},'${containerId}')" style="background:transparent;border:none;color:var(--ink-muted);cursor:pointer;font-size:16px">×</button>
    </div>`;
  });

  container.innerHTML = html || '';
}
