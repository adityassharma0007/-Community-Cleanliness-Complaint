/* =========================================================
   CleanCity - shared JavaScript (loaded by every page)
   ---------------------------------------------------------
   No PHP, server or database is needed. Everything is saved in
   the browser using localStorage, so the site works by simply
   opening index.html.

   NOTE FOR STUDENTS: passwords are stored as plain text here ONLY
   because this is a demo. A real website must hash passwords on
   the server (for example PHP password_hash()).
   ========================================================= */

// ---------- 1. Settings ----------
const STAGES = ['Submitted', 'Under Review', 'In Progress', 'Resolved'];

const CATEGORIES = [
  'Garbage & Waste',
  'Drainage & Sewage',
  'Water Leakage',
  'Road & Potholes',
  'Street Light',
  'Public Toilet',
  'Stray Animals',
  'Other'
];

const KEY_USERS = 'cleancity_users';
const KEY_COMPLAINTS = 'cleancity_complaints';
const KEY_SESSION = 'cleancity_session'; // email of the logged-in user


// ---------- 2. Small helpers ----------
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Makes user text safe before we put it inside HTML (stops <script> tricks)
function esc(text) {
  return String(text).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}


// ---------- 3. Demo data (created once, the first time the site opens) ----------
function seedDemoData() {
  if (load(KEY_USERS, null)) return;

  save(KEY_USERS, [
    { name: 'Admin', email: 'admin@cleancity.com', password: 'admin123', role: 'admin' },
    { name: 'Riya Sharma', email: 'riya@example.com', password: 'demo123', role: 'user' },
    { name: 'Aman Verma', email: 'aman@example.com', password: 'demo123', role: 'user' }
  ]);

  const sample = (num, who, title, category, place, description, stage, created, updated) => ({
    id: 'CC-' + num,
    title, category, place, description, stage,
    email: who.email, authorName: who.name,
    created: daysAgo(created), updated: daysAgo(updated)
  });
  const riya = { name: 'Riya Sharma', email: 'riya@example.com' };
  const aman = { name: 'Aman Verma', email: 'aman@example.com' };

  save(KEY_COMPLAINTS, [
    sample(1001, riya, 'Garbage not collected for 4 days', 'Garbage & Waste', 'Block B, near Gate 2',
      'The community bin is overflowing and the smell is getting worse every day.', 2, 6, 1),
    sample(1002, aman, 'Street light not working', 'Street Light', 'Lane 5, opposite the park',
      'The light has been off for a week. The lane is very dark at night.', 1, 4, 2),
    sample(1003, riya, 'Blocked drain after rain', 'Drainage & Sewage', 'Main road crossing',
      'Water collects on the road and does not drain. Mosquitoes are increasing.', 0, 1, 1),
    sample(1004, aman, 'Leaking water pipe', 'Water Leakage', 'Block D parking area',
      'A pipe has been leaking and wasting water for many days.', 3, 12, 3),
    sample(1005, riya, 'Large pothole on society road', 'Road & Potholes', 'Near the temple',
      'A deep pothole is dangerous for two-wheelers, especially at night.', 3, 15, 5),
    sample(1006, aman, 'Stray dogs near the playground', 'Stray Animals', 'Children\'s play area',
      'A pack of stray dogs scares children in the evening.', 1, 3, 1)
  ]);
}


// ---------- 4. Accounts: sign up, log in, log out ----------
function getUsers() {
  return load(KEY_USERS, []);
}

function currentUser() {
  const email = load(KEY_SESSION, null);
  return getUsers().find(u => u.email === email) || null;
}

// Each function below returns an error message, or '' when everything worked.
function signup(name, email, password) {
  email = email.trim().toLowerCase();
  const users = getUsers();
  if (users.some(u => u.email === email)) {
    return 'An account with this email already exists. Please log in.';
  }
  users.push({ name: name.trim(), email, password, role: 'user' });
  save(KEY_USERS, users);
  save(KEY_SESSION, email); // log the new user in straight away
  return '';
}

function login(email, password) {
  email = email.trim().toLowerCase();
  const user = getUsers().find(u => u.email === email && u.password === password);
  if (!user) return 'Wrong email or password.';
  save(KEY_SESSION, user.email);
  return '';
}

function logout() {
  localStorage.removeItem(KEY_SESSION);
  location.href = 'index.html';
}

// Use at the top of pages that need a login. Sends visitors to the login page.
function requireLogin() {
  const user = currentUser();
  if (!user) {
    const page = location.pathname.split('/').pop() || 'index.html';
    location.href = 'login.html?next=' + page;
  }
  return user;
}

// Only allow simple local page names like "report.html" after login
function safeNextPage() {
  const next = new URLSearchParams(location.search).get('next');
  return /^[a-z-]+\.html$/.test(next || '') ? next : 'complaints.html';
}


// ---------- 5. Complaints ----------
function getComplaints() {
  return load(KEY_COMPLAINTS, []);
}

function saveComplaints(list) {
  save(KEY_COMPLAINTS, list);
}

function addComplaint(data, user) {
  const list = getComplaints();
  const lastNumber = list.reduce((max, c) => Math.max(max, Number(String(c.id).replace('CC-', '')) || 1000), 1000);
  const now = new Date().toISOString();

  const complaint = {
    id: 'CC-' + (lastNumber + 1),
    title: data.title.trim(),
    category: data.category,
    place: data.place.trim(),
    description: data.description.trim(),
    photo: data.photo || '',
    stage: 0, // 0 = Submitted
    email: user.email,
    authorName: user.name,
    created: now,
    updated: now
  };

  list.push(complaint);
  saveComplaints(list);
  return complaint;
}

function setStage(id, stage) {
  const list = getComplaints();
  const complaint = list.find(c => c.id === id);
  if (!complaint) return;
  complaint.stage = stage;
  complaint.updated = new Date().toISOString();
  saveComplaints(list);
}

function deleteComplaint(id) {
  saveComplaints(getComplaints().filter(c => c.id !== id));
}


// ---------- 6. HTML builders (the progress bars live here) ----------

// The 4-step tracker shown on every complaint: a thin line with round junctions
// (like a parcel tracker). Finished steps get a tick, the current step gets a dot.
function trackerHTML(stage) {
  const last = STAGES.length - 1;
  const steps = STAGES.map((name, i) => {
    const classes = [
      i <= stage ? 'reached' : '',
      i === stage ? 'now' : '',
      i < stage || stage === last ? 'done' : ''
    ].join(' ');
    return `<li class="${classes}" ${i === stage ? 'aria-current="step"' : ''}>
      <span class="node"></span><span class="lbl">${name}</span></li>`;
  }).join('');
  return `<ol class="steps s${stage}" role="list" aria-label="Complaint progress">${steps}</ol>`;
}

// Community / personal progress: "X% resolved" and one junction per status
// showing how many reports are at that step.
function statsHTML(list, heading) {
  const total = list.length;
  if (!total) {
    return `<h3>${esc(heading)}</h3><p class="muted">No reports yet.</p>`;
  }
  const counts = STAGES.map((name, i) => list.filter(c => c.stage === i).length);
  const percentResolved = Math.round(counts[3] / total * 100);

  const junctions = counts.map((n, i) =>
    `<li class="s${i} ${n ? 'has' : ''}"><span class="node"></span>
      <strong>${n}</strong><span class="lbl">${STAGES[i]}</span></li>`).join('');

  return `
    <div class="stats-head">
      <h3>${esc(heading)}</h3>
      <p class="muted"><strong class="big">${percentResolved}%</strong> resolved &middot; ${counts[3]} of ${total} reports</p>
    </div>
    <ol class="pipeline" role="list" aria-label="Number of reports at each status">${junctions}</ol>`;
}

// One complaint card. Pass { user, manage: true } to show admin / owner buttons.
function complaintCard(c, opts = {}) {
  const user = opts.user;
  const isAdmin = !!user && user.role === 'admin';
  const isOwner = !!user && user.email === c.email;
  let actions = '';

  if (opts.manage && isAdmin) {
    const options = STAGES.map((name, i) =>
      `<option value="${i}" ${i === c.stage ? 'selected' : ''}>${name}</option>`).join('');
    actions += `<label class="inline-label">Update status
      <select data-action="status" data-id="${esc(c.id)}">${options}</select></label>`;
  }

  if (opts.manage && isAdmin) {
    actions += `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${esc(c.id)}">Delete</button>`;
  } else if (opts.manage && isOwner && c.stage === 0) {
    actions += `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${esc(c.id)}">Withdraw</button>`;
  }

  const photoHTML = c.photo
    ? `<div class="c-photo-wrap">
         <p class="c-photo-title"><strong>Submitted photo</strong></p>
         <img class="c-photo" src="${c.photo}" alt="Photo submitted with complaint ${esc(c.id)}" loading="lazy">
       </div>`
    : `<p class="c-no-photo">No photo attached to this complaint.</p>`;

  return `
    <article class="card complaint">
      <div class="c-top">
        <span><span class="chip">${esc(c.category)}</span> <span class="c-id">${esc(c.id)}</span></span>
        <span class="badge s${c.stage}"><i class="dot"></i>${STAGES[c.stage]}</span>
      </div>

      <h3>${esc(c.title)}</h3>

      <div class="c-details">
        <p class="c-meta"><strong>Location:</strong> ${esc(c.place)}</p>
        <p class="c-meta"><strong>Submitted:</strong> ${formatDateTime(c.created)}</p>
        <p class="c-meta"><strong>Reported by:</strong> ${esc(c.authorName)}</p>
      </div>

      <div class="c-description">
        <strong>Complaint details</strong>
        <p class="c-desc">${esc(c.description)}</p>
      </div>

      ${photoHTML}

      ${trackerHTML(c.stage)}

      <p class="c-meta c-updated"><strong>Last update:</strong> ${formatDateTime(c.updated)}</p>

      ${actions ? `<div class="c-actions">${actions}</div>` : ''}
    </article>`;
}

// ---------- 7. Header and footer (same on every page) ----------
function renderHeader() {
  const el = document.getElementById('site-header');
  if (!el) return;

  const user = currentUser();
  const page = location.pathname.split('/').pop() || 'index.html';
  const links = [
    ['index.html', 'Home'],
    ['report.html', 'Report an Issue'],
    ['complaints.html', user && user.role === 'admin' ? 'All Complaints' : 'My Complaints'],
    ['index.html#tips', 'Clean Tips']
  ];
  const nav = links.map(([href, text]) =>
    `<a href="${href}" ${href === page ? 'aria-current="page"' : ''}>${text}</a>`).join('');

  const account = user
    ? `<span class="who">Hi, ${esc(user.name.split(' ')[0])}</span>
       <button class="btn btn-outline btn-sm" id="logout-btn" type="button">Log out</button>`
    : `<a class="btn btn-outline btn-sm" href="login.html">Log in</a>
       <a class="btn btn-primary btn-sm" href="signup.html">Sign up</a>`;

  el.innerHTML = `
    <div class="container header-inner">
      <a class="brand" href="index.html">
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#15803d"/>
          <path d="M23 8C14 8 9 12.5 9 19c0 1.2.2 2.2.6 3.1L7 25l1.4 1.4 2.6-2.6c.9.4 1.9.6 3 .6C20.5 24.4 23 17 23 8z" fill="#fff"/>
        </svg>
        <span>CleanCity</span>
      </a>
      <button class="menu-btn" id="menu-btn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu">
        <svg class="icon-open" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        <svg class="icon-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
      <div class="menu" id="menu">
        <nav class="nav" aria-label="Main">${nav}</nav>
        <div class="account">${account}</div>
      </div>
    </div>`;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Phone menu: open / close the dropdown
  const menuBtn = document.getElementById('menu-btn');
  const menu = document.getElementById('menu');
  function setMenu(open) {
    menu.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
  }
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', e => { if (!el.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
}

function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.innerHTML = `
    <div class="container footer-inner">
      <p><strong>CleanCity</strong> &ndash; a demo student project. Data is saved only in your browser.</p>
      <button class="link-btn" id="reset-btn" type="button">Reset demo data</button>
    </div>`;
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Delete all accounts and complaints and start again with the sample data?')) {
      [KEY_USERS, KEY_COMPLAINTS, KEY_SESSION].forEach(k => localStorage.removeItem(k));
      location.href = 'index.html';
    }
  });
}


// ---------- 8. Run on every page ----------
seedDemoData();
renderHeader();
renderFooter();
