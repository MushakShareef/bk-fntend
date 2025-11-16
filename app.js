// app.js — Dark Blue UI. Connects to backend at API_URL below.
const API_URL = 'https://bk-spiritual-backend.onrender.com';

let currentUser = null;
let allPoints = [];
let dailyCheckData = {};
let currentPeriod = 'daily';
let modalMemberId = null;

// small DOM helpers
const $ = id => document.getElementById(id);
function esc(s){ if (s===null||s===undefined) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// startup
document.addEventListener('DOMContentLoaded', () => {
  attachLogoLink();
  attachForms();
  checkAuth();
  updateTodayDate();
  // ensure logo -> admin login
  function attachLogoLink(){ const logo = $('logoLink'); if (!logo) return; logo.addEventListener('click',(e)=>{ e.preventDefault(); showAdminLogin(); }); }
});

function attachForms(){
  const r = $('registerForm'); if (r) r.addEventListener('submit', handleRegister);
  const ml = $('memberLoginForm'); if (ml) ml.addEventListener('submit', handleMemberLogin);
  const al = $('adminLoginForm'); if (al) al.addEventListener('submit', handleAdminLogin);
}

// navigation helpers
function hideAllPages(){ document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); }
function showLanding(){ hideAllPages(); $('landingPage').classList.add('active'); }
function showRegister(){ hideAllPages(); $('registerPage').classList.add('active'); }
function showMemberLogin(){ hideAllPages(); $('memberLoginPage').classList.add('active'); }
function showAdminLogin(){ hideAllPages(); $('adminLoginPage').classList.add('active'); }
function showMemberDashboard(){ hideAllPages(); $('memberDashboard').classList.add('active'); }
function showAdminDashboard(){ hideAllPages(); $('adminDashboard').classList.add('active'); }

// auth
function checkAuth(){
  const raw = localStorage.getItem('currentUser');
  if (!raw) return showLanding();
  try {
    currentUser = JSON.parse(raw);
    if (currentUser.role === 'admin') {
      showAdminDashboard();
      loadAllMembers();
      loadPoints();
    } else {
      showMemberDashboard();
      document.getElementById('memberName').textContent = `Welcome, ${currentUser.name || currentUser.mobile}`;
      showMemberTab(null,'daily');
      loadDailyChecklist();
    }
  } catch(e){ console.warn('auth read failed', e); showLanding(); }
}

function logout(){
  localStorage.removeItem('currentUser');
  currentUser = null;
  showLanding();
}

// update date
function updateTodayDate(){
  const el = $('todayDate');
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' });
}

// ---------------- Registration / Login ----------------
async function handleRegister(e){
  e.preventDefault();
  const name = $('regName').value.trim();
  const centre = $('regCentre').value.trim();
  const mobile = $('regMobile').value.trim();
  const password = $('regPassword').value;
  if (!name || !centre || !mobile || !password) return showError('registerError','Please fill all fields');
  try {
    const res = await fetch(`${API_URL}/api/members/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name, centre, mobile, password }) });
    const data = await res.json();
    if (!res.ok) return showError('registerError', data.message || 'Registration failed');
    $('registerForm').reset();
    showSuccess('registerSuccess','Registered — please login');
    setTimeout(()=>showMemberLogin(), 1200);
  } catch(err){ console.error('register err', err); showError('registerError','Connection error'); }
}

async function handleMemberLogin(e){
  e.preventDefault();
  const mobile = $('memberMobile').value.trim();
  const password = $('memberPassword').value;
  if (!mobile || !password) return showError('memberLoginError','Enter mobile and password');
  try {
    const res = await fetch(`${API_URL}/api/members/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ mobile, password }) });
    const data = await res.json();
    if (!res.ok) return showError('memberLoginError', data.message || 'Login failed');
    currentUser = { ...data.member, role:'member' };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showMemberDashboard();
    document.getElementById('memberName').textContent = `Welcome, ${currentUser.name || currentUser.mobile}`;
    showMemberTab(null,'daily');
    await loadDailyChecklist();
  } catch(err){ console.error('member login', err); showError('memberLoginError','Connection error'); }
}

async function handleAdminLogin(e){
  e.preventDefault();
  const username = $('adminUsername').value.trim();
  const password = $('adminPassword').value;
  if (!username || !password) return showError('adminLoginError','Enter username and password');
  try {
    const res = await fetch(`${API_URL}/api/admin/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ username, password })});
    const data = await res.json();
    if (!res.ok) return showError('adminLoginError', data.message || 'Login failed');
    currentUser = { ...data.admin, role:'admin' };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showAdminDashboard();
    await loadAllMembers();
    await loadPoints();
  } catch(err){ console.error('admin login', err); showError('adminLoginError','Connection error'); }
}

// ---------------- Admin: Members & Points ----------------
async function loadAllMembers(){
  try {
    const res = await fetch(`${API_URL}/api/admin/all-members`);
    const data = await res.json();
    const container = $('membersList');
    if (!data.members || data.members.length===0){ container.innerHTML = '<div class="empty-state">No members</div>'; return; }
    container.innerHTML = data.members.map(m => {
      const nm = esc(m.name); const centre = esc(m.centre || '');
      return `<div class="member-card"><h4>${nm}</h4><div class="muted small">${centre}</div><div class="row gap" style="margin-top:8px"><button class="btn small" onclick="openMemberChart(${m.id},'${nm}')">View Chart</button><button class="btn small" onclick="deleteMember(${m.id})">Delete</button></div></div>`;
    }).join('');
  } catch(err){ console.error('loadAllMembers', err); $('membersList').innerHTML = '<div class="empty-state">Failed to load</div>'; }
}

async function deleteMember(id){
  if (!confirm('Delete this member?')) return;
  try {
    const res = await fetch(`${API_URL}/api/admin/delete-member/${id}`, { method:'DELETE' });
    if (!res.ok) return alert('Delete failed');
    await loadAllMembers();
  } catch(err){ console.error('deleteMember', err); alert('Error'); }
}

// Points (admin)
async function loadPoints(){
  try {
    const res = await fetch(`${API_URL}/api/points`);
    const data = await res.json();
    allPoints = data.points || [];
    const container = $('pointsList');
    if (!allPoints || allPoints.length===0){ container.innerHTML = '<div class="empty-state">No points</div>'; return; }
    container.innerHTML = allPoints.map(p => {
      const t = esc(p.text);
      return `<div class="point-card"><div>${t}</div><div class="muted small" style="margin-top:8px">Order: ${p.order_num || p.id}</div><div class="row gap" style="margin-top:8px"><button class="btn small" onclick="promptEditPoint(${p.id})">Edit</button><button class="btn small" onclick="deletePoint(${p.id})">Delete</button></div></div>`;
    }).join('');
  } catch(err){ console.error('loadPoints', err); $('pointsList').innerHTML = '<div class="empty-state">Failed to load</div>'; }
}

function showAddPoint(){ $('addPointForm').classList.remove('hidden'); }
function hideAddPoint(){ $('addPointForm').classList.add('hidden'); $('newPointText').value=''; }

async function addPoint(){
  const text = $('newPointText').value.trim();
  if (!text) return alert('Enter text');
  try {
    const res = await fetch(`${API_URL}/api/admin/points`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ text })});
    if (!res.ok) return alert('Add failed');
    hideAddPoint();
    await loadPoints();
  } catch(err){ console.error('addPoint', err); alert('Error'); }
}

function promptEditPoint(id){
  const p = allPoints.find(x=>x.id===id);
  if (!p) return alert('Point not found');
  const newText = prompt('Edit point text', p.text);
  if (!newText || newText===p.text) return;
  fetch(`${API_URL}/api/admin/points/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ text:newText })})
    .then(r=>{ if (!r.ok) alert('Update failed'); else loadPoints(); })
    .catch(e=>console.error('editPoint', e));
}

function deletePoint(id){
  if (!confirm('Delete point?')) return;
  fetch(`${API_URL}/api/admin/points/${id}`, { method:'DELETE' })
    .then(r=>{ if (!r.ok) alert('Delete failed'); else loadPoints(); })
    .catch(e=>console.error('deletePoint', e));
}

// ---------------- Member: Daily / Save / Progress ----------------
async function loadDailyChecklist(){
  try {
    const ptsRes = await fetch(`${API_URL}/api/points`);
    const pts = await ptsRes.json();
    allPoints = pts.points || [];
    const today = new Date().toISOString().split('T')[0];
    const recRes = await fetch(`${API_URL}/api/members/${currentUser.id}/daily/${today}`);
    const rec = await recRes.json();
    dailyCheckData = rec || {};
    const container = $('dailyCheckList');
    if (!allPoints || allPoints.length===0){ container.innerHTML = '<div class="empty-state">No points defined</div>'; return; }
    container.innerHTML = allPoints.map(p => {
      const val = Number(dailyCheckData[p.id] !== undefined ? dailyCheckData[p.id] : 0);
      const id = p.id;
      return `<div class="check-item"><input class="slider" type="range" min="0" max="100" value="${val}" data-point-id="${id}" oninput="onSliderInput(event)"><div class="percent-label" id="percent-${id}">${val}%</div><div style="flex:1"><strong style="display:block; margin-bottom:6px">${esc(p.text)}</strong></div></div>`;
    }).join('');
  } catch(err){ console.error('loadDailyChecklist', err); $('dailyCheckList').innerHTML = '<div class="empty-state">Failed to load</div>'; }
}

function onSliderInput(e){
  const el = e.target;
  const id = el.dataset.pointId;
  const v = parseInt(el.value,10) || 0;
  const sp = $('percent-'+id); if (sp) sp.textContent = v + '%';
  dailyCheckData[id] = v;
}

async function saveDailyChecks(){
  try {
    const today = new Date().toISOString().split('T')[0];
    for (const p of allPoints) {
      const pointId = p.id;
      const completed = Number(dailyCheckData[pointId] !== undefined ? dailyCheckData[pointId] : 0);
      await fetch(`${API_URL}/api/members/${currentUser.id}/daily`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ date: today, pointId, completed }) });
    }
    $('dailySaveMsg').textContent = 'Saved';
    setTimeout(()=> $('dailySaveMsg').textContent = '', 2000);
    await loadMyProgress();
  } catch(err){ console.error('saveDailyChecks', err); alert('Save failed'); }
}

// Progress (member + modal)
async function loadMyProgress(){ await loadProgressCharts(currentUser.id, 'progressCharts'); }

async function loadProgressCharts(memberId, containerId){
  try {
    const res = await fetch(`${API_URL}/api/members/${memberId}/progress/${currentPeriod}`);
    const data = await res.json();
    const container = document.getElementById(containerId);
    if (!data.progress || data.progress.length===0){ container.innerHTML = '<div class="empty-state">No data</div>'; return; }
    container.innerHTML = data.progress.map(item => {
      const p = Math.round(Number(item.percentage) || 0);
      const cls = p <= 33 ? 'red' : p <= 66 ? 'orange' : 'green';
      return `<div class="chart-item"><div style="margin-bottom:6px"><strong>${esc(item.text)}</strong></div><div class="progress-bar-container"><div class="progress-bar ${cls}" style="width:${p}%">${p}%</div></div></div>`;
    }).join('');
  } catch(err){ console.error('loadProgressCharts', err); if (document.getElementById(containerId)) document.getElementById(containerId).innerHTML = '<div class="empty-state">Failed</div>'; }
}

function showPeriod(period, e){
  currentPeriod = period;
  document.querySelectorAll('#progressTab .period-btn').forEach(b => b.classList.remove('active'));
  if (e && e.target) e.target.classList.add('active');
  loadMyProgress();
}

// Other members (member view) + modal
async function loadAllMembers(){
  try {
    const res = await fetch(`${API_URL}/api/members`);
    const data = await res.json();
    const container = $('allMembersList');
    if (!data.members || data.members.length === 0) { container.innerHTML = '<div class="empty-state">No other members</div>'; return; }
    // show everyone except current user
    const others = data.members.filter(m => m.id !== currentUser.id);
    container.innerHTML = others.map(m => `<div class="member-card" onclick="openMemberChart(${m.id},'${esc(m.name)}')"><h4>${esc(m.name)}</h4><div class="muted small">${esc(m.centre)}</div></div>`).join('');
  } catch(err){ console.error('loadAllMembers', err); $('allMembersList').innerHTML = '<div class="empty-state">Failed</div>'; }
}

function openMemberChart(memberId, memberName){
  modalMemberId = memberId;
  $('chartMemberName').textContent = memberName;
  $('chartModal').classList.add('show');
  currentPeriod = 'daily';
  document.querySelectorAll('#chartModal .period-btn').forEach((b,i)=>b.classList.toggle('active', i===0));
  loadProgressCharts(memberId, 'modalCharts');
}
function closeChartModal(){ $('chartModal').classList.remove('show'); modalMemberId = null; }
function showModalPeriod(period,e){ currentPeriod = period; document.querySelectorAll('#chartModal .period-btn').forEach(b=>b.classList.remove('active')); if (e && e.target) e.target.classList.add('active'); loadProgressCharts(modalMemberId, 'modalCharts'); }

// ---------------- Helpers & UI utilities ----------------
function showError(id,msg){ const el = $(id); if (!el) return alert(msg); el.textContent = msg; setTimeout(()=>el.textContent='',4000); }
function showSuccess(id,msg){ const el = $(id); if (!el) return; el.textContent = msg; setTimeout(()=>el.textContent='',3000); }

// ---------------- Admin tab switching ----------------
async function showAdminTab(e, tab){
  document.querySelectorAll('#adminDashboard .tab-btn').forEach(b => b.classList.remove('active'));
  if (e && e.target) e.target.classList.add('active');
  document.querySelectorAll('#adminDashboard .tab-content').forEach(c => c.classList.remove('active'));
  $(`${tab}Tab`).classList.add('active');
  if (tab === 'members') await loadAllMembers();
  if (tab === 'points') await loadPoints();
}

// ---------------- Member tab switching ----------------
async function showMemberTab(e, tab){
  document.querySelectorAll('#memberDashboard .tab-btn').forEach(b => b.classList.remove('active'));
  if (e && e.target) e.target.classList.add('active');
  document.querySelectorAll('#memberDashboard .tab-content').forEach(c => c.classList.remove('active'));
  $(`${tab}Tab`).classList.add('active');
  if (tab === 'daily') await loadDailyChecklist();
  if (tab === 'progress') { currentPeriod = 'daily'; document.querySelectorAll('#progressTab .period-btn').forEach((b,i)=>b.classList.toggle('active', i===0)); await loadMyProgress(); }
  if (tab === 'others') await loadAllMembers();
}

// ---------------- Debug helpers ----------------
window.debugPoints = async ()=> { console.log(await (await fetch(`${API_URL}/api/points`)).json()); };
window.debugSchema = async ()=> { console.log(await (await fetch(`${API_URL}/api/debug/schema/daily_records`)).json()); };

