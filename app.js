// API Configuration
const API_URL = 'https://bk-spiritual-backend.onrender.com'; // Replace with your Render backend URL

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
    // Admin Login Form
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    
    // Member Login Form
    document.getElementById('memberLoginForm').addEventListener('submit', handleMemberLogin);
    
    // Register Form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Admin Forgot Password Form
    document.getElementById('adminForgotPasswordForm').addEventListener('submit', handleAdminForgotPassword);
    
    // Admin Reset Password Form
    document.getElementById('adminResetPasswordForm').addEventListener('submit', handleAdminResetPassword);
    
    // Member Forgot Password Form
    document.getElementById('memberForgotPasswordForm').addEventListener('submit', handleMemberForgotPassword);
    
    // Member Reset Password Form
    document.getElementById('memberResetPasswordForm').addEventListener('submit', handleMemberResetPassword);
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
    e.preventDefault();
    hideAllPages();
    document.getElementById('adminForgotPasswordPage').classList.add('active');
}

function showMemberForgotPassword(e) {
    e.preventDefault();
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
    e.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = { ...data.admin, role: 'admin' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showAdminDashboard();
        } else {
            showError('adminLoginError', data.message || 'Invalid credentials');
        }
    } catch (error) {
        showError('adminLoginError', 'Connection error. Please try again.');
    }
}

// Member Login Handler
async function handleMemberLogin(e) {
    e.preventDefault();
    const mobile = document.getElementById('memberMobile').value;
    const password = document.getElementById('memberPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/api/members/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = { ...data.member, role: 'member' };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMemberDashboard();
        } else {
            showError('memberLoginError', data.message || 'Invalid credentials');
        }
    } catch (error) {
        showError('memberLoginError', 'Connection error. Please try again.');
    }
}

// Register Handler
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const centre = document.getElementById('regCentre').value;
    const mobile = document.getElementById('regMobile').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showError('registerError', 'Passwords do not match');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/members/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, centre, mobile, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('registerForm').reset();
            showSuccess('registerSuccess', 'Registration successful! You can now login.');
            setTimeout(() => showMemberLogin(), 3000);
        } else {
            showError('registerError', data.message || 'Registration failed');
        }
    } catch (error) {
        showError('registerError', 'Connection error. Please try again.');
    }
}

// Show Admin Dashboard
async function showAdminDashboard() {
    hideAllPages();
    document.getElementById('adminDashboard').classList.add('active');
    showAdminTab('members');
    await loadAllMembers();
}

// Show Admin Tabs
async function showAdminTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
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
            headers: { 'Authorization': `Bearer ${currentUser.id}` }
        });
        const data = await response.json();
        
        const container = document.getElementById('membersList');
        
        if (data.members.length === 0) {
            container.innerHTML = '<div class="empty-state">No members yet</div>';
            return;
        }
        
        container.innerHTML = data.members.map(member => `
            <div class="member-card">
                <h4>${member.name}</h4>
                <p>BK Centre: ${member.centre}</p>
                <p>Mobile: ${member.mobile}</p>
                <p>Registered: ${new Date(member.created_at).toLocaleDateString('en-IN')}</p>
                <div class="card-actions">
                    <button class="btn-danger" onclick="deleteMember(${member.id})">Delete Member</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

// Delete Member
async function deleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this member? All their data will be permanently removed.')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/delete-member/${memberId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentUser.id}` }
        });
        
        if (response.ok) {
            await loadAllMembers();
        }
    } catch (error) {
        console.error('Error deleting member:', error);
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
                <p>${point.text}</p>
                <div class="card-actions">
                    <button class="btn-secondary btn-small" onclick="editPoint(${point.id}, '${point.text.replace(/'/g, "\\'")}')">Edit</button>
                    <button class="btn-danger btn-small" onclick="deletePoint(${point.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading points:', error);
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
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({ text })
        });
        
        if (response.ok) {
            hideAddPointForm();
            await loadPoints();
        }
    } catch (error) {
        console.error('Error adding point:', error);
    }
}

// Edit Point
async function editPoint(pointId, currentText) {
    const newText = prompt('Edit point text:', currentText);
    if (!newText || newText === currentText) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/points/${pointId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.id}`
            },
            body: JSON.stringify({ text: newText })
        });
        
        if (response.ok) {
            await loadPoints();
        }
    } catch (error) {
        console.error('Error editing point:', error);
    }
}

// Delete Point
async function deletePoint(pointId) {
    if (!confirm('Are you sure you want to delete this point?')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/points/${pointId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentUser.id}` }
        });
        
        if (response.ok) {
            await loadPoints();
        }
    } catch (error) {
        console.error('Error deleting point:', error);
    }
}

// Load Admin Charts
async function loadAdminCharts() {
    try {
        const response = await fetch(`${API_URL}/api/admin/all-members`, {
            headers: { 'Authorization': `Bearer ${currentUser.id}` }
        });
        const data = await response.json();
        
        const approvedMembers = data.members.filter(m => m.status === 'approved');
        const container = document.getElementById('adminChartsList');
        
        if (approvedMembers.length === 0) {
            container.innerHTML = '<div class="empty-state">No approved members yet</div>';
            return;
        }
        
        container.innerHTML = approvedMembers.map(member => `
            <div class="member-card" onclick="openMemberChart(${member.id}, '${member.name}')" style="cursor: pointer;">
                <h4>${member.name}</h4>
                <p>BK Centre: ${member.centre}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

// Show Member Dashboard
async function showMemberDashboard() {
    hideAllPages();
    document.getElementById('memberDashboard').classList.add('active');
    document.getElementById('memberName').textContent = `Welcome, ${currentUser.name}`;
    showMemberTab('daily');
    await loadDailyChecklist();
}

// Show Member Tabs
async function showMemberTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
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
            const isChecked = checkData.records.find(r => r.point_id === point.id)?.completed || false;
            return `
                <div class="check-item">
                    <input type="checkbox" id="point-${point.id}" ${isChecked ? 'checked' : ''} 
                           onchange="updateDailyCheck(${point.id}, this.checked)">
                    <label for="point-${point.id}">${point.text}</label>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading daily checklist:', error);
    }
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
                    <div class="chart-label">${item.text}</div>
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
    }
}

// Show Period
function showPeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
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
            <div class="member-card" onclick="openMemberChart(${member.id}, '${member.name}')" style="cursor: pointer;">
                <h4>${member.name}</h4>
                <p>BK Centre: ${member.centre}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading members:', error);
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
function showModalPeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('#chartModal .period-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
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

// Utility Functions
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 5000);
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.add('show');
    setTimeout(() => element.classList.remove('show'), 5000);
}

// ============ PASSWORD RESET FUNCTIONS ============

// Admin Forgot Password
async function handleAdminForgotPassword(e) {
    e.preventDefault();
    const username = document.getElementById('adminForgotUsername').value;
    resetUsername = username;
    
    try {
        const response = await fetch(`${API_URL}/api/admin/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
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
    }
}

// Admin Reset Password
async function handleAdminResetPassword(e) {
    e.preventDefault();
    const code = document.getElementById('adminResetCode').value;
    const newPassword = document.getElementById('adminNewPassword').value;
    const confirmPassword = document.getElementById('adminConfirmNewPassword').value;
    
    if (newPassword !== confirmPassword) {
        showError('adminResetError', 'Passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        showError('adminResetError', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/admin/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: resetUsername, code, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('adminResetSuccess', 'Password reset successful! Redirecting to login...');
            document.getElementById('adminResetPasswordForm').reset();
            setTimeout(() => showAdminLogin(), 2000);
        } else {
            showError('adminResetError', data.message || 'Invalid or expired reset code');
        }
    } catch (error) {
        showError('adminResetError', 'Connection error. Please try again.');
    }
}

// Member Forgot Password
async function handleMemberForgotPassword(e) {
    e.preventDefault();
    const mobile = document.getElementById('memberForgotMobile').value;
    resetMobile = mobile;
    
    try {
        const response = await fetch(`${API_URL}/api/members/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });
        
        const data = await response.json();
        
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
    }
}

// Member Reset Password
async function handleMemberResetPassword(e) {
    e.preventDefault();
    const code = document.getElementById('memberResetCode').value;
    const newPassword = document.getElementById('memberNewPassword').value;
    const confirmPassword = document.getElementById('memberConfirmNewPassword').value;
    
    if (newPassword !== confirmPassword) {
        showError('memberResetError', 'Passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        showError('memberResetError', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/members/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: resetMobile, code, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('memberResetSuccess', 'Password reset successful! Redirecting to login...');
            document.getElementById('memberResetPasswordForm').reset();
            setTimeout(() => showMemberLogin(), 2000);
        } else {
            showError('memberResetError', data.message || 'Invalid or expired reset code');
        }
    } catch (error) {
        showError('memberResetError', 'Connection error. Please try again.');
    }
}