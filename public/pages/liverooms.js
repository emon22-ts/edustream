// pages/liverooms.js
// Live Rooms — study rooms with real-time text chat
// Uses simple polling (no Azure Web PubSub needed for MVP)

registerPage('liverooms', async function(container) {
  container.innerHTML = `
    <div style="max-width:1280px;margin:0 auto;padding:28px 28px 80px">
      <div class="page-header">
        <h1 class="page-title">🎙 <em>Live</em> Rooms</h1>
        <p class="page-subtitle">Join a study room and learn together in real-time.</p>
      </div>

      <div style="display:grid;grid-template-columns:300px 1fr;gap:24px;align-items:start">
        <!-- ROOMS LIST -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <h2 style="font-family:var(--serif);font-size:18px;font-weight:500">Study Rooms</h2>
            <button class="btn btn-primary btn-sm" onclick="showCreateRoom()">+ New Room</button>
          </div>

          <!-- CREATE ROOM FORM -->
          <div id="createRoomForm" style="display:none;background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius-lg);padding:16px;margin-bottom:14px;box-shadow:var(--shadow)">
            <div class="field" style="margin-bottom:10px"><label style="display:block;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:var(--ink-soft);margin-bottom:4px">Room Name</label><input type="text" id="roomNameInput" placeholder="e.g. Azure Study Group" style="width:100%;padding:8px 11px;border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:13px;background:var(--paper-tint)"></div>
            <div class="field" style="margin-bottom:10px"><label style="display:block;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;color:var(--ink-soft);margin-bottom:4px">Subject</label>
              <select id="roomSubjectInput" style="width:100%;padding:8px 11px;border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:13px;background:var(--paper-tint)">
                <option>Technology</option><option>Science</option><option>Business</option><option>Arts</option><option>General</option>
              </select>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" style="flex:1" onclick="createRoom()">Create</button>
              <button class="btn btn-secondary btn-sm" onclick="hideCreateRoom()">Cancel</button>
            </div>
          </div>

          <!-- ROOMS -->
          <div id="roomsList"></div>
        </div>

        <!-- ACTIVE ROOM / CHAT -->
        <div id="chatPanel">
          <div style="background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow)">
            <div style="background:var(--ink);padding:20px 24px;color:var(--paper)">
              <h3 style="font-family:var(--serif);font-size:20px;font-weight:500">Welcome to Live Rooms 👋</h3>
              <p style="font-size:13px;opacity:0.7;margin-top:6px">Select a room from the left or create a new one to start chatting.</p>
            </div>
            <div style="padding:40px;text-align:center;color:var(--ink-muted)">
              <div style="font-size:52px;margin-bottom:16px">💬</div>
              <p style="font-style:italic;font-family:var(--serif)">Join a study room to start collaborating</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  // Rooms stored in sessionStorage (resets on tab close — simple MVP)
  let rooms = JSON.parse(sessionStorage.getItem('edustream_rooms') || '[]');
  let activeRoom = null;
  let chatPollInterval = null;

  // Add some default rooms if empty
  if (!rooms.length) {
    rooms = [
      { id: 'r1', name: 'Azure Study Group', subject: 'Technology', members: 3, messages: [{author:'System',text:'Welcome to the Azure Study Group! 🎉',time: new Date().toISOString()}], createdAt: new Date().toISOString() },
      { id: 'r2', name: 'Cloud Computing Q&A', subject: 'Technology', members: 5, messages: [{author:'System',text:'Ask your cloud computing questions here.',time: new Date().toISOString()}], createdAt: new Date().toISOString() },
      { id: 'r3', name: 'General Discussion', subject: 'General', members: 8, messages: [{author:'System',text:'A place for general academic discussion.',time: new Date().toISOString()}], createdAt: new Date().toISOString() },
    ];
    sessionStorage.setItem('edustream_rooms', JSON.stringify(rooms));
  }

  function saveRooms() {
    sessionStorage.setItem('edustream_rooms', JSON.stringify(rooms));
  }

  function renderRoomsList() {
    const list = document.getElementById('roomsList');
    if (!list) return;
    if (!rooms.length) {
      list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ink-muted);font-style:italic;font-family:var(--serif)">No rooms yet. Create one!</div>';
      return;
    }
    list.innerHTML = rooms.map(r => {
      const isActive = activeRoom?.id === r.id;
      const lastMsg = r.messages?.slice(-1)[0];
      return `<div onclick="joinRoom('${r.id}')" style="background:${isActive?'var(--amber-pale)':'var(--paper)'};border:${isActive?'2px solid var(--amber)':'1px solid var(--rule)'};border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:all 0.15s;box-shadow:var(--shadow)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-weight:600;font-size:14px;color:var(--ink)">${escapeHtml(r.name)}</div>
          <div style="display:flex;align-items:center;gap:4px">
            <div style="width:7px;height:7px;border-radius:50%;background:#22c55e"></div>
            <span style="font-size:11px;color:var(--ink-muted)">${r.members} online</span>
          </div>
        </div>
        <div style="font-size:11px;color:var(--amber);font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">${escapeHtml(r.subject)}</div>
        ${lastMsg ? `<div style="font-size:12px;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(lastMsg.author)}: ${escapeHtml(lastMsg.text)}</div>` : ''}
        <div style="font-size:11px;color:var(--ink-muted);margin-top:4px">${r.messages?.length||0} messages</div>
      </div>`;
    }).join('');
  }

  window.joinRoom = (roomId) => {
    clearInterval(chatPollInterval);
    activeRoom = rooms.find(r => r.id === roomId);
    if (!activeRoom) return;
    renderRoomsList();
    renderChat();
    // Poll for new messages every 3 seconds
    chatPollInterval = setInterval(renderChatMessages, 3000);
  };

  function renderChat() {
    const panel = document.getElementById('chatPanel');
    if (!panel || !activeRoom) return;
    panel.innerHTML = `
      <div style="background:var(--paper);border:1px solid var(--rule);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow);display:flex;flex-direction:column;height:600px">
        <!-- Chat header -->
        <div style="background:var(--ink);padding:16px 20px;color:var(--paper);display:flex;align-items:center;justify-content:space-between">
          <div>
            <h3 style="font-family:var(--serif);font-size:18px;font-weight:500">${escapeHtml(activeRoom.name)}</h3>
            <div style="font-size:12px;opacity:0.6;margin-top:2px">${escapeHtml(activeRoom.subject)} · ${activeRoom.members} online</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:8px;height:8px;border-radius:50%;background:#22c55e"></div>
            <span style="font-size:12px;opacity:0.7">Live</span>
          </div>
        </div>

        <!-- Messages -->
        <div id="chatMessages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--paper-tint)"></div>

        <!-- Input -->
        <div style="padding:14px;border-top:1px solid var(--rule);display:flex;gap:8px;background:var(--paper)">
          <input type="text" id="chatInput" placeholder="Type a message... (Press Enter to send)" style="flex:1;padding:10px 14px;border:1px solid var(--rule);border-radius:var(--radius);font-family:var(--sans);font-size:13px;background:var(--paper-tint)" onkeypress="if(event.key==='Enter')sendChatMessage()">
          <button class="btn btn-primary" onclick="sendChatMessage()">Send</button>
        </div>
      </div>`;

    renderChatMessages();
    // Auto-scroll to bottom
    setTimeout(() => {
      const msgs = document.getElementById('chatMessages');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 100);
  }

  function renderChatMessages() {
    const container = document.getElementById('chatMessages');
    if (!container || !activeRoom) return;
    const msgs = activeRoom.messages || [];
    container.innerHTML = msgs.map(m => {
      const isMe = m.author === (currentAccount?.name || 'Anonymous');
      const isSystem = m.author === 'System';
      if (isSystem) return `<div style="text-align:center"><span style="background:var(--paper-deep);color:var(--ink-muted);font-size:11px;padding:3px 10px;border-radius:999px;font-style:italic">${escapeHtml(m.text)}</span></div>`;
      return `<div style="display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'}">
        <div style="font-size:11px;color:var(--ink-muted);margin-bottom:3px;${isMe?'text-align:right':''}">${escapeHtml(m.author)} · ${formatRelative(m.time)}</div>
        <div style="background:${isMe?'var(--amber)':'var(--paper)'};color:${isMe?'white':'var(--ink)'};padding:10px 14px;border-radius:${isMe?'14px 14px 4px 14px':'14px 14px 14px 4px'};max-width:75%;font-size:14px;line-height:1.5;box-shadow:var(--shadow)">${escapeHtml(m.text)}</div>
      </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  window.sendChatMessage = () => {
    if (!requireAuth()) return;
    const input = document.getElementById('chatInput');
    const text = input?.value?.trim();
    if (!text || !activeRoom) return;
    const message = { author: currentAccount.name, text, time: new Date().toISOString() };
    activeRoom.messages = [...(activeRoom.messages||[]), message];
    // Update in rooms array
    const idx = rooms.findIndex(r => r.id === activeRoom.id);
    if (idx >= 0) rooms[idx] = activeRoom;
    saveRooms();
    input.value = '';
    renderChatMessages();
    renderRoomsList();
  };

  window.showCreateRoom = () => {
    document.getElementById('createRoomForm').style.display = 'block';
    document.getElementById('roomNameInput')?.focus();
  };

  window.hideCreateRoom = () => {
    document.getElementById('createRoomForm').style.display = 'none';
  };

  window.createRoom = () => {
    const name = document.getElementById('roomNameInput')?.value?.trim();
    if (!name) return toast('Room name is required', 'error');
    const subject = document.getElementById('roomSubjectInput')?.value || 'General';
    const room = {
      id: 'r' + Date.now(),
      name, subject,
      members: 1,
      messages: [{ author: 'System', text: `${escapeHtml(name)} was created. Welcome!`, time: new Date().toISOString() }],
      createdAt: new Date().toISOString()
    };
    rooms.unshift(room);
    saveRooms();
    hideCreateRoom();
    renderRoomsList();
    toast('Room created!', 'success');
    joinRoom(room.id);
  };

  // Cleanup on page leave
  window.addEventListener('popstate', () => clearInterval(chatPollInterval), { once: true });

  renderRoomsList();
});
