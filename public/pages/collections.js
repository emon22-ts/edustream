// pages/collections.js - Course collections / playlists

registerPage('collections', async function(container) {
  container.innerHTML = `
  <div style="max-width:1100px;margin:0 auto;padding:28px 28px 80px">
    <div class="page-header">
      <h1 class="page-title">📁 My <em>Collections</em></h1>
      <p class="page-subtitle">Group courses into learning paths and share them with others.</p>
    </div>

    <div style="display:grid;grid-template-columns:340px 1fr;gap:24px;align-items:start">
      <!-- CREATE PANEL -->
      <div class="card" style="padding:22px;position:sticky;top:78px">
        <h3 style="font-family:var(--serif);font-size:18px;font-weight:500;margin-bottom:4px">New Collection</h3>
        <p style="font-size:12px;font-style:italic;font-family:var(--serif);color:var(--ink-muted);margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--rule)">Curate courses into a learning path</p>
        <div class="field"><label>Collection Name</label><input type="text" id="colName" placeholder="e.g. Azure Learning Path"></div>
        <div class="field"><label>Description</label><textarea id="colDesc" placeholder="What will learners gain from this collection?" style="min-height:70px"></textarea></div>
        <div class="field"><label>Emoji Icon</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px" id="emojiPicker">
            ${['📚','🚀','☁️','🎯','💡','🔥','⭐','🏆','🎓','💻','🌐','🔬'].map(e => 
              `<span onclick="selectEmoji('${e}')" style="font-size:22px;cursor:pointer;padding:4px;border-radius:5px;border:2px solid transparent" class="emoji-opt">${e}</span>`
            ).join('')}
          </div>
          <input type="hidden" id="colEmoji" value="📚">
        </div>
        <button class="btn btn-primary" style="width:100%;padding:11px;margin-top:8px" onclick="createCollection()">Create Collection</button>
      </div>

      <!-- COLLECTIONS LIST -->
      <div>
        <div id="collectionsList"></div>
      </div>
    </div>
  </div>`;

  // Emoji picker
  window.selectEmoji = function(e) {
    document.getElementById('colEmoji').value = e;
    document.querySelectorAll('.emoji-opt').forEach(el => {
      el.style.borderColor = el.textContent === e ? 'var(--amber)' : 'transparent';
      el.style.background = el.textContent === e ? 'var(--amber-pale)' : 'transparent';
    });
  };

  // Load collections from localStorage
  function getCollections() {
    try { return JSON.parse(localStorage.getItem('edustream_collections') || '[]'); } catch { return []; }
  }
  function saveCollections(cols) {
    localStorage.setItem('edustream_collections', JSON.stringify(cols));
  }

  window.createCollection = function() {
    if (!requireAuth()) return;
    const name = document.getElementById('colName').value.trim();
    if (!name) return toast('Collection name is required', 'error');
    const cols = getCollections();
    const col = {
      id: 'col_' + Date.now(),
      name,
      description: document.getElementById('colDesc').value.trim(),
      emoji: document.getElementById('colEmoji').value,
      courses: [],
      createdBy: currentAccount.name,
      createdAt: new Date().toISOString()
    };
    cols.unshift(col);
    saveCollections(cols);
    document.getElementById('colName').value = '';
    document.getElementById('colDesc').value = '';
    toast('Collection created!', 'success');
    renderCollections();
  };

  window.deleteCollection = function(id) {
    if (!confirm('Delete this collection?')) return;
    const cols = getCollections().filter(c => c.id !== id);
    saveCollections(cols);
    renderCollections();
    toast('Collection deleted', 'success');
  };

  window.removeCourseFromCollection = function(colId, courseId) {
    const cols = getCollections();
    const col = cols.find(c => c.id === colId);
    if (col) col.courses = col.courses.filter(id => id !== courseId);
    saveCollections(cols);
    renderCollections();
  };

  window.addCourseToCollection = async function(colId) {
    // Load all courses and show picker
    const courses = await apiGet('/courses');
    const cols = getCollections();
    const col = cols.find(c => c.id === colId);
    if (!col) return;
    const available = courses.filter(c => !col.courses.includes(c.id));
    if (!available.length) return toast('All courses already in this collection', 'error');

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(14,26,43,0.88);z-index:400;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `<div style="background:var(--paper);border-radius:var(--radius-lg);padding:24px;width:100%;max-width:500px;max-height:80vh;overflow-y:auto">
      <h3 style="font-family:var(--serif);font-size:20px;font-weight:500;margin-bottom:16px">Add course to "${escapeHtml(col.name)}"</h3>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${available.map(c => `
          <div onclick="addToCol('${colId}','${c.id}')" style="padding:12px 16px;border:1px solid var(--rule);border-radius:var(--radius);cursor:pointer;display:flex;align-items:center;gap:12px;transition:background 0.12s" onmouseover="this.style.background='var(--paper-tint)'" onmouseout="this.style.background=''">
            <div style="font-size:22px">${mediaIcon(Object.keys(c.mediaCounts||{video:1})[0])}</div>
            <div><div style="font-weight:500;font-size:14px">${escapeHtml(c.title)}</div><div style="font-size:12px;color:var(--ink-muted)">${escapeHtml(c.instructor)}</div></div>
          </div>`).join('')}
      </div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;margin-top:14px;padding:10px;background:transparent;border:1px solid var(--rule);border-radius:var(--radius);cursor:pointer;font-family:var(--sans)">Cancel</button>
    </div>`;
    document.body.appendChild(modal);

    window.addToCol = function(colId, courseId) {
      const cols = getCollections();
      const col = cols.find(c => c.id === colId);
      if (col && !col.courses.includes(courseId)) col.courses.push(courseId);
      saveCollections(cols);
      modal.remove();
      toast('Course added to collection!', 'success');
      renderCollections();
    };
  };

  async function renderCollections() {
    const cols = getCollections();
    const list = document.getElementById('collectionsList');
    if (!list) return;

    if (!cols.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-title">No collections yet</div><div class="empty-text">Create your first learning path on the left.</div></div>`;
      return;
    }

    // Load all courses for reference
    let allCourses = [];
    try { allCourses = await apiGet('/courses'); } catch(e) {}

    list.innerHTML = cols.map(col => {
      const courses = col.courses.map(id => allCourses.find(c => c.id === id)).filter(Boolean);
      return `<div class="card" style="overflow:hidden;margin-bottom:18px">
        <div style="padding:16px 20px;background:var(--ink);color:var(--paper);display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:28px">${col.emoji}</span>
            <div>
              <div style="font-family:var(--serif);font-size:18px;font-weight:500">${escapeHtml(col.name)}</div>
              <div style="font-size:12px;opacity:0.6">${courses.length} courses · by ${escapeHtml(col.createdBy)} · ${formatRelative(col.createdAt)}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="addCourseToCollection('${col.id}')" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:var(--paper);padding:6px 12px;border-radius:var(--radius);font-size:12px;cursor:pointer;font-family:var(--sans)">+ Add course</button>
            <button onclick="deleteCollection('${col.id}')" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.6);padding:6px 10px;border-radius:var(--radius);font-size:12px;cursor:pointer">🗑</button>
          </div>
        </div>
        ${col.description ? `<div style="padding:10px 20px;background:var(--paper-tint);border-bottom:1px solid var(--rule);font-size:13px;color:var(--ink-soft);font-style:italic;font-family:var(--serif)">${escapeHtml(col.description)}</div>` : ''}
        <div style="padding:16px 20px">
          ${courses.length ? `
            <div style="display:flex;flex-direction:column;gap:8px">
              ${courses.map((c, i) => `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid var(--rule);border-radius:var(--radius);cursor:pointer" onclick="navigate('course',{id:'${c.id}'})">
                  <span style="font-family:var(--mono);font-size:12px;color:var(--amber);font-weight:600;width:20px">${i+1}</span>
                  <span style="font-size:18px">${mediaIcon(Object.keys(c.mediaCounts||{video:1})[0])}</span>
                  <div style="flex:1">
                    <div style="font-weight:500;font-size:14px">${escapeHtml(c.title)}</div>
                    <div style="font-size:11px;color:var(--ink-muted)">${escapeHtml(c.instructor)}</div>
                  </div>
                  <button onclick="event.stopPropagation();removeCourseFromCollection('${col.id}','${c.id}')" style="background:transparent;border:none;color:var(--ink-muted);cursor:pointer;font-size:14px;padding:4px">×</button>
                </div>`).join('')}
            </div>` :
            `<div style="text-align:center;padding:20px;color:var(--ink-muted);font-style:italic;font-family:var(--serif)">No courses yet. Click "+ Add course" to get started.</div>`}
        </div>
      </div>`;
    }).join('');
  }

  renderCollections();
});
