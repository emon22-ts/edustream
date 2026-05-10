// pages/dashboard.js
// Dashboard page — my courses, enrolled courses, stats

registerPage('dashboard', async function(container, params) {
  if (!currentAccount) {
    container.innerHTML = `
      <div style="max-width:500px;margin:80px auto;text-align:center;padding:0 28px">
        <div style="font-size:52px;margin-bottom:16px">🔒</div>
        <h2 style="font-family:var(--serif);font-size:28px;font-weight:500;margin-bottom:8px">Sign in required</h2>
        <p style="color:var(--ink-muted);font-style:italic;font-family:var(--serif);margin-bottom:24px">Your dashboard is personal to you. Please sign in to view it.</p>
        <button class="btn btn-primary" onclick="showLoginModal()">Sign in</button>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="max-width:1280px;margin:0 auto;padding:28px 28px 80px">
      <div class="page-header">
        <h1 class="page-title">📊 My <em>Dashboard</em></h1>
        <p class="page-subtitle">Welcome back, ${escapeHtml(currentAccount.name)}. Here's your learning overview.</p>
      </div>

      <!-- STATS GRID -->
      <div id="dashStats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;margin-bottom:32px">
        <div class="stat-card"><div class="stat-card-num" id="dsMyCourses">—</div><div class="stat-card-label">Courses created</div></div>
        <div class="stat-card"><div class="stat-card-num" id="dsEnrolled">—</div><div class="stat-card-label">Enrolled</div></div>
        <div class="stat-card"><div class="stat-card-num" id="dsStreak">—</div><div class="stat-card-label">Day streak 🔥</div></div>
        <div class="stat-card"><div class="stat-card-num" id="dsPoints">—</div><div class="stat-card-label">Points</div></div>
        <div class="stat-card"><div class="stat-card-num" id="dsRank">—</div><div class="stat-card-label">Leaderboard rank</div></div>
        <div class="stat-card"><div class="stat-card-num" id="dsMedia">—</div><div class="stat-card-label">Media files uploaded</div></div>
      </div>

      <!-- TABS -->
      <div style="display:flex;gap:2px;border-bottom:2px solid var(--ink);margin-bottom:24px">
        <button class="dash-tab active" data-tab="my" onclick="dashSwitchTab('my')">📚 My Courses</button>
        <button class="dash-tab" data-tab="enrolled" onclick="dashSwitchTab('enrolled')">🔖 Enrolled</button>
        <button class="dash-tab" data-tab="activity" onclick="dashSwitchTab('activity')">📈 Activity</button>
        <button class="dash-tab" data-tab="leaderboard" onclick="dashSwitchTab('leaderboard')">🏆 Leaderboard</button>
      </div>

      <!-- TAB CONTENT -->
      <div id="dashTabContent"></div>
    </div>`;

  // CSS for stat cards and tabs
  const style = document.createElement('style');
  style.textContent = `
    .stat-card{background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius-lg);padding:20px;text-align:center;box-shadow:var(--shadow)}
    .stat-card-num{font-family:var(--serif);font-size:36px;font-weight:500;color:var(--amber);line-height:1;margin-bottom:6px}
    .stat-card-label{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-muted);font-weight:600}
    .dash-tab{background:transparent;border:none;padding:10px 18px;font-family:var(--sans);font-size:13px;color:var(--ink-muted);cursor:pointer;border-radius:6px 6px 0 0;transition:all 0.15s;font-weight:400}
    .dash-tab:hover{color:var(--ink);background:var(--paper-tint)}
    .dash-tab.active{color:var(--amber);font-weight:600;background:var(--paper);border:1px solid var(--ink);border-bottom:2px solid var(--paper);margin-bottom:-2px}
    .progress-bar{height:6px;background:var(--paper-deep);border-radius:3px;overflow:hidden;margin-top:6px}
    .progress-fill{height:100%;background:var(--amber);border-radius:3px;transition:width 0.5s ease}
  `;
  document.head.appendChild(style);

  // Load all data
  let allCourses = [], enrollments = [];
  try {
    showLoading();
    [allCourses, enrollments] = await Promise.all([
      apiGet('/courses'),
      currentAccount ? apiGet('/users/me/enrollments').catch(() => []) : Promise.resolve([])
    ]);
  } catch(e) {} finally { hideLoading(); }

  // Calculate stats
  const myCourses = allCourses.filter(c =>
    c.createdBy === currentAccount.id ||
    c.instructor?.toLowerCase() === currentAccount.name.toLowerCase() ||
    c.createdByName === currentAccount.name
  );

  const totalMedia = myCourses.reduce((sum, c) => sum + (c.media?.length || 0), 0);

  // Streak calculation
  const dates = [...new Set(allCourses.map(c => new Date(c.createdAt).toDateString()))].sort((a,b) => new Date(b)-new Date(a));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const diff = Math.floor((today - new Date(dates[i])) / 86400000);
    if (diff <= i+1) streak++; else break;
  }
  if (streak === 0 && dates.length > 0) streak = 1;

  // Leaderboard rank
  const counts = {};
  allCourses.forEach(c => { const n = c.instructor||'Unknown'; counts[n] = (counts[n]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const myName = currentAccount.name;
  const rank = sorted.findIndex(([n]) => n.toLowerCase() === myName.toLowerCase()) + 1;
  const points = (myCourses.length * 100) + (enrollments.length * 20) + (streak * 10);

  // Update stat cards
  document.getElementById('dsMyCourses').textContent = myCourses.length;
  document.getElementById('dsEnrolled').textContent = enrollments.length;
  document.getElementById('dsStreak').textContent = streak;
  document.getElementById('dsPoints').textContent = points;
  document.getElementById('dsRank').textContent = rank > 0 ? `#${rank}` : '—';
  document.getElementById('dsMedia').textContent = totalMedia;

  // Tab switcher
  const tabContent = document.getElementById('dashTabContent');

  window.dashSwitchTab = (tab) => {
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    if (tab === 'my') renderMyCourses();
    else if (tab === 'enrolled') renderEnrolled();
    else if (tab === 'activity') renderActivity();
    else if (tab === 'leaderboard') renderLeaderboard();
  };

  function renderMyCourses() {
    if (!myCourses.length) {
      tabContent.innerHTML = `<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">No courses yet</div><div class="empty-text">Go to Home and publish your first course.</div><button class="btn btn-primary" style="margin-top:16px" onclick="navigate('home')">Create a course</button></div>`;
      return;
    }
    tabContent.innerHTML = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--ink-muted)">${myCourses.length} course${myCourses.length!==1?'s':''} created by you</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
        ${myCourses.map(c => `
          <div class="card" style="overflow:hidden;cursor:pointer" onclick="navigate('course',{id:'${c.id}'})">
            <div style="padding:14px 18px;border-bottom:1px solid var(--rule);background:var(--paper-tint);display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:var(--burgundy)">${escapeHtml(c.category||'General')}</span>
              <span style="font-size:11px;color:var(--ink-muted)">${formatRelative(c.createdAt)}</span>
            </div>
            <div style="padding:16px 18px">
              <h3 style="font-family:var(--serif);font-size:17px;font-weight:500;margin-bottom:6px">${escapeHtml(c.title)}</h3>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
                ${Object.entries(c.mediaCounts||{}).map(([t,n]) => `<span style="background:var(--ink);color:var(--paper);padding:2px 7px;border-radius:999px;font-size:10px">${mediaIcon(t)} ${n}</span>`).join('')}
              </div>
              <div style="display:flex;gap:8px" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-secondary" onclick="navigate('course',{id:'${c.id}'})">View</button>
                <button class="btn btn-sm btn-secondary" onclick="editCourse('${c.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCourse('${c.id}')">Delete</button>
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function renderEnrolled() {
    if (!enrollments.length) {
      tabContent.innerHTML = `<div class="empty-state"><div class="empty-icon">🔖</div><div class="empty-title">No enrollments yet</div><div class="empty-text">Browse courses and click Enroll to start learning.</div><button class="btn btn-primary" style="margin-top:16px" onclick="navigate('explore')">Explore courses</button></div>`;
      return;
    }
    tabContent.innerHTML = `
      <div style="margin-bottom:12px;font-size:13px;color:var(--ink-muted)">Enrolled in ${enrollments.length} course${enrollments.length!==1?'s':''}</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${enrollments.map(e => {
          const course = allCourses.find(c => c.id === e.courseId);
          const progress = e.progressPct || 0;
          return `<div class="card" style="padding:16px 20px;display:flex;align-items:center;gap:16px;cursor:pointer" onclick="navigate('course',{id:'${e.courseId}'})">
            <div style="font-size:32px">${course ? mediaIcon(Object.keys(course.mediaCounts||{})[0]||'video') : '📚'}</div>
            <div style="flex:1;min-width:0">
              <div style="font-family:var(--serif);font-size:16px;font-weight:500;margin-bottom:4px">${course ? escapeHtml(course.title) : 'Course #' + e.courseId.slice(0,8)}</div>
              <div style="font-size:12px;color:var(--ink-muted);margin-bottom:6px">Enrolled ${formatRelative(e.enrolledAt)}</div>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${progress}%"></div></div>
                <span style="font-size:12px;font-family:var(--mono);color:var(--ink-muted)">${progress}%</span>
              </div>
            </div>
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();navigate('course',{id:'${e.courseId}'})">Continue →</button>
          </div>`;
        }).join('')}
      </div>`;
  }

  function renderActivity() {
    // Group courses by date
    const byDate = {};
    allCourses.forEach(c => {
      const d = new Date(c.createdAt).toDateString();
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(c);
    });
    const sortedDates = Object.keys(byDate).sort((a,b) => new Date(b)-new Date(a));

    tabContent.innerHTML = `
      <h3 style="font-family:var(--serif);font-size:18px;font-weight:500;margin-bottom:16px">Your Activity Timeline</h3>
      ${sortedDates.length ? sortedDates.map(date => `
        <div style="display:flex;gap:16px;margin-bottom:20px">
          <div style="flex-shrink:0;width:100px;text-align:right;font-size:12px;color:var(--ink-muted);font-family:var(--mono);padding-top:4px">${new Date(date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
          <div style="width:2px;background:var(--rule);border-radius:1px;position:relative"><div style="position:absolute;top:4px;left:-4px;width:10px;height:10px;border-radius:50%;background:var(--amber)"></div></div>
          <div style="flex:1">
            ${byDate[date].map(c => `
              <div style="background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius);padding:10px 14px;margin-bottom:8px;cursor:pointer" onclick="navigate('course',{id:'${c.id}'})">
                <div style="font-weight:500;font-size:14px">${escapeHtml(c.title)}</div>
                <div style="font-size:12px;color:var(--ink-muted)">By ${escapeHtml(c.instructor)} · ${escapeHtml(c.category||'General')}</div>
              </div>`).join('')}
          </div>
        </div>`).join('') : '<div class="empty-state"><div class="empty-icon">📈</div><div class="empty-title">No activity yet</div><div class="empty-text">Create your first course to see activity here.</div></div>'}`;
  }

  function renderLeaderboard() {
    const sorted2 = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    tabContent.innerHTML = `
      <h3 style="font-family:var(--serif);font-size:18px;font-weight:500;margin-bottom:16px">Global Leaderboard</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${sorted2.map(([name,count],i) => {
          const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
          const pts = count*100 + (sorted2.length-i)*20;
          const isMe = name.toLowerCase() === myName.toLowerCase();
          const max = sorted2[0][1];
          return `<div style="background:${isMe?'var(--amber-pale)':'var(--paper)'};border:${isMe?'2px solid var(--amber)':'1px solid var(--rule)'};border-radius:var(--radius-lg);padding:16px 20px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow)">
            <div style="font-family:var(--mono);font-size:20px;font-weight:600;color:${i===0?'#f5a623':i===1?'#9e9e9e':i===2?'#cd7f32':'var(--ink-muted)'};width:32px;text-align:center">${i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</div>
            <div style="width:40px;height:40px;border-radius:50%;background:${isMe?'var(--amber)':'var(--ink)'};color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px">${initials}</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:15px">${escapeHtml(name)} ${isMe?'<span style="background:var(--amber);color:white;font-size:10px;padding:2px 6px;border-radius:999px;font-weight:600">YOU</span>':''}</div>
              <div style="font-size:12px;color:var(--ink-muted)">${count} course${count!==1?'s':''} created</div>
              <div style="height:4px;background:var(--paper-deep);border-radius:2px;margin-top:6px;overflow:hidden"><div style="height:100%;background:${isMe?'var(--amber)':'var(--ink)'};border-radius:2px;width:${Math.round((count/max)*100)}%"></div></div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--serif);font-size:24px;font-weight:500;color:var(--amber)">${pts}</div>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--ink-muted)">points</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  // Render initial tab
  const initialTab = params.tab || 'my';
  dashSwitchTab(initialTab);
});
