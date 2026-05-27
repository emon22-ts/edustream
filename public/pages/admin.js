// pages/admin.js
// Admin dashboard — users, content, audit logs, stats

registerPage('admin', async function(container) {
  if (!currentAccount || currentAccount.role !== 'admin') {
    container.innerHTML = `<div style="max-width:500px;margin:80px auto;text-align:center;padding:0 28px">
      <div style="font-size:52px;margin-bottom:16px">🚫</div>
      <h2 style="font-family:var(--serif);font-size:28px;font-weight:500;margin-bottom:8px">Access Denied</h2>
      <p style="color:var(--ink-muted);font-style:italic;font-family:var(--serif)">Admin access required.</p>
      <button class="btn btn-primary" style="margin-top:20px" onclick="navigate('home')">Go Home</button>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div style="max-width:1280px;margin:0 auto;padding:28px 28px 80px">
      <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <h1 class="page-title">⚙️ <em>Admin</em> Dashboard</h1>
          <p class="page-subtitle">Platform control — users, content, audit logs</p>
        </div>
        <div style="background:var(--burgundy);color:white;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Admin</div>
      </div>

      <!-- STATS -->
      <div id="adminStats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;margin-bottom:28px">
        <div class="card" style="padding:18px;text-align:center"><div style="font-family:var(--serif);font-size:32px;color:var(--amber)" id="aStat1">—</div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-muted);margin-top:4px">Total Courses</div></div>
        <div class="card" style="padding:18px;text-align:center"><div style="font-family:var(--serif);font-size:32px;color:var(--amber)" id="aStat2">—</div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-muted);margin-top:4px">Active</div></div>
        <div class="card" style="padding:18px;text-align:center"><div style="font-family:var(--serif);font-size:32px;color:var(--burgundy)" id="aStat3">—</div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-muted);margin-top:4px">Deleted</div></div>
        <div class="card" style="padding:18px;text-align:center"><div style="font-family:var(--serif);font-size:32px;color:var(--amber)" id="aStat4">—</div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-muted);margin-top:4px">Total Users</div></div>
        <div class="card" style="padding:18px;text-align:center"><div style="font-family:var(--serif);font-size:32px;color:var(--burgundy)" id="aStat5">—</div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-muted);margin-top:4px">Banned</div></div>
      </div>

      <!-- TABS -->
      <div style="display:flex;gap:2px;border-bottom:2px solid var(--ink);margin-bottom:24px">
        <button class="dash-tab active" data-tab="users" onclick="adminTab('users')">👥 Users</button>
        <button class="dash-tab" data-tab="content" onclick="adminTab('content')">📚 Content</button>
        <button class="dash-tab" data-tab="audit" onclick="adminTab('audit')">📋 Audit Log</button>
      </div>

      <div id="adminTabContent"></div>
    </div>`;

  const style = document.createElement('style');
  style.textContent = `.dash-tab{background:transparent;border:none;padding:10px 18px;font-family:var(--sans);font-size:13px;color:var(--ink-muted);cursor:pointer;border-radius:6px 6px 0 0;transition:all 0.15s}.dash-tab.active{color:var(--amber);font-weight:600;background:var(--paper);border:1px solid var(--ink);border-bottom:2px solid var(--paper);margin-bottom:-2px}`;
  document.head.appendChild(style);

  // Load stats
  try {
    const stats = await apiGet('/admin/stats');
    document.getElementById('aStat1').textContent = stats.totalCourses;
    document.getElementById('aStat2').textContent = stats.activeCourses;
    document.getElementById('aStat3').textContent = stats.deletedCourses;
    document.getElementById('aStat4').textContent = stats.totalUsers;
    document.getElementById('aStat5').textContent = stats.bannedUsers;
  } catch(e) {}

  window.adminTab = async function(tab) {
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const content = document.getElementById('adminTabContent');

    if (tab === 'users') {
      content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ink-muted)">Loading users...</div>';
      try {
        const users = await apiGet('/admin/users');
        content.innerHTML = `
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead><tr style="background:var(--ink);color:var(--paper)">
                <th style="padding:10px 14px;text-align:left;font-weight:600">Name</th>
                <th style="padding:10px 14px;text-align:left;font-weight:600">Email</th>
                <th style="padding:10px 14px;text-align:left;font-weight:600">Role</th>
                <th style="padding:10px 14px;text-align:left;font-weight:600">Status</th>
                <th style="padding:10px 14px;text-align:left;font-weight:600">Joined</th>
                <th style="padding:10px 14px;text-align:left;font-weight:600">Actions</th>
              </tr></thead>
              <tbody>
                ${users.map((u, i) => `<tr style="background:${i%2===0?'var(--paper)':'var(--paper-tint)'};border-bottom:1px solid var(--rule)">
                  <td style="padding:10px 14px;font-weight:500">${escapeHtml(u.name)}</td>
                  <td style="padding:10px 14px;color:var(--ink-muted);font-family:var(--mono);font-size:11px">${escapeHtml(u.email)}</td>
                  <td style="padding:10px 14px"><span style="background:${u.role==='admin'?'var(--burgundy)':u.role==='moderator'?'var(--amber)':'var(--ink)'};color:white;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase">${u.role||'user'}</span></td>
                  <td style="padding:10px 14px"><span style="color:${u.isBanned?'var(--burgundy)':'var(--moss)';font-weight:600">${u.isBanned?'🚫 Banned':'✅ Active'}</span></td>
                  <td style="padding:10px 14px;color:var(--ink-muted);font-size:11px">${formatDate(u.createdAt)}</td>
                  <td style="padding:10px 14px">
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      ${u.id !== 'admin' ? `
                        ${u.isBanned ?
                          `<button onclick="adminUnban('${u.id}')" class="btn btn-sm btn-secondary">Unban</button>` :
                          `<button onclick="adminBan('${u.id}')" class="btn btn-sm btn-danger">Ban</button>`}
                        <select onchange="adminSetRole('${u.id}',this.value)" style="padding:4px 8px;font-size:11px;border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);background:var(--paper)">
                          <option value="user" ${u.role==='user'?'selected':''}>User</option>
                          <option value="moderator" ${u.role==='moderator'?'selected':''}>Moderator</option>
                          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                        </select>` : '<span style="font-size:11px;color:var(--ink-muted)">Super admin</span>'}
                    </div>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      } catch(e) { content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load users</div><div class="empty-text">${e.message}</div></div>`; }

    } else if (tab === 'content') {
      content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ink-muted)">Loading content...</div>';
      try {
        const courses = await apiGet('/courses');
        content.innerHTML = `
          <div style="margin-bottom:12px;font-size:13px;color:var(--ink-muted)">${courses.length} courses total</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${courses.map(c => `<div class="card" style="padding:14px 18px;display:flex;align-items:center;gap:14px;${c.isDeleted?'opacity:0.6;border-color:var(--burgundy)':''}">
              <div style="flex:1">
                <div style="font-weight:500;font-size:14px">${escapeHtml(c.title)} ${c.isDeleted?'<span style="color:var(--burgundy);font-size:11px">[DELETED]</span>':''}</div>
                <div style="font-size:12px;color:var(--ink-muted)">By ${escapeHtml(c.instructor)} · ${escapeHtml(c.category||'General')} · ${formatRelative(c.createdAt)}</div>
              </div>
              <div style="display:flex;gap:8px">
                <button onclick="navigate('course',{id:'${c.id}'})" class="btn btn-sm btn-secondary">View</button>
                ${c.isDeleted ?
                  `<button onclick="adminRestore('${c.id}')" class="btn btn-sm btn-secondary">♻️ Restore</button>` :
                  `<button onclick="adminDeleteCourse('${c.id}')" class="btn btn-sm btn-danger">Delete</button>`}
              </div>
            </div>`).join('')}
          </div>`;
      } catch(e) { content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load</div></div>`; }

    } else if (tab === 'audit') {
      content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--ink-muted)">Loading audit log...</div>';
      try {
        const logs = await apiGet('/admin/audit');
        content.innerHTML = `
          <div style="font-size:13px;color:var(--ink-muted);margin-bottom:12px">Last 100 actions</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${logs.map(l => `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius);font-size:12px">
              <span style="font-family:var(--mono);color:var(--ink-muted);flex-shrink:0">${new Date(l.timestamp).toLocaleString()}</span>
              <span style="background:var(--ink);color:var(--paper);padding:1px 7px;border-radius:999px;font-size:10px;font-weight:700;text-transform:uppercase;flex-shrink:0">${escapeHtml(l.action)}</span>
              <span style="color:var(--amber);font-weight:500;flex-shrink:0">${escapeHtml(l.userName||l.userId)}</span>
              <span style="color:var(--ink-muted)">→ ${escapeHtml(l.resourceType)} ${escapeHtml(l.resourceId||'').slice(0,16)}</span>
            </div>`).join('')}
          </div>`;
      } catch(e) { content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load audit log</div></div>`; }
    }
  };

  // Admin actions
  window.adminBan = async function(userId) {
    const reason = prompt('Reason for ban:');
    if (reason === null) return;
    try {
      await apiPost('/admin/users/' + userId + '/ban', { reason });
      toast('User banned', 'success');
      adminTab('users');
    } catch(e) { toast(e.message, 'error'); }
  };

  window.adminUnban = async function(userId) {
    try {
      await apiPost('/admin/users/' + userId + '/unban', {});
      toast('User unbanned', 'success');
      adminTab('users');
    } catch(e) { toast(e.message, 'error'); }
  };

  window.adminSetRole = async function(userId, role) {
    try {
      await apiPost('/admin/users/' + userId + '/role', { role });
      toast('Role updated to ' + role, 'success');
    } catch(e) { toast(e.message, 'error'); }
  };

  window.adminRestore = async function(courseId) {
    try {
      await apiPost('/admin/courses/' + courseId + '/restore', {});
      toast('Course restored', 'success');
      adminTab('content');
    } catch(e) { toast(e.message, 'error'); }
  };

  window.adminDeleteCourse = async function(courseId) {
    if (!confirm('Delete this course? (Can be restored)')) return;
    try {
      await apiDelete('/courses/' + courseId);
      toast('Course deleted', 'success');
      adminTab('content');
    } catch(e) { toast(e.message, 'error'); }
  };

  // Load default tab
  adminTab('users');
});
