
/* ════════════════════════════════════════
   AcademIQ — app.js
   Uses: vanilla JS + jQuery + Fetch API
   Storage: localStorage
   ════════════════════════════════════════ */

'use strict';

/* ── Storage helpers ── */
const LS = {
  get : (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set : (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error(e); } },
  del : (k)     => { try { localStorage.removeItem(k); } catch (e) {} },
};

/* ── Page detection ── */
const IS_LOGIN     = !!document.getElementById('loginForm');
const IS_DASHBOARD = document.body.classList.contains('dash-page');

/* ════════════════════════════════════════
   LOGIN PAGE
   ════════════════════════════════════════ */
if (IS_LOGIN) {

  /* If a session is active → skip straight to dashboard */
  const saved = LS.get('iq_session', null);
  if (saved && saved.ready) {
    location.href = 'dashboard.html';
  }

  /* Password strength meter */
  const $pw   = document.getElementById('password');
  const $fill = document.getElementById('pwFill');
  const $msg  = document.getElementById('pwMsg');

  $pw.addEventListener('input', () => {
    const len = $pw.value.length;
    const pct = (len / 7) * 100;
    $fill.style.width = pct + '%';
    if (len === 0)     { $fill.style.background = ''; $msg.textContent = ''; }
    else if (len <= 2) { $fill.style.background = '#f87171'; $msg.textContent = 'Too short'; }
    else if (len <= 4) { $fill.style.background = '#fbbf24'; $msg.textContent = 'Almost there…'; }
    else               { $fill.style.background = '#34d399'; $msg.textContent = len === 7 ? '✓ Max length reached' : '✓ Good'; }
  });

  /* Show / hide password */
  document.getElementById('pwToggle').addEventListener('click', function () {
    const show = $pw.type === 'password';
    $pw.type = show ? 'text' : 'password';
    this.querySelector('i').className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  });

  /* Error helpers */
  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg; el.classList.add('show');
    el.previousElementSibling?.classList?.add('input-err');
  }
  function clearErrors() {
    document.querySelectorAll('.ferr').forEach(e => { e.classList.remove('show'); e.textContent = ''; });
  }

  /* Form submit */
  document.getElementById('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    clearErrors();
    const fn = document.getElementById('firstName').value.trim();
    const ln = document.getElementById('lastName').value.trim();
    const pw = $pw.value.trim();
    let ok = true;

    if (!fn) { showErr('err-fn', 'First name required'); ok = false; }
    if (!ln) { showErr('err-ln', 'Last name required');  ok = false; }
    if (!pw) { showErr('err-pw', 'Password required');   ok = false; }
    else if (pw.length > 7) { showErr('err-pw', 'Max 7 characters'); ok = false; }
    if (!ok) return;

    /* Build a unique key for this user based on their name */
    const userKey = `${fn}_${ln}`.toLowerCase().replace(/\s+/g, '_');
    const profileKey = `iq_profile_${userKey}`;

    /* Check if this user already has a saved profile */
    const existing = LS.get(profileKey, null);

    if (existing && existing.ready) {
      /* Returning user — verify password */
      if (existing.password !== pw) {
        showErr('err-pw', 'Incorrect password for this name');
        return;
      }
      /* Password matches — set active session and go to dashboard */
      LS.set('iq_session', { userKey, ready: true });
      location.href = 'dashboard.html';
      return;
    }

    /* New user — create their profile */
    LS.set(profileKey, {
      firstName: fn, lastName: ln, password: pw,
      major: '', year: '', goal: '',
      ready: true
    });
    /* Set active session */
    LS.set('iq_session', { userKey, ready: true });
    location.href = 'dashboard.html';
  });
}

/* ════════════════════════════════════════
   DASHBOARD PAGE
   ════════════════════════════════════════ */
if (IS_DASHBOARD) {

  /* Read the active session to know which user is logged in */
  const session = LS.get('iq_session', null);
  if (!session || !session.ready) { location.href = 'login.html'; }

  /* Build per-user storage keys — each user gets their own isolated data */
  const userKey = session.userKey;
  const K = {
    profile:  `iq_profile_${userKey}`,
    tasks:    `iq_tasks_${userKey}`,
    notes:    `iq_notes_${userKey}`,
    calendar: `iq_calendar_${userKey}`,
  };

  const profile = LS.get(K.profile, null);
  if (!profile || !profile.ready) { location.href = 'login.html'; }

  /* ── Load profile into UI ── */
  function renderProfile() {
    const p   = LS.get(K.profile, {});
    const full = `${p.firstName || ''} ${p.lastName || ''}`.trim();
    const init = ((p.firstName || '?')[0] + (p.lastName || '')[0]).toUpperCase();
    document.getElementById('sbAvatar').textContent  = init;
    document.getElementById('sbName').textContent    = full;
    document.getElementById('sbMajor').textContent   = p.major || 'No major set';
    document.getElementById('sbYear').textContent    = p.year  || 'No year set';
    document.getElementById('heroGreeting').textContent = `Hello, ${p.firstName} 👋`;
    document.getElementById('heroGoal').textContent  = p.goal
      ? `🎯 ${p.goal}` : 'Set your semester goal in the sidebar!';
    document.getElementById('topbarSub').textContent = `Welcome back, ${p.firstName}!`;
  }
  renderProfile();

  /* ── Editable profile form in sidebar ── */
  const $editForm   = document.getElementById('sbEditForm');
  const $editMajor  = document.getElementById('editMajor');
  const $editYear   = document.getElementById('editYear');
  const $editGoal   = document.getElementById('editGoal');

  document.getElementById('editProfileBtn').addEventListener('click', () => {
    const p = LS.get(K.profile, {});
    $editMajor.value = p.major || '';
    $editYear.value  = p.year  || '';
    $editGoal.value  = p.goal  || '';
    $editForm.style.display = 'block';
  });

  document.getElementById('cancelProfileBtn').addEventListener('click', () => {
    $editForm.style.display = 'none';
  });

  document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const p = LS.get(K.profile, {});
    p.major = $editMajor.value;
    p.year  = $editYear.value;
    p.goal  = $editGoal.value.trim();
    LS.set(K.profile, p);
    $editForm.style.display = 'none';
    renderProfile();
  });

  /* ── Section navigation ── */
  const SEC_TITLES = {
    'sec-overview': 'Overview',
    'sec-tasks':    'Task Manager',
    'sec-schedule': 'Weekly Schedule',
    'sec-notes':    'Notes',
  };

  window.showSec = function (id) {
    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    document.querySelector(`.sb-link[data-target="${id}"]`)?.classList.add('active');
    document.getElementById('topbarTitle').textContent = SEC_TITLES[id] || '';
    closeSidebar();
    if (id === 'sec-schedule') renderWeek();
  };

  document.querySelectorAll('.sb-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showSec(link.dataset.target);
    });
  });

  /* ── Sidebar open/close ── */
  function openSidebar()  { document.getElementById('sidebar').classList.add('open');  document.getElementById('sbOverlay').classList.add('open'); }
  function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sbOverlay').classList.remove('open'); }
  document.getElementById('hamburger').addEventListener('click', openSidebar);
  document.getElementById('sbClose').addEventListener('click', closeSidebar);
  document.getElementById('sbOverlay').addEventListener('click', closeSidebar);

  /* ── Theme toggle ── */
  if (LS.get('iq_theme', 'dark') === 'light') document.body.classList.add('light');
  document.getElementById('themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('light');
    const t = document.body.classList.contains('light') ? 'light' : 'dark';
    LS.set('iq_theme', t);
    document.getElementById('themeIco').className = t === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    document.getElementById('themeTxt').textContent = t === 'light' ? 'Light Mode' : 'Dark Mode';
  });
  /* Set correct icon on load */
  if (LS.get('iq_theme','dark') === 'light') {
    document.getElementById('themeIco').className  = 'fa-solid fa-sun';
    document.getElementById('themeTxt').textContent = 'Light Mode';
  }

  /* ── Clock (Skopje timezone) ── */
  function tick() {
    const now = new Date();
    document.getElementById('clockTime').textContent = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Skopje', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(now);
    document.getElementById('clockDate').textContent = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Skopje', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    }).format(now);
  }
  tick(); setInterval(tick, 1000);

  /* ── Logout ── */
  document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('logoutModal').classList.add('open');
  });
  document.getElementById('cancelLogout').addEventListener('click', () => {
    document.getElementById('logoutModal').classList.remove('open');
  });
  document.getElementById('confirmLogout').addEventListener('click', () => {
    const clearAll = document.getElementById('clearDataChk').checked;
    if (clearAll) {
      /* Only clears THIS user's data, not other users' */
      [K.tasks, K.notes, K.calendar].forEach(k => LS.del(k));
    }
    /* Clear the active session (profile stays so they can log back in later) */
    LS.del('iq_session');
    location.href = 'login.html';
  });

  /* ════════════════════════════════════════
     TASKS
     ════════════════════════════════════════ */
  let tasks  = LS.get(K.tasks, []);
  let curFilter = 'all';
  let editTaskId = null;

  function saveTasks() { LS.set(K.tasks, tasks); }
  function genId()     { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
  const esc = s => String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function daysLeft(due) {
    if (!due) return null;
    const d = Math.ceil((new Date(due) - new Date().setHours(0,0,0,0)) / 86400000);
    return d;
  }

  function renderTasks() {
    const search = (document.getElementById('taskSearch')?.value || '').toLowerCase();
    let list = tasks.filter(t => {
      if (curFilter === 'pending' && t.done)                 return false;
      if (curFilter === 'done'    && !t.done)                return false;
      if (curFilter === 'High'    && t.priority !== 'High')  return false;
      if (search && !t.title.toLowerCase().includes(search) &&
          !(t.course||'').toLowerCase().includes(search))    return false;
      return true;
    });

    const el = document.getElementById('taskList');
    if (!el) return;

    if (!list.length) {
      el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><p>No tasks here yet.</p></div>`;
      updateStats(); return;
    }

    el.innerHTML = list.map(t => {
      const pc = t.priority === 'High' ? 'badge-high' : t.priority === 'Low' ? 'badge-low' : 'badge-medium';
      const dl = daysLeft(t.due);
      const dueStr = t.due
        ? new Date(t.due).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
        : '';
      const dueClass = dl !== null && dl <= 2 && !t.done ? 'task-due-warn' : 'badge-due';
      const dueLabel = dl !== null
        ? (dl === 0 ? 'Today!' : dl < 0 ? `${Math.abs(dl)}d overdue` : dueStr)
        : '';

      return `
      <div class="task-item ${t.done ? 'done-item' : ''}" data-id="${t.id}">
        <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')">
          ${t.done ? '<i class="fa-solid fa-check"></i>' : ''}
        </div>
        <div class="task-body">
          <div class="task-title">${esc(t.title)}</div>
          <div class="task-meta">
            <span class="task-badge ${pc}">${t.priority}</span>
            ${t.course ? `<span class="task-badge badge-course">${esc(t.course)}</span>` : ''}
            ${dueLabel ? `<span class="task-badge ${dueClass}"><i class="fa-regular fa-calendar"></i> ${dueLabel}</span>` : ''}
          </div>
        </div>
        <div class="task-actions-wrap">
          <button class="task-act-btn edit" onclick="openEditTask('${t.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="task-act-btn del"  onclick="deleteTask('${t.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');

    updateStats();
  }

  function updateStats() {
    const total   = tasks.length;
    const done    = tasks.filter(t => t.done).length;
    const pending = total - done;
    const notes   = LS.get(K.notes, []).length;
    document.getElementById('stTasks').textContent   = total;
    document.getElementById('stPending').textContent = pending;
    document.getElementById('stDone').textContent    = done;
    document.getElementById('stNotes').textContent   = notes;
  }

  /* Add task */
  document.getElementById('addTaskBtn')?.addEventListener('click', () => {
    const title  = document.getElementById('taskTitle').value.trim();
    const course = document.getElementById('taskCourse').value;
    const prio   = document.getElementById('taskPrio').value;
    const due    = document.getElementById('taskDue').value;
    if (!title) { alert('Please enter a task title.'); return; }
    tasks.unshift({ id: genId(), title, course, priority: prio, due, done: false });
    saveTasks(); renderTasks();
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDue').value   = '';
  });

  /* Toggle done */
  window.toggleTask = id => {
    const t = tasks.find(x => x.id === id);
    if (t) { t.done = !t.done; saveTasks(); renderTasks(); }
  };

  /* Delete */
  window.deleteTask = id => {
    if (!confirm('Delete this task?')) return;
    tasks = tasks.filter(x => x.id !== id);
    saveTasks(); renderTasks();
  };

  /* Edit modal */
  window.openEditTask = id => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    editTaskId = id;
    document.getElementById('etTitle').value  = t.title;
    document.getElementById('etCourse').value = t.course || '';
    document.getElementById('etPrio').value   = t.priority || 'Medium';
    document.getElementById('etDue').value    = t.due || '';
    document.getElementById('editTaskModal').classList.add('open');
  };
  document.getElementById('cancelEditTask')?.addEventListener('click', () => {
    document.getElementById('editTaskModal').classList.remove('open');
  });
  document.getElementById('saveEditTask')?.addEventListener('click', () => {
    const t = tasks.find(x => x.id === editTaskId);
    if (!t) return;
    t.title    = document.getElementById('etTitle').value.trim() || t.title;
    t.course   = document.getElementById('etCourse').value;
    t.priority = document.getElementById('etPrio').value;
    t.due      = document.getElementById('etDue').value;
    saveTasks(); renderTasks();
    document.getElementById('editTaskModal').classList.remove('open');
  });

  /* Filter buttons — using jQuery for events/animation (ticks requirement) */
  $(document).on('click', '.filter-btn', function () {
    $('.filter-btn').removeClass('active');
    $(this).addClass('active');
    curFilter = $(this).data('f');
    $('#taskList').fadeOut(120, () => { renderTasks(); $('#taskList').fadeIn(180); });
  });
  $('#taskSearch').on('input', () => renderTasks());

  renderTasks();

 /* ════════════════════════════════════════
     WEEKLY SCHEDULE
     ════════════════════════════════════════ */
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  let calItems = LS.get('iq_calendar', []);
  function saveCal() { LS.set('iq_calendar', calItems); }

  /* Clear time field on load so it's never pre-filled */
  const $calTime = document.getElementById('calTime');
  if ($calTime) $calTime.value = '';

  function renderWeek() {
    const grid = document.getElementById('weekGrid');
    if (!grid) return;
    grid.innerHTML = DAYS.map(day => {
      const items = calItems
        .filter(x => x.day === day)
        .sort((a,b) => (a.time||'').localeCompare(b.time||''));

      const itemsHtml = items.length
        ? items.map(x => `
          <div class="cal-item">
            <span class="cal-time">${x.time || '--:--'}</span>
            <span class="cal-title">${esc(x.title)}</span>
            <div class="cal-item-btns">
              <button class="cal-btn cal-del" onclick="deleteCal('${x.id}')">✕ Delete</button>
            </div>
          </div>`).join('')
        : `<div class="day-empty">No items</div>`;

      return `
      <div class="day-col">
        <div class="day-head">${day.slice(0,3)}</div>
        <div class="day-items">${itemsHtml}</div>
      </div>`;
    }).join('');
  }

  document.getElementById('addCalBtn')?.addEventListener('click', () => {
    const day   = document.getElementById('calDay').value;
    const time  = document.getElementById('calTime').value;   // user-picked, never defaulted
    const title = document.getElementById('calActivity').value.trim();
    if (!title) { alert('Please enter an activity.'); return; }
    calItems.push({ id: genId(), day, time, title });
    saveCal(); renderWeek();
    document.getElementById('calActivity').value = '';
    document.getElementById('calTime').value     = '';  // clear after adding
  });

  window.deleteCal = id => {
    calItems = calItems.filter(x => x.id !== id);
    saveCal(); renderWeek();
  };

  renderWeek();

  /* ════════════════════════════════════════
     NOTES
     ════════════════════════════════════════ */
  let notes    = LS.get('iq_notes', []);
  let editNoteId = null;
  function saveNotes() { LS.set('iq_notes', notes); updateStats(); }

  function renderNotes() {
    const el = document.getElementById('notesList');
    if (!el) return;
    if (!notes.length) {
      el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-note-sticky"></i><p>No notes yet.</p></div>`;
      return;
    }
    el.innerHTML = notes.map(n => `
      <div class="note-card">
        ${n.title ? `<div class="note-card-title">${esc(n.title)}</div>` : ''}
        <div class="note-card-body">${esc(n.body)}</div>
        <div class="note-card-actions">
          <button class="note-edit-btn" onclick="editNote('${n.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="note-del-btn"  onclick="deleteNote('${n.id}')"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </div>`).join('');
  }

  document.getElementById('addNoteBtn')?.addEventListener('click', () => {
    const title = document.getElementById('noteTitle').value.trim();
    const body  = document.getElementById('noteBody').value.trim();
    if (!body) { alert('Please write something in the note.'); return; }

    if (editNoteId) {
      const n = notes.find(x => x.id === editNoteId);
      if (n) { n.title = title; n.body = body; }
      editNoteId = null;
      document.getElementById('addNoteBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Note';
    } else {
      notes.unshift({ id: genId(), title, body });
    }

    saveNotes(); renderNotes();
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteBody').value  = '';
  });

  window.deleteNote = id => {
    if (!confirm('Delete this note?')) return;
    notes = notes.filter(x => x.id !== id);
    saveNotes(); renderNotes();
  };

  window.editNote = id => {
    const n = notes.find(x => x.id === id);
    if (!n) return;
    editNoteId = id;
    document.getElementById('noteTitle').value = n.title || '';
    document.getElementById('noteBody').value  = n.body  || '';
    document.getElementById('addNoteBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Note';
    showSec('sec-notes');
    document.getElementById('noteBody').focus();
  };

  renderNotes();

  /* ════════════════════════════════════════
     MOTIVATION QUOTE — Fetch API + jQuery
     (satisfies both AJAX/Fetch and jQuery requirements)
     ════════════════════════════════════════ */
  const FALLBACKS = [
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { quote: "Education is the most powerful weapon to change the world.", author: "Nelson Mandela" },
    { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  ];

  function loadQuote() {
    fetch('https://dummyjson.com/quotes/random')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d  => showQuote(d.quote, d.author))
      .catch(()=> {
        const fb = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)];
        showQuote(fb.quote, fb.author);
      });
  }

  /* jQuery fade animation on quote change */
  function showQuote(q, a) {
    $('#quoteText').fadeOut(200, function () {
      $(this).text(q).fadeIn(300);
    });
    $('#quoteAuthor').fadeOut(200, function () {
      $(this).text(a ? `— ${a}` : '').fadeIn(300);
    });
  }

  document.getElementById('quoteRefresh')?.addEventListener('click', loadQuote);
  loadQuote();

  /* Initial stats */
  updateStats();
}
