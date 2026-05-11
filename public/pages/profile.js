// pages/profile.js
// Profile page — public user profile with bio, stats, courses

registerPage('profile', async function(container, params) {
  const username = params.username || (currentAccount && currentAccount.username) || 'me';
  const isMe = currentAccount && (username === 'me' || username === currentAccount.username || username === currentAccount.id);

  container.innerHTML = `<div style="max-width:1000px;margin:0 auto;padding:28px 28px 80px">
    <div id="profileContent"><div style="padding:60px;text-align:center;color:var(--ink-muted);font-style:italic;font-family:var(--serif)">Loading profile...</div></div>
  </div>`;

  try {
    // Load all courses to build profile from
    const allCourses = await apiGet('/courses');
    const profileName = isMe && currentAccount ? currentAccount.name : username;
    const profileCourses = allCourses.filter(c =>
      c.instructor?.toLowerCase() === profileName.toLowerCase() ||
      c.createdByName === profileName ||
      (isMe && c.createdBy === (currentAccount?.id || 'admin'))
    );

    // Stats
    const totalMedia = profileCourses.reduce((s, c) => s + (c.media?.length || 0), 0);
    const categories = [...new Set(profileCourses.map(c => c.category).filter(Boolean))];
    const joinDate = profileCourses.length ? profileCourses.sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt))[0].createdAt : new Date().toISOString();
    const initials = profileName.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const points = profileCourses.length * 100 + totalMedia * 20;

    // Get stored bio from sessionStorage (simple persistence)
    const bioKey = 'profile_bio_' + profileName;
    let bio = sessionStorage.getItem(bioKey) || '';

    document.getElementById('profileContent').innerHTML = `
      <!-- PROFILE HEADER -->
      <div style="background:var(--ink);border-radius:var(--radius-lg);padding:36px;margin-bottom:24px;color:var(--paper);display:grid;grid-template-columns:auto 1fr auto;gap:28px;align-items:start">
        <!-- AVATAR -->
        <div style="position:relative">
          <div id="profileAvatar" style="width:90px;height:90px;border-radius:50%;background:var(--amber);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:36px;font-weight:500;color:white;cursor:${isMe?'pointer':'default'};border:3px solid rgba(255,255,255,0.2)">${initials}</div>
          ${isMe ? '<div style="position:absolute;bottom:2px;right:2px;background:var(--amber);border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer" onclick="changeAvatar()">✏️</div>' : ''}
        </div>

        <!-- INFO -->
        <div>
          <h1 style="font-family:var(--serif);font-size:28px;font-weight:500;margin-bottom:6px">${escapeHtml(profileName)}</h1>
          <div style="font-size:13px;opacity:0.6;margin-bottom:12px;font-family:var(--mono)">Member since ${formatDate(joinDate)}</div>
          ${bio ? `<p id="profileBio" style="font-size:14px;line-height:1.6;opacity:0.8;max-width:500px">${escapeHtml(bio)}</p>` :
            isMe ? `<p id="profileBio" style="font-size:14px;opacity:0.5;font-style:italic;cursor:pointer" onclick="editBio()">Click to add a bio...</p>` :
            '<p id="profileBio" style="font-size:14px;opacity:0.5;font-style:italic">No bio yet.</p>'}
          ${isMe ? `<button onclick="editBio()" style="margin-top:10px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:var(--paper);padding:5px 12px;border-radius:var(--radius);font-size:12px;cursor:pointer;font-family:var(--sans)">✏️ Edit bio</button>` : ''}
        </div>

        <!-- STATS -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center">
          <div style="background:rgba(255,255,255,0.08);border-radius:var(--radius);padding:14px">
            <div style="font-family:var(--serif);font-size:28px;font-weight:500;color:var(--amber)">${profileCourses.length}</div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin-top:3px">Courses</div>
          </div>
          <div style="background:rgba(255,255,255,0.08);border-radius:var(--radius);padding:14px">
            <div style="font-family:var(--serif);font-size:28px;font-weight:500;color:var(--amber)">${totalMedia}</div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin-top:3px">Media files</div>
          </div>
          <div style="background:rgba(255,255,255,0.08);border-radius:var(--radius);padding:14px">
            <div style="font-family:var(--serif);font-size:28px;font-weight:500;color:var(--amber)">${points}</div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin-top:3px">Points</div>
          </div>
          <div style="background:rgba(255,255,255,0.08);border-radius:var(--radius);padding:14px">
            <div style="font-family:var(--serif);font-size:28px;font-weight:500;color:var(--amber)">${categories.length}</div>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.5;margin-top:3px">Subjects</div>
          </div>
        </div>
      </div>

      <!-- CATEGORIES -->
      ${categories.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">
        ${categories.map(c => `<span style="background:var(--paper-tint);border:1px solid var(--rule);padding:4px 14px;border-radius:999px;font-size:13px;color:var(--ink-soft)">${escapeHtml(c)}</span>`).join('')}
      </div>` : ''}

      <!-- COURSES -->
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid var(--ink)">
        <h2 style="font-family:var(--serif);font-size:22px;font-weight:500">${isMe ? 'My' : escapeHtml(profileName) + "'s"} <em style="font-style:italic;color:var(--amber)">Courses</em></h2>
        <span style="font-size:12px;font-family:var(--mono);color:var(--ink-muted)">${profileCourses.length} courses</span>
      </div>

      ${profileCourses.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
          ${profileCourses.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).map(c => {
            const badges = Object.entries(c.mediaCounts||{}).map(([t,n]) => `<span style="background:var(--ink);color:var(--paper);padding:2px 7px;border-radius:999px;font-size:10px">${mediaIcon(t)} ${n}</span>`).join(' ');
            const preview = (c.media||[]).find(m => m.mediaType === 'image');
            return `<div class="card" onclick="navigate('course',{id:'${c.id}'})" style="cursor:pointer;overflow:hidden">
              ${preview ? `<div style="height:140px;overflow:hidden"><img src="${preview.cdnUrl||preview.directUrl}" style="width:100%;height:100%;object-fit:cover"></div>` :
                `<div style="height:140px;background:var(--ink);display:flex;align-items:center;justify-content:center;font-size:36px">${mediaIcon(Object.keys(c.mediaCounts||{video:1})[0])}</div>`}
              <div style="padding:14px">
                <div style="font-family:var(--serif);font-size:16px;font-weight:500;margin-bottom:5px">${escapeHtml(c.title)}</div>
                <div style="font-size:11px;color:var(--ink-muted);margin-bottom:8px">${formatRelative(c.createdAt)}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap">${badges}</div>
              </div>
            </div>`;
          }).join('')}
        </div>` :
        `<div class="empty-state">
          <div class="empty-icon">📚</div>
          <div class="empty-title">No courses yet</div>
          <div class="empty-text">${isMe ? 'Go to Home and publish your first course.' : 'This user hasn\'t published any courses yet.'}</div>
          ${isMe ? '<button class="btn btn-primary" style="margin-top:16px" onclick="navigate(\'home\')">Create a course</button>' : ''}
        </div>`}

      <!-- BIO EDIT MODAL -->
      <div id="bioModal" style="display:none;position:fixed;inset:0;background:rgba(14,26,43,0.88);z-index:400;align-items:center;justify-content:center">
        <div style="background:var(--paper);padding:28px;border-radius:var(--radius-lg);width:100%;max-width:460px">
          <h3 style="font-family:var(--serif);font-size:20px;font-weight:500;margin-bottom:14px">Edit your bio</h3>
          <textarea id="bioInput" placeholder="Tell the community about yourself..." style="width:100%;min-height:100px;padding:10px 12px;border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:14px;resize:vertical;background:var(--paper-tint)">${escapeHtml(bio)}</textarea>
          <div style="display:flex;gap:10px;margin-top:14px">
            <button onclick="saveBio('${profileName}')" class="btn btn-primary" style="flex:1">Save</button>
            <button onclick="document.getElementById('bioModal').style.display='none'" class="btn btn-secondary">Cancel</button>
          </div>
        </div>
      </div>`;

    // Bio functions
    window.editBio = () => {
      document.getElementById('bioModal').style.display = 'flex';
      setTimeout(() => document.getElementById('bioInput').focus(), 100);
    };

    window.saveBio = (name) => {
      const bio = document.getElementById('bioInput').value.trim();
      sessionStorage.setItem('profile_bio_' + name, bio);
      document.getElementById('bioModal').style.display = 'none';
      const bioEl = document.getElementById('profileBio');
      if (bioEl) {
        bioEl.textContent = bio || 'Click to add a bio...';
        bioEl.style.fontStyle = bio ? 'normal' : 'italic';
        bioEl.style.opacity = bio ? '1' : '0.5';
      }
      toast('Bio updated', 'success');
    };

    window.changeAvatar = () => {
      toast('Avatar customisation coming soon!', 'success');
    };

  } catch(e) {
    document.getElementById('profileContent').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Profile not found</div><div class="empty-text">${e.message}</div></div>`;
  }
});
