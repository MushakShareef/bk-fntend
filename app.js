// app.js - Frontend with improved UX: password toggles, validation, strength, and safer submits

// API Configuration
const API_URL = 'https://bk-spiritual-backend.onrender.com'; // Replace with your Render backend URL

// Global State
let currentUser = null;
let currentPeriod = 'daily';
let allPoints = [];
let modalMemberId = null;
let resetUsername = null;
let resetMobile = null;

// Minimal helper icons (we'll use plain text for wide compatibility)
const EYE = '👁️';
const EYE_SLASH = '🙈';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    updateTodayDate();
    enhancePasswordFields();
    enhanceMobileInputs();
});

// Setup Event Listeners
function setupEventListeners() {
    // Forms (use try/catch in case element not present)
    safeAddListener('adminLoginForm', 'submit', handleAdminLogin);
    safeAddListener('memberLoginForm', 'submit', handleMemberLogin);
    safeAddListener('registerForm', 'submit', handleRegister);
    safeAddListener('adminForgotPasswordForm', 'submit', handleAdminForgotPassword);
    safeAddListener('adminResetPasswordForm', 'submit', handleAdminResetPassword);
    safeAddListener('memberForgotPasswordForm', 'submit', handleMemberForgotPassword);
    safeAddListener('memberResetPasswordForm', 'submit', handleMemberResetPassword);
}

// Safe utility to attach listener if element exists
function safeAddListener(id, event, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
}

// Add eye toggle buttons to password inputs and hook strength/confirm logic
function enhancePasswordFields() {
    const passwordFieldIds = [
        'adminPassword',
        'adminNewPassword',
        'adminConfirmNewPassword',
        'memberPassword',
        'memberNewPassword',
        'memberConfirmNewPassword',
        'regPassword',
        'regConfirmPassword'
    ];

    passwordFieldIds.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;

        // Create toggle button (span)
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'password-toggle';
        toggle.innerText = EYE;
        toggle.setAttribute('aria-label', 'Show password');
        toggle.style.marginLeft = '8px';
        toggle.style.cursor = 'pointer';
        toggle.style.border = 'none';
        toggle.style.background = 'transparent';
        toggle.style.fontSize = '18px';
        toggle.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text';
                toggle.innerText = EYE_SLASH;
                toggle.setAttribute('aria-label', 'Hide password');
            } else {
                input.type = 'password';
                toggle.innerText = EYE;
                toggle.setAttribute('aria-label', 'Show password');
            }
            input.focus();
        });

        // Place toggle next to input (if wrapped) or insert after
        if (input.parentNode) {
            // wrap input and toggle in container for neat placement
            const container = document.createElement('span');
            container.style.display = 'inline-flex';
            container.style.alignItems = 'center';
            input.parentNode.insertBefore(container, input);
            container.appendChild(input);
            container.appendChild(toggle);
        } else {
            input.insertAdjacentElement('afterend', toggle);
        }

        // Add password strength meter to new password inputs
        if (/(NewPassword|regPassword|adminNewPassword|memberNewPassword)/i.test(id)) {
            const meter = document.createElement('div');
            meter.className = 'pw-meter';
            meter.style.marginTop = '6px';
            meter.style.fontSize = '13px';
            meter.style.minHeight = '18px';
            input.parentNode.appendChild(meter);

            input.addEventListener('input', () => {
                const score = passwordStrengthScore(input.value);
                meter.innerText = `Password strength: ${scoreLabel(score)}`;
                meter.style.color = scoreColor(score);
            });
        }
    });
}

// Mobile input UX improvements
function enhanceMobileInputs() {
    const mobileIds = ['memberMobile', 'regMobile', 'memberForgotMobile'];
    mobileIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.setAttribute('inputmode', 'numeric');
        el.setAttribute('pattern', '\\d*');
        el.setAttribute('maxlength', '10');
        el.addEventListener('input', () => {
            // strip non-digits
            el.value = el.value.replace(/\D/g, '').slice(0, 10);
        });
    });
}

// Password strength helper (very simple scoring)
function passwordStrengthScore(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    return score; // 0..5
}
function scoreLabel(score) {
    if (score <= 1) return 'Very Weak';
    if (score === 2) return 'Weak';
    if (score === 3) return 'Medium';
    if (score === 4) return 'Strong';
    return 'Very Strong';
}
function scoreColor(score) {
    if (score <= 1) return '#d9534f'; // red
    if (score === 2) return '#f0ad4e'; // orange
    if (score === 3) return '#f7dc6f'; // yellow
    if (score === 4) return '#5cb85c'; // green
    return '#3c763d';
}

// Utility: show error and clear older one
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    // remove after 5s
    setTimeout(() => {
        element.classList.remove('show');
        element.textContent = '';
    }, 5000);
}

// Utility: success message
function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => {
        element.classList.remove('show');
        element.textContent = '';
    }, 5000);
}

// Disable/Enable a form's submit button (by form id)
function setFormSubmitting(formId, submitting = true) {
    const form = document.getElementById(formId);
    if (!form) return;
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = submitting;
    btn.dataset.origText = btn.dataset.origText || btn.innerText;
    btn.innerText = submitting ? 'Please wait...' : btn.dataset.origText;
}

// Page Navigation
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

function showAdminForgotPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAllPages();
    document.getElementById('adminForgotPasswordPage').classList.add('active');
}

function showMemberForgotPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    hideAllPages();
    document.getElementById('memberForgotPasswordPage').classList.add('active');
}

function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
}

// Authentication Check
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        if (currentUser.role === 'admin') {
            showAdminDashboard();
        } else {
            showMemberDashboard();
        }
    }
}

// Admin Login Handler
async function handleAdminLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    setFormSubmitting('adminLoginForm', true);
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;

    // Basic client validation
    if (!username || !password) {
        showError('adminLoginError', 'Please enter username and password.');
        setFormSubmitting('adminLoginForm', false);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const dataText = await response.text();
        let data;
        try {
            data = JSON.parse(dataText);
        } catch (err) {
            // if server returned HTML or empty, show generic error
            showError('adminLoginError', 'Invalid server response.');
            setFormSubmitting('adminLoginForm', false);
            return;
        }

        if (response.ok) {
            currentUser = { ...data.admin, role: 'admin' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showAdminDashboard();
        } else {
            showError('adminLoginError', data.message || 'Invalid credentials');
        }
    } catch (error) {
        showError('adminLoginError', 'Connection error. Please try again.');
    } finally {
        setFormSubmitting('adminLoginForm', false);
    }
}

// Member Login Handler
async function handleMemberLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    setFormSubmitting('memberLoginForm', true);
    const mobile = document.getElementById('memberMobile').value.trim();
    const password = document.getElementById('memberPassword').value;

    if (!mobile || !password) {
        showError('memberLoginError', 'Please enter mobile and password.');
        setFormSubmitting('memberLoginForm', false);
        return;
    }

    if (mobile.length < 10) {
        showError('memberLoginError', 'Enter a valid 10-digit mobile number.');
        setFormSubmitting('memberLoginForm', false);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/members/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, password })
        });

        const dataText = await response.text();
        let data;
        try { data = JSON.parse(dataText); } catch (err) {
            showError('memberLoginError', 'Invalid server response.');
            setFormSubmitting('memberLoginForm', false);
            return;
        }

        if (response.ok) {
            currentUser = { ...data.member, role: 'member' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMemberDashboard();
        } else {
            showError('memberLoginError', data.message || 'Invalid credentials');
        }
    } catch (error) {
        showError('memberLoginError', 'Connection error. Please try again.');
    } finally {
        setFormSubmitting('memberLoginForm', false);
    }
}

// Register Handler
async function handleRegister(e) {
    if (e && e.preventDefault) e.preventDefault();
    setFormSubmitting('registerForm', true);

    const name = document.getElementById('regName').value.trim();
    const centre = document.getElementById('regCentre').value.trim();
    const mobile = document.getElementById('regMobile').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (!name || !centre || !mobile || !password || !confirmPassword) {
        showError('registerError', 'Please fill all fields.');
        setFormSubmitting('registerForm', false);
        return;
    }

    if (mobile.length < 10) {
        showError('registerError', 'Enter a valid 10-digit mobile number.');
        setFormSubmitting('registerForm', false);
        return;
    }

    if (password !== confirmPassword) {
        showError('registerError', 'Passwords do not match.');
        setFormSubmitting('registerForm', false);
        return;
    }

    if (password.length < 6) {
        showError('registerError', 'Password must be at least 6 characters.');
        setFormSubmitting('registerForm', false);
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/members/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, centre, mobile, password })
        });

        const dataText = await response.text();
        let data;
        try { data = JSON.parse(dataText); } catch (err) {
            showError('registerError', 'Invalid server response.');
            setFormSubmitting('registerForm', false);
            return;
        }

        if (response.ok) {
            document.getElementById('registerForm').reset();
            showSuccess('registerSuccess', 'Registration successful! You can now login.');
            setTimeout(() => showMemberLogin(), 3000);
        } else {
            showError('registerError', data.message || 'Registration failed');
        }
    } catch (error) {
        showError('registerError', 'Connection error. Please try again.');
    } finally {
        setFormSubmitting('registerForm', false);
    }
}

// Show Admin Dashboard
async function showAdminDashboard() {
    hideAllPages();
    document.getElementById('adminDashboard').classList.add('active');
    showAdminTab(null, 'members');
    await loadAllMembers();
}

// Show Admin Tabs
async function showAdminTab(event, tab) {
    document.querySelectorAll('#adminDashboard .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#adminDashboard .tab-content').forEach(content => content.classList.remove('active'));

    // Safe event handling
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        document.querySelector(`#adminDashboard button[data-tab="${tab}"]`)?.classList.add('active');
    }

    document.getElementById(`${tab}Tab`).classList.add('active');

    if (tab === 'members') {
        await loadAllMembers();
    } else if (tab === 'points') {
        await loadPoints();
    } else if (tab === 'charts') {
        await loadAdminCharts();
    }
}

// Load All Members
async function loadAllMembers() {
    try {
        const response = await fetch(`${API_URL}/api/admin/all-members`, {
            headers: { 'Authorization': `Bearer ${currentUser?.id || ''}` }
        });

        // handle non-JSON gracefully
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch (err) {
            console.error('Members error', err, text);
            showError('adminLoginError', 'Failed to load members. Server returned invalid response.');
            return;
        }

        const container = document.getElementById('membersList');

        if (!data.members || data.members.length === 0) {
            container.innerHTML = '<div class="empty-state">No members yet</div>';
            return;
        }

        container.innerHTML = data.members.map(member => `
            <div class="member-card">
                <h4>${escapeHtml(member.name)}</h4>
                <p>BK Centre: ${escapeHtml(member.centre)}</p>
                <p>Mobile: ${escapeHtml(member.mobile)}</p>
                <p>Registered: ${new Date(member.created_at).toLocaleDateString('en-IN')}</p>
                <div class="card-actions">
                    <button class="btn-danger" onclick="deleteMember(${member.id})">Delete Member</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading members:', error);
        showError('adminLoginError', 'Connection error while loading members.');
    }
}

// Delete Member
async function deleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this member? All their data will be permanently removed.')) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/delete-member/${memberId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentUser?.id || ''}` }
        });

        if (response.ok) {
            await loadAllMembers();
        } else {
            showError('adminLoginError', 'Failed to delete member.');
        }
    } catch (error) {
        console.error('Error deleting member:', error);
        showError('adminLoginError', 'Connection error while deleting member.');
    }
}

// Load Points
async function loadPoints() {
    try {
        const response = await fetch(`${API_URL}/api/points`);
        const data = await response.json();
        allPoints = data.points;

        const container = document.getElementById('pointsList');
        container.innerHTML = allPoints.map((point, index) => `
            <div class="point-card">
                <h4>Point ${index + 1}</h4>
                <p>${escapeHtml(point.text)}</p>
                <div class="card-actions">
                    <button class="btn-secondary btn-small" onclick="editPoint(${point.id}, '${point.text.replace(/'/g, "\\'")}')">Edit</button>
                    <button class="btn-danger btn-small" onclick="deletePoint(${point.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading points:', error);
        showError('adminLoginError', 'Failed to load points.');
    }
}

// Show Add Point Form
function showAddPointForm() {
    document.getElementById('addPointForm').classList.remove('hidden');
}

function hideAddPointForm() {
    document.getElementById('addPointForm').classList.add('hidden');
    document.getElementById('newPointText').value = '';
}

// Add Point
async function addPoint() {
    const text = document.getElementById('newPointText').value.trim();
    if (!text) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser?.id || ''}`
            },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            hideAddPointForm();
            await loadPoints();
        } else {
            showError('adminLoginError', 'Failed to add point.');
        }
    } catch (error) {
        console.error('Error adding point:', error);
        showError('adminLoginError', 'Connection error while adding point.');
    }
}

// Edit Point
async function editPoint(pointId, currentText) {
    const newText = prompt('Edit point text:', currentText);
    if (newText === null) return; // cancel
    if (!newText || newText === currentText) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/points/${pointId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser?.id || ''}`
            },
            body: JSON.stringify({ text: newText })
        });

        if (response.ok) {
            await loadPoints();
        } else {
            showError('adminLoginError', 'Failed to update point.');
        }
    } catch (error) {
        console.error('Error editing point:', error);
        showError('adminLoginError', 'Connection error while editing point.');
    }
}

// Delete Point
async function deletePoint(pointId) {
    if (!confirm('Are you sure you want to delete this point?')) return;

    try {
        const response = await fetch(`${API_URL}/api/admin/points/${pointId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentUser?.id || ''}` }
        });

        if (response.ok) {
            await loadPoints();
        } else {
            showError('adminLoginError', 'Failed to delete point.');
        }
    } catch (error) {
        console.error('Error deleting point:', error);
        showError('adminLoginError', 'Connection error while deleting point.');
    }
}

// Load Admin Charts
async function loadAdminCharts() {
    try {
        const response = await fetch(`${API_URL}/api/admin/all-members`, {
            headers: { 'Authorization': `Bearer ${currentUser?.id || ''}` }
        });
        const data = await response.json();

        const approvedMembers = data.members.filter(m => m.status === 'approved');
        const container = document.getElementById('adminChartsList');

        if (approvedMembers.length === 0) {
            container.innerHTML = '<div class="empty-state">No approved members yet</div>';
            return;
        }

        container.innerHTML = approvedMembers.map(member => `
            <div class="member-card" onclick="openMemberChart(${member.id}, '${escapeHtml(member.name)}')" style="cursor: pointer;">
                <h4>${escapeHtml(member.name)}</h4>
                <p>BK Centre: ${escapeHtml(member.centre)}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading charts:', error);
        showError('adminLoginError', 'Failed to load charts.');
    }
}

// Show Member Dashboard
async function showMemberDashboard() {
    hideAllPages();
    document.getElementById('memberDashboard').classList.add('active');
    document.getElementById('memberName').textContent = `Welcome, ${currentUser.name}`;
    showMemberTab(null, 'daily');
    await loadDailyChecklist();
}

// Show Member Tabs
async function showMemberTab(event, tab) {
    document.querySelectorAll('#memberDashboard .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#memberDashboard .tab-content').forEach(content => content.classList.remove('active'));

    // Safe event
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        document.querySelector(`#memberDashboard button[data-tab="${tab}"]`)?.classList.add('active');
    }

    document.getElementById(`${tab}Tab`).classList.add('active');

    if (tab === 'daily') {
        await loadDailyChecklist();
    } else if (tab === 'progress') {
        await loadMyProgress();
    } else if (tab === 'allcharts') {
        await loadAllMembersCharts();
    }
}

// Load Daily Checklist
async function loadDailyChecklist() {
    try {
        const response = await fetch(`${API_URL}/api/points`);
        const pointsData = await response.json();
        allPoints = pointsData.points;

        const today = new Date().toISOString().split('T')[0];
        const checkResponse = await fetch(`${API_URL}/api/members/${currentUser.id}/daily/${today}`);
        const checkData = await checkResponse.json();

        const container = document.getElementById('dailyCheckList');
        container.innerHTML = allPoints.map(point => {
        const defaultValue = checkData[point.id] ?? 0; // if checkData exists for this point, use it; else 0
        return `
            <div class="check-item">
                <input type="range"
                    min="0"
                    max="100"
                    value="${defaultValue}"
                    class="slider"
                    id="point-${point.id}"
                    oninput="updateDailyCheck(${point.id}, this.value); updateSliderValue(this, ${point.id});">
                <span id="percent-${point.id}" class="percent-label">${defaultValue}%</span>
                <label for="point-${point.id}">${escapeHtml(point.text)}</label>
            </div>
        `;
    }).join('');

    } catch (error) {
        console.error('Error loading daily checklist:', error);
        showError('memberLoginError', 'Failed to load daily checklist.');
    }
}
function updateSliderValue(slider, pointId) {
    const value = slider.value;
    document.getElementById(`slider-value-${pointId}`).textContent = value + '%';
}


// Update Daily Check
async function updateDailyCheck(pointId, completed) {
    try {
        const today = new Date().toISOString().split('T')[0];
        await fetch(`${API_URL}/api/members/${currentUser.id}/daily`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today, pointId, completed })
        });
    } catch (error) {
        console.error('Error updating check:', error);
    }
}

// Load My Progress
async function loadMyProgress() {
    await loadProgressCharts(currentUser.id, 'progressCharts');
}

// Load Progress Charts
async function loadProgressCharts(memberId, containerId) {
    try {
        const response = await fetch(`${API_URL}/api/members/${memberId}/progress/${currentPeriod}`);
        const data = await response.json();

        const container = document.getElementById(containerId);
        container.innerHTML = data.progress.map(item => {
            const percentage = Math.round(item.percentage);
            const colorClass = percentage <= 33 ? 'red' : percentage <= 66 ? 'orange' : 'green';

            return `
                <div class="chart-item">
                    <div class="chart-label">${escapeHtml(item.text)}</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar ${colorClass}" style="width: ${percentage}%">
                            ${percentage}%
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading progress:', error);
        showError('memberLoginError', 'Failed to load progress charts.');
    }
}

// Show Period
function showPeriod(period, event) {
    currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    loadMyProgress();
}

// Load All Members Charts
async function loadAllMembersCharts() {
    try {
        const response = await fetch(`${API_URL}/api/members`);
        const data = await response.json();

        const approvedMembers = data.members.filter(m => m.status === 'approved' && m.id !== currentUser.id);
        const container = document.getElementById('allMembersList');

        if (approvedMembers.length === 0) {
            container.innerHTML = '<div class="empty-state">No other members to display</div>';
            return;
        }

        container.innerHTML = approvedMembers.map(member => `
            <div class="member-card" onclick="openMemberChart(${member.id}, '${escapeHtml(member.name)}')" style="cursor: pointer;">
                <h4>${escapeHtml(member.name)}</h4>
                <p>BK Centre: ${escapeHtml(member.centre)}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading members:', error);
        showError('memberLoginError', 'Failed to load members.');
    }
}

// Open Member Chart Modal
function openMemberChart(memberId, memberName) {
    modalMemberId = memberId;
    document.getElementById('chartMemberName').textContent = memberName;
    document.getElementById('chartModal').classList.add('show');
    currentPeriod = 'daily';
    document.querySelectorAll('#chartModal .period-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === 0);
    });
    loadProgressCharts(memberId, 'modalCharts');
}

// Show Modal Period
function showModalPeriod(period, event) {
    currentPeriod = period;
    document.querySelectorAll('#chartModal .period-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    loadProgressCharts(modalMemberId, 'modalCharts');
}

// Close Chart Modal
function closeChartModal() {
    document.getElementById('chartModal').classList.remove('show');
    modalMemberId = null;
}

// Logout
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    showLanding();
}

// Update Today's Date
function updateTodayDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('todayDate').textContent = today.toLocaleDateString('en-IN', options);
}

// ============ PASSWORD RESET FUNCTIONS ============

// Admin Forgot Password
async function handleAdminForgotPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    const username = document.getElementById('adminForgotUsername').value.trim();
    resetUsername = username;

    if (!username) {
        showError('adminForgotError', 'Please enter username.');
        return;
    }

    setFormSubmitting('adminForgotPasswordForm', true);

    try {
        const response = await fetch(`${API_URL}/api/admin/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const dataText = await response.text();
        let data;
        try { data = JSON.parse(dataText); } catch (err) {
            showError('adminForgotError', 'Invalid server response.');
            setFormSubmitting('adminForgotPasswordForm', false);
            return;
        }

        if (response.ok) {
            showSuccess('adminForgotSuccess', 'Reset code sent to your email! Check iraisevaiyil@gmail.com');
            setTimeout(() => {
                hideAllPages();
                document.getElementById('adminResetPasswordPage').classList.add('active');
            }, 2000);
        } else {
            showError('adminForgotError', data.message || 'Username not found');
        }
    } catch (error) {
        showError('adminForgotError', 'Connection error. Please try again.');
    } finally {
        setFormSubmitting('adminForgotPasswordForm', false);
    }
}

// Admin Reset Password
async function handleAdminResetPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    const code = document.getElementById('adminResetCode').value.trim();
    const newPassword = document.getElementById('adminNewPassword').value;
    const confirmPassword = document.getElementById('adminConfirmNewPassword').value;

    if (!code || !newPassword || !confirmPassword) {
        showError('adminResetError', 'Please fill all fields.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('adminResetError', 'Passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        showError('adminResetError', 'Password must be at least 6 characters');
        return;
    }

    setFormSubmitting('adminResetPasswordForm', true);

    try {
        const response = await fetch(`${API_URL}/api/admin/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: resetUsername, code, newPassword })
        });

        const dataText = await response.text();
        let data;
        try { data = JSON.parse(dataText); } catch (err) {
            showError('adminResetError', 'Invalid server response.');
            setFormSubmitting('adminResetPasswordForm', false);
            return;
        }

        if (response.ok) {
            showSuccess('adminResetSuccess', 'Password reset successful! Redirecting to login...');
            document.getElementById('adminResetPasswordForm').reset();
            setTimeout(() => showAdminLogin(), 2000);
        } else {
            showError('adminResetError', data.message || 'Invalid or expired reset code');
        }
    } catch (error) {
        showError('adminResetError', 'Connection error. Please try again.');
    } finally {
        setFormSubmitting('adminResetPasswordForm', false);
    }
}

// Member Forgot Password
async function handleMemberForgotPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    const mobile = document.getElementById('memberForgotMobile').value.trim();
    resetMobile = mobile;

    if (!mobile) {
        showError('memberForgotError', 'Please enter mobile number.');
        return;
    }
    if (mobile.length < 10) {
        showError('memberForgotError', 'Enter a valid 10-digit mobile number.');
        return;
    }

    setFormSubmitting('memberForgotPasswordForm', true);

    try {
        const response = await fetch(`${API_URL}/api/members/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });

        const dataText = await response.text();
        let data;
        try { data = JSON.parse(dataText); } catch (err) {
            showError('memberForgotError', 'Invalid server response.');
            setFormSubmitting('memberForgotPasswordForm', false);
            return;
        }

        if (response.ok) {
            showSuccess('memberForgotSuccess', 'Reset code sent to admin email (iraisevaiyil@gmail.com)! Admin will share the code with you.');
            setTimeout(() => {
                hideAllPages();
                document.getElementById('memberResetPasswordPage').classList.add('active');
            }, 3000);
        } else {
            showError('memberForgotError', data.message || 'Mobile number not found');
        }
    } catch (error) {
        showError('memberForgotError', 'Connection error. Please try again.');
    } finally {
        setFormSubmitting('memberForgotPasswordForm', false);
    }
}

// Member Reset Password
async function handleMemberResetPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    const code = document.getElementById('memberResetCode').value.trim();
    const newPassword = document.getElementById('memberNewPassword').value;
    const confirmPassword = document.getElementById('memberConfirmNewPassword').value;

    if (!code || !newPassword || !confirmPassword) {
        showError('memberResetError', 'Please fill all fields.');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('memberResetError', 'Passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        showError('memberResetError', 'Password must be at least 6 characters');
        return;
    }

    setFormSubmitting('memberResetPasswordForm', true);

    try {
        const response = await fetch(`${API_URL}/api/members/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: resetMobile, code, newPassword })
        });

        const dataText = await response.text();
        let data;
        try { data = JSON.parse(dataText); } catch (err) {
            showError('memberResetError', 'Invalid server response.');
            setFormSubmitting('memberResetPasswordForm', false);
            return;
        }

        if (response.ok) {
            showSuccess('memberResetSuccess', 'Password reset successful! Redirecting to login...');
            document.getElementById('memberResetPasswordForm').reset();
            setTimeout(() => showMemberLogin(), 2000);
        } else {
            showError('memberResetError', data.message || 'Invalid or expired reset code');
        }
    } catch (error) {
        showError('memberResetError', 'Connection error. Please try again.');
    } finally {
        setFormSubmitting('memberResetPasswordForm', false);
    }
}

// Utility to escape HTML in strings before injecting into DOM
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
