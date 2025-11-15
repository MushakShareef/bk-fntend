// ==========================================================
//                  BK APP – CLEAN & IMPROVED app.js
// ==========================================================

// API Configuration
const API_URL = 'https://bk-spiritual-backend.onrender.com';

// Global State
let currentUser = null;
let currentPeriod = 'daily';
let allPoints = [];
let modalMemberId = null;
let resetUsername = null;
let resetMobile = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    updateTodayDate();
});

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    document.getElementById('memberLoginForm').addEventListener('submit', handleMemberLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);

    document.getElementById('adminForgotPasswordForm').addEventListener('submit', handleAdminForgotPassword);
    document.getElementById('adminResetPasswordForm').addEventListener('submit', handleAdminResetPassword);

    document.getElementById('memberForgotPasswordForm').addEventListener('submit', handleMemberForgotPassword);
    document.getElementById('memberResetPasswordForm').addEventListener('submit', handleMemberResetPassword);
}

// ==========================================================
//                       PAGE NAVIGATION
// ==========================================================

function showLanding() {
    hideAllPages();
    document.getElementById('landingPage').classList.add('active');
}

function showAdminLogin() {
    hideAllPages();
    document.getElementById('adminLoginPage').classList.add('active');
}

function showMemberLogin() {
    hideAllPages();
    document.getElementById('memberLoginPage').classList.add('active');
}

function showRegister() {
    hideAllPages();
    document.getElementById('registerPage').classList.add('active');
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
}

// ==========================================================
//                     AUTH CHECK
// ==========================================================

function checkAuth() {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        if (currentUser.role === 'admin') showAdminDashboard();
        else showMemberDashboard();
    }
}

// ==========================================================
//                 ADMIN LOGIN
// ==========================================================

async function handleAdminLogin(e) {
    e.preventDefault();
    const username = adminUsername.value;
    const password = adminPassword.value;

    try {
        const res = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            currentUser = { ...data.admin, role: 'admin' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showAdminDashboard();
        } else {
            showError('adminLoginError', data.message || 'Invalid Login');
        }
    } catch {
        showError('adminLoginError', 'Connection issue. Try again.');
    }
}

// ==========================================================
//                 MEMBER LOGIN
// ==========================================================

async function handleMemberLogin(e) {
    e.preventDefault();
    const mobile = memberMobile.value;
    const password = memberPassword.value;

    try {
        const res = await fetch(`${API_URL}/api/members/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, password })
        });

        const data = await res.json();

        if (res.ok) {
            currentUser = { ...data.member, role: 'member' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMemberDashboard();
        } else {
            showError('memberLoginError', data.message || 'Invalid Login');
        }
    } catch {
        showError('memberLoginError', 'Connection issue. Try again.');
    }
}

// ==========================================================
//                     REGISTER
// ==========================================================

async function handleRegister(e) {
    e.preventDefault();

    const name = regName.value;
    const centre = regCentre.value;
    const mobile = regMobile.value;
    const password = regPassword.value;
    const confirmPassword = regConfirmPassword.value;

    if (password !== confirmPassword) return showError('registerError', 'Passwords do not match');

    try {
        const res = await fetch(`${API_URL}/api/members/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, centre, mobile, password })
        });

        const data = await res.json();

        if (res.ok) {
            showSuccess('registerSuccess', 'Registration successful!');
            registerForm.reset();
            setTimeout(showMemberLogin, 2000);
        } else {
            showError('registerError', data.message);
        }
    } catch {
        showError('registerError', 'Connection issue. Try again.');
    }
}

// ==========================================================
//                   ADMIN DASHBOARD
// ==========================================================

function showAdminDashboard() {
    hideAllPages();
    adminDashboard.classList.add('active');

    // FIX ⭐ Auto select "Members" tab safely
    setTimeout(() => showAdminTab(null, 'members'), 10);
}

// ⭐ FINAL FIXED VERSION — SAFEST POSSIBLE
async function showAdminTab(event, tab) {

    // Remove active classes
    document.querySelectorAll('#adminDashboard .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#adminDashboard .tab-content').forEach(c => c.classList.remove('active'));

    // Activate correct button
    const btn = event?.target || document.querySelector(`#adminDashboard .tab-btn[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');

    // Show tab content
    document.getElementById(`${tab}Tab`).classList.add('active');

    if (tab === 'members') loadAllMembers();
    if (tab === 'points') loadPoints();
    if (tab === 'charts') loadAdminCharts();
}

// ==========================================================
//                 LOAD MEMBERS (ADMIN)
// ==========================================================

async function loadAllMembers() {
    try {
        const res = await fetch(`${API_URL}/api/admin/all-members`, {
            headers: { 'Authorization': `Bearer ${currentUser.id}` }
        });

        const data = await res.json();

        membersList.innerHTML = data.members.length
            ? data.members.map(m => `
                <div class="member-card">
                    <h4>${m.name}</h4>
                    <p>Centre: ${m.centre}</p>
                    <p>Mobile: ${m.mobile}</p>
                    <button class="btn-danger" onclick="deleteMember(${m.id})">Delete</button>
                </div>
              `).join('')
            : '<div class="empty-state">No members yet</div>';

    } catch (err) {
        console.log('Members error', err);
    }
}

async function deleteMember(id) {
    if (!confirm('Delete member permanently?')) return;

    await fetch(`${API_URL}/api/admin/delete-member/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser.id}` }
    });

    loadAllMembers();
}

// ==========================================================
//                    LOAD POINTS
// ==========================================================

async function loadPoints() {
    try {
        const res = await fetch(`${API_URL}/api/points`);
        const data = await res.json();
        allPoints = data.points;

        pointsList.innerHTML = allPoints.map((p, i) => `
            <div class="point-card">
                <h4>Point ${i + 1}</h4>
                <p>${p.text}</p>
                <button onclick="editPoint(${p.id}, '${p.text.replace(/'/g, "\\'")}')" class="btn-secondary">Edit</button>
                <button onclick="deletePoint(${p.id})" class="btn-danger">Delete</button>
            </div>
        `).join('');

    } catch (err) {
        console.log('Points error', err);
    }
}

async function addPoint() {
    const text = newPointText.value.trim();
    if (!text) return;

    await fetch(`${API_URL}/api/admin/points`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ text })
    });

    hideAddPointForm();
    loadPoints();
}

async function editPoint(id, oldText) {
    const newText = prompt('Edit point:', oldText);
    if (!newText) return;

    await fetch(`${API_URL}/api/admin/points/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.id}`
        },
        body: JSON.stringify({ text: newText })
    });

    loadPoints();
}

async function deletePoint(id) {
    if (!confirm('Delete this point?')) return;

    await fetch(`${API_URL}/api/admin/points/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${currentUser.id}`
        }
    });

    loadPoints();
}

// ==========================================================
//                     ADMIN CHARTS
// ==========================================================

async function loadAdminCharts() {
    try {
        const res = await fetch(`${API_URL}/api/admin/all-members`, {
            headers: { 'Authorization': `Bearer ${currentUser.id}` }
        });

        const data = await res.json();

        const members = data.members.filter(m => m.status === 'approved');

        adminChartsList.innerHTML = members.length
            ? members.map(m => `
                <div class="member-card" onclick="openMemberChart(${m.id}, '${m.name}')">
                    <h4>${m.name}</h4>
                    <p>${m.centre}</p>
                </div>
              `).join('')
            : '<div class="empty-state">No approved members</div>';

    } catch (err) {
        console.log('Charts error', err);
    }
}

// ==========================================================
//                  MEMBER DASHBOARD
// ==========================================================

function showMemberDashboard() {
    hideAllPages();
    memberDashboard.classList.add('active');
    memberName.textContent = `Welcome, ${currentUser.name}`;

    setTimeout(() => showMemberTab(null, 'daily'), 10);
}

async function showMemberTab(event, tab) {
    document.querySelectorAll('#memberDashboard .tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#memberDashboard .tab-content').forEach(c => c.classList.remove('active'));

    const btn = event?.target || document.querySelector(`#memberDashboard .tab-btn[data-tab="${tab}"]`);
    if (btn) btn.classList.add('active');

    document.getElementById(`${tab}Tab`).classList.add('active');

    if (tab === 'daily') loadDailyChecklist();
    if (tab === 'progress') loadMyProgress();
    if (tab === 'allcharts') loadAllMembersCharts();
}

// ==========================================================
//                   DAILY CHECKLIST
// ==========================================================

async function loadDailyChecklist() {
    try {
        const res1 = await fetch(`${API_URL}/api/points`);
        const pointsData = await res1.json();
        allPoints = pointsData.points;

        const today = new Date().toISOString().split('T')[0];

        const res2 = await fetch(`${API_URL}/api/members/${currentUser.id}/daily/${today}`);
        const dailyData = await res2.json();

        dailyCheckList.innerHTML = allPoints.map(p => {
            const isChecked = dailyData.records.some(r => r.point_id === p.id && r.completed);

            return `
                <div class="check-item">
                    <input type="checkbox" id="point-${p.id}" ${isChecked ? 'checked' : ''}
                    onchange="updateDailyCheck(${p.id}, this.checked)">
                    <label for="point-${p.id}">${p.text}</label>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.log('Daily error', err);
    }
}

async function updateDailyCheck(pointId, completed) {
    const today = new Date().toISOString().split('T')[0];

    await fetch(`${API_URL}/api/members/${currentUser.id}/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, pointId, completed })
    });
}

// ==========================================================
//               MEMBER PROGRESS CHARTS
// ==========================================================

async function loadMyProgress() {
    loadProgressCharts(currentUser.id, 'progressCharts');
}

async function loadProgressCharts(memberId, containerId) {
    try {
        const res = await fetch(`${API_URL}/api/members/${memberId}/progress/${currentPeriod}`);
        const data = await res.json();

        document.getElementById(containerId).innerHTML = data.progress.map(item => {
            const percent = Math.round(item.percentage);
            const color = percent <= 33 ? 'red' : percent <= 66 ? 'orange' : 'green';

            return `
                <div class="chart-item">
                    <div class="chart-label">${item.text}</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar ${color}" style="width:${percent}%">${percent}%</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.log('Progress error', err);
    }
}

function showPeriod(period, event) {
    currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    if (event?.target) event.target.classList.add('active');
    loadMyProgress();
}

// ==========================================================
//                 ALL MEMBERS → CHARTS
// ==========================================================

async function loadAllMembersCharts() {
    try {
        const res = await fetch(`${API_URL}/api/members`);
        const data = await res.json();

        const members = data.members.filter(m => m.status === 'approved' && m.id !== currentUser.id);

        allMembersList.innerHTML = members.length
            ? members.map(m => `
                <div class="member-card" onclick="openMemberChart(${m.id}, '${m.name}')">
                    <h4>${m.name}</h4>
                    <p>${m.centre}</p>
                </div>
              `).join('')
            : '<div class="empty-state">No members found</div>';

    } catch (err) {
        console.log('All charts error', err);
    }
}

// Modal charts
function openMemberChart(id, name) {
    modalMemberId = id;

    chartMemberName.textContent = name;
    chartModal.classList.add('show');

    currentPeriod = 'daily';

    document.querySelectorAll('#chartModal .period-btn').forEach((b, i) =>
        b.classList.toggle('active', i === 0)
    );

    loadProgressCharts(id, 'modalCharts');
}

function showModalPeriod(period, event) {
    currentPeriod = period;
    document.querySelectorAll('#chartModal .period-btn').forEach(b => b.classList.remove('active'));
    if (event?.target) event.target.classList.add('active');
    loadProgressCharts(modalMemberId, 'modalCharts');
}

function closeChartModal() {
    chartModal.classList.remove('show');
    modalMemberId = null;
}

// ==========================================================
//                      PASSWORD RESET
// ==========================================================

// Admin
async function handleAdminForgotPassword(e) {
    e.preventDefault();
    const username = adminForgotUsername.value;
    resetUsername = username;

    const res = await fetch(`${API_URL}/api/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });

    const data = await res.json();

    if (res.ok) {
        showSuccess('adminForgotSuccess', 'Reset code sent!');
        setTimeout(() => {
            hideAllPages();
            adminResetPasswordPage.classList.add('active');
        }, 2000);
    } else {
        showError('adminForgotError', data.message);
    }
}

async function handleAdminResetPassword(e) {
    e.preventDefault();

    const code = adminResetCode.value;
    const newPassword = adminNewPassword.value;
    const confirm = adminConfirmNewPassword.value;

    if (newPassword !== confirm) return showError('adminResetError', 'Passwords mismatch');

    const res = await fetch(`${API_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUsername, code, newPassword })
    });

    const data = await res.json();

    if (res.ok) {
        showSuccess('adminResetSuccess', 'Password reset!');
        adminResetPasswordForm.reset();
        setTimeout(showAdminLogin, 2000);
    } else {
        showError('adminResetError', data.message);
    }
}

// Member
async function handleMemberForgotPassword(e) {
    e.preventDefault();
    const mobile = memberForgotMobile.value;
    resetMobile = mobile;

    const res = await fetch(`${API_URL}/api/members/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
    });

    const data = await res.json();

    if (res.ok) {
        showSuccess('memberForgotSuccess', 'Reset code sent to admin!');
        setTimeout(() => {
            hideAllPages();
            memberResetPasswordPage.classList.add('active');
        }, 2000);
    } else {
        showError('memberForgotError', data.message);
    }
}

async function handleMemberResetPassword(e) {
    e.preventDefault();

    const code = memberResetCode.value;
    const newPassword = memberNewPassword.value;
    const confirm = memberConfirmNewPassword.value;

    if (newPassword !== confirm) return showError('memberResetError', 'Passwords mismatch');

    const res = await fetch(`${API_URL}/api/members/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: resetMobile, code, newPassword })
    });

    const data = await res.json();

    if (res.ok) {
        showSuccess('memberResetSuccess', 'Password reset!');
        memberResetPasswordForm.reset();
        setTimeout(showMemberLogin, 2000);
    } else {
        showError('memberResetError', data.message);
    }
}

// ==========================================================
//                  UTIL & LOGOUT
// ==========================================================

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    showLanding();
}

function updateTodayDate() {
    const today = new Date();
    todayDate.textContent = today.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function showError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}

function showSuccess(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}
