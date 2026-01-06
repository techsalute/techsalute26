// ========================================================
// COMMUNITY PORTAL - PRODUCTION READY WITH GOOGLE SHEETS INTEGRATION
// ========================================================

const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbycDBc-w-DmUogAs81gKiub-Pc3smcqWzlf2P_-3Tq285ds038G83DVb6S_VKEnIczGZg/exec',
    APP_NAME: 'Community Portal',
    VERSION: '2.1.0',
    MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 
             'July', 'August', 'September', 'October', 'November', 'December']
};

let appState = {
    user: null,
    admin: null,
    sessionId: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoading: false,
    currentPage: 'home'
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
    checkAuthState();
    updateNavigation();
    setTimeout(testAPIConnection, 1000);
});

function initApp() {
    loadFromStorage();
    initUIComponents();
}

function loadFromStorage() {
    try {
        const userData = localStorage.getItem('community_user');
        const adminData = localStorage.getItem('community_admin');
        
        if (userData) {
            appState.user = JSON.parse(userData);
            appState.isAuthenticated = true;
            appState.isAdmin = false;
        } else if (adminData) {
            appState.admin = JSON.parse(adminData);
            appState.isAuthenticated = true;
            appState.isAdmin = true;
        }
    } catch (error) {
        clearStorage();
    }
}

function saveToStorage() {
    if (appState.user) {
        localStorage.setItem('community_user', JSON.stringify(appState.user));
        localStorage.removeItem('community_admin');
    } else if (appState.admin) {
        localStorage.setItem('community_admin', JSON.stringify(appState.admin));
        localStorage.removeItem('community_user');
    }
}

function clearStorage() {
    localStorage.removeItem('community_user');
    localStorage.removeItem('community_admin');
    appState.user = null;
    appState.admin = null;
    appState.isAuthenticated = false;
    appState.isAdmin = false;
}

// ==================== API CALLS - SIMPLIFIED ====================

async function callAPI(action, data = {}) {
    showLoading(true);
    
    // Build URL with parameters
    const params = new URLSearchParams();
    params.append('action', action);
    
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
            params.append(key, value.toString());
        }
    }
    
    const url = CONFIG.API_URL + '?' + params.toString();
    
    console.log('API Call:', action, data);
    
    try {
        // Use JSONP for CORS compatibility
        const result = await callAPIWithJSONP(url);
        console.log('API Response:', result);
        
        if (result && result.success === false && result.error) {
            throw new Error(result.error);
        }
        
        return result || { success: false, message: 'No response from server' };
        
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            message: 'Network error: ' + error.message
        };
    } finally {
        showLoading(false);
    }
}

function callAPIWithJSONP(url) {
    return new Promise((resolve) => {
        const callbackName = 'callback_' + Date.now();
        const script = document.createElement('script');
        
        window[callbackName] = function(response) {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            resolve(response);
        };
        
        script.src = url + '&callback=' + callbackName;
        script.onerror = function() {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            resolve({ 
                success: false, 
                message: 'Connection failed. Please check your internet connection.' 
            });
        };
        
        document.head.appendChild(script);
    });
}

// ==================== UI FUNCTIONS ====================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        appState.currentPage = pageId;
        
        // Close mobile menu
        const navLinks = document.getElementById('navLinks');
        const menuToggle = document.getElementById('menuToggle');
        if (navLinks) navLinks.classList.remove('active');
        if (menuToggle) menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        
        loadPageData(pageId);
        window.scrollTo(0, 0);
    }
}

function loadPageData(pageId) {
    switch(pageId) {
        case 'userDashboard':
            loadUserDashboard();
            break;
        case 'adminDashboard':
            loadAdminDashboard();
            break;
        case 'leadersPage':
            loadLeaders();
            break;
        case 'donationStatus':
            loadDonationStatus();
            break;
        case 'contactAdmin':
            loadContactPage();
            break;
        case 'manageLeaders':
            loadManageLeaders();
            break;
        case 'viewMessages':
            loadMessages();
            break;
    }
}

function updateNavigation() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    
    let html = '';
    
    if (appState.isAuthenticated) {
        if (appState.isAdmin) {
            html = `
                <a href="#" class="nav-link" onclick="showPage('adminDashboard')">Dashboard</a>
                <a href="#" class="nav-link" onclick="showPage('manageLeaders')">Leaders</a>
                <a href="#" class="nav-link" onclick="showPage('donationStatus')">Donations</a>
                <a href="#" class="nav-link" onclick="showPage('viewMessages')">Messages</a>
                <a href="#" class="nav-link" onclick="logout()">Logout</a>
            `;
        } else {
            html = `
                <a href="#" class="nav-link" onclick="showPage('userDashboard')">Dashboard</a>
                <a href="#" class="nav-link" onclick="showPage('leadersPage')">Leaders</a>
                <a href="#" class="nav-link" onclick="showPage('donationStatus')">Donations</a>
                <a href="#" class="nav-link" onclick="showPage('contactAdmin')">Contact</a>
                <a href="#" class="nav-link" onclick="logout()">Logout</a>
            `;
        }
    } else {
        html = `
            <a href="#" class="nav-link" onclick="showPage('homePage')">Home</a>
            <a href="#" class="nav-link" onclick="showPage('userLogin')">Login</a>
            <a href="#" class="nav-link" onclick="showPage('userRegister')">Register</a>
            <a href="#" class="nav-link" onclick="showPage('adminLogin')">Admin</a>
        `;
    }
    
    navLinks.innerHTML = html;
}

function showLoading(show) {
    appState.isLoading = show;
    
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay && show) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Processing...</p>
        `;
        document.body.appendChild(overlay);
    }
    
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => {
        toast.remove();
    });
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

function initUIComponents() {
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            menuToggle.innerHTML = navLinks.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });
    }
    
    document.addEventListener('click', function(event) {
        if (navLinks && menuToggle && !event.target.closest('.navbar')) {
            navLinks.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // User Login
    const userLoginForm = document.getElementById('userLoginForm');
    if (userLoginForm) {
        userLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleUserLogin();
        });
    }
    
    // User Registration
    const userRegisterForm = document.getElementById('userRegisterForm');
    if (userRegisterForm) {
        userRegisterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleUserRegistration();
        });
    }
    
    // Admin Login
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleAdminLogin();
        });
    }
    
    // Contact Form
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleSendMessage();
        });
    }
    
    // Add Leader Form
    const addLeaderForm = document.getElementById('addLeaderForm');
    if (addLeaderForm) {
        addLeaderForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleAddLeader();
        });
    }
    
    // Add Work Form
    const addWorkForm = document.getElementById('addWorkForm');
    if (addWorkForm) {
        addWorkForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleAddWork();
        });
    }
    
    // Setup Database Button
    const setupBtn = document.getElementById('setupDatabaseBtn');
    if (setupBtn) {
        setupBtn.onclick = setupDatabaseDirect;
    }
    
    // Add Sample Data Button
    const sampleBtn = document.getElementById('addSampleDataBtn');
    if (sampleBtn) {
        sampleBtn.onclick = addSampleDataDirect;
    }
}

// ==================== FORM HANDLERS ====================

async function handleUserLogin() {
    const email = document.getElementById('userEmail')?.value;
    const password = document.getElementById('userPassword')?.value;
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    try {
        const result = await callAPI('login', { email, password });
        
        if (result.success) {
            appState.user = result.data.user;
            appState.isAuthenticated = true;
            appState.isAdmin = false;
            saveToStorage();
            
            updateNavigation();
            showPage('userDashboard');
            showToast('Login successful!', 'success');
        } else {
            showToast(result.message || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Login failed: ' + error.message, 'error');
    }
}

async function handleUserRegistration() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value;
    const address = document.getElementById('regAddress')?.value;
    
    if (!name || !email || !password) {
        showToast('Name, email and password are required', 'error');
        return;
    }
    
    try {
        const result = await callAPI('register', {
            name, email, password, phone, address
        });
        
        if (result.success) {
            appState.user = result.data.user;
            appState.isAuthenticated = true;
            appState.isAdmin = false;
            saveToStorage();
            
            updateNavigation();
            showPage('userDashboard');
            showToast('Registration successful!', 'success');
        } else {
            showToast(result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Registration failed: ' + error.message, 'error');
    }
}

async function handleAdminLogin() {
    const password = document.getElementById('adminPassword')?.value;
    
    if (!password) {
        showToast('Please enter admin password', 'error');
        return;
    }
    
    try {
        const result = await callAPI('adminlogin', { password });
        
        if (result.success) {
            appState.admin = result.data.admin;
            appState.isAuthenticated = true;
            appState.isAdmin = true;
            saveToStorage();
            
            updateNavigation();
            showPage('adminDashboard');
            showToast('Admin login successful!', 'success');
        } else {
            showToast(result.message || 'Admin login failed', 'error');
        }
    } catch (error) {
        showToast('Admin login failed: ' + error.message, 'error');
    }
}

async function handleSendMessage() {
    if (!appState.isAuthenticated || appState.isAdmin) {
        showToast('Please login as a user to send messages', 'error');
        showPage('userLogin');
        return;
    }
    
    const message = document.getElementById('messageContent')?.value;
    
    if (!message || message.trim() === '') {
        showToast('Please enter a message', 'error');
        return;
    }
    
    try {
        const result = await callAPI('sendmessage', {
            userId: appState.user.id,
            userName: appState.user.name,
            userEmail: appState.user.email,
            message: message.trim()
        });
        
        if (result.success) {
            showToast('Message sent successfully!', 'success');
            document.getElementById('messageContent').value = '';
            loadContactPage();
        } else {
            showToast(result.message || 'Failed to send message', 'error');
        }
    } catch (error) {
        showToast('Failed to send message: ' + error.message, 'error');
    }
}

async function handleAddLeader() {
    if (!appState.isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    const name = document.getElementById('leaderName')?.value;
    const role = document.getElementById('leaderRole')?.value;
    const description = document.getElementById('leaderDesc')?.value;
    
    if (!name || !role) {
        showToast('Name and role are required', 'error');
        return;
    }
    
    try {
        const result = await callAPI('addleader', { 
            name: name.trim(), 
            role: role.trim(), 
            description: description?.trim() || '' 
        });
        
        if (result.success) {
            showToast('Leader added successfully!', 'success');
            document.getElementById('addLeaderForm').reset();
            loadManageLeaders();
            closeModal();
        } else {
            showToast(result.message || 'Failed to add leader', 'error');
        }
    } catch (error) {
        showToast('Failed to add leader: ' + error.message, 'error');
    }
}

async function handleAddWork() {
    if (!appState.isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    const leaderId = document.getElementById('workLeader')?.value;
    const title = document.getElementById('workTitle')?.value;
    const description = document.getElementById('workDescription')?.value;
    const date = document.getElementById('workDate')?.value;
    
    if (!leaderId || !title) {
        showToast('Leader and title are required', 'error');
        return;
    }
    
    try {
        const result = await callAPI('addleaderwork', {
            leaderId: leaderId,
            title: title.trim(),
            description: description?.trim() || '',
            date: date || new Date().toISOString().split('T')[0]
        });
        
        if (result.success) {
            showToast('Work added successfully!', 'success');
            document.getElementById('addWorkForm').reset();
        } else {
            showToast(result.message || 'Failed to add work', 'error');
        }
    } catch (error) {
        showToast('Failed to add work: ' + error.message, 'error');
    }
}

// ==================== PAGE DATA LOADERS ====================

async function loadUserDashboard() {
    if (!appState.user) return;
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = appState.user.name;
    }
    
    try {
        const result = await callAPI('getleaderworks');
        const container = document.getElementById('userRecentActivities');
        
        if (container && result.success && result.data) {
            const works = Array.isArray(result.data) ? result.data : (result.data.works || []);
            
            if (works.length > 0) {
                container.innerHTML = works.slice(0, 5).map(work => `
                    <div class="activity-card">
                        <h4>${work.title || 'Untitled'}</h4>
                        <p>${(work.description || '').substring(0, 100)}...</p>
                        <small>${formatDate(work.date)}</small>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="no-data">No recent activities</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load activities:', error);
    }
}

async function loadAdminDashboard() {
    if (!appState.isAdmin) return;
    
    try {
        const result = await callAPI('getdashboardstats');
        if (result.success && result.data) {
            const stats = result.data;
            
            const elements = {
                totalLeaders: document.getElementById('totalLeaders'),
                totalMessages: document.getElementById('totalMessages'),
                totalUsers: document.getElementById('totalUsers'),
                pendingDonations: document.getElementById('pendingDonations')
            };
            
            for (const [key, element] of Object.entries(elements)) {
                if (element && stats[key] !== undefined) {
                    element.textContent = stats[key];
                }
            }
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

async function loadLeaders() {
    try {
        const result = await callAPI('getleaders');
        const container = document.getElementById('leadersList');
        
        if (container && result.success && result.data) {
            const leaders = Array.isArray(result.data) ? result.data : (result.data.leaders || []);
            
            if (leaders.length > 0) {
                container.innerHTML = leaders.map(leader => `
                    <div class="leader-card">
                        <div class="leader-avatar">
                            ${(leader.name || '').charAt(0).toUpperCase()}
                        </div>
                        <div class="leader-info">
                            <h3>${leader.name || 'Unknown'}</h3>
                            <p class="leader-role">${leader.role || 'No role'}</p>
                            <p class="leader-desc">${leader.description || 'No description'}</p>
                            <span class="leader-status ${(leader.status || 'active').toLowerCase()}">
                                ${leader.status || 'ACTIVE'}
                            </span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="no-data">No leaders found</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load leaders:', error);
        showToast('Failed to load leaders', 'error');
    }
}

async function loadDonationStatus() {
    if (!appState.user) {
        showToast('Please login to view donations', 'error');
        showPage('userLogin');
        return;
    }
    
    try {
        const result = await callAPI('getdonations', { 
            userId: appState.user.id,
            email: appState.user.email 
        });
        
        const tbody = document.querySelector('#donationTable tbody');
        const statusElement = document.getElementById('currentStatus');
        
        if (result.success && result.data) {
            const donations = Array.isArray(result.data) ? result.data : (result.data.donations || []);
            
            // Update current status
            if (statusElement) {
                const currentMonth = CONFIG.MONTHS[new Date().getMonth()];
                const currentYear = new Date().getFullYear();
                
                const currentDonation = donations.find(d => 
                    d.month === currentMonth && d.year == currentYear
                );
                
                const status = currentDonation?.status || 'Unpaid';
                statusElement.textContent = status;
                statusElement.className = `status-badge ${status.toLowerCase()}`;
            }
            
            // Update table
            if (tbody) {
                if (donations.length > 0) {
                    tbody.innerHTML = donations.map(donation => `
                        <tr>
                            <td>${donation.month || 'N/A'}</td>
                            <td>${donation.year || 'N/A'}</td>
                            <td>$${donation.amount || '0'}</td>
                            <td><span class="status-badge ${(donation.status || 'unpaid').toLowerCase()}">
                                ${donation.status || 'Unpaid'}
                            </span></td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="4" class="no-data">
                                No donation records found
                            </td>
                        </tr>
                    `;
                }
            }
        } else {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="no-data">
                            No donation records available
                        </td>
                    </tr>
                `;
            }
            if (statusElement) {
                statusElement.textContent = 'Unpaid';
                statusElement.className = 'status-badge unpaid';
            }
        }
    } catch (error) {
        console.error('Failed to load donations:', error);
        showToast('Failed to load donations', 'error');
    }
}

async function loadContactPage() {
    if (!appState.user) return;
    
    try {
        const result = await callAPI('getusermessages');
        const container = document.getElementById('userMessages');
        
        if (container && result.success && result.data) {
            const messages = Array.isArray(result.data) ? result.data : (result.data.messages || []);
            
            if (messages.length > 0) {
                container.innerHTML = messages.map(msg => `
                    <div class="message-card">
                        <div class="message-header">
                            <span class="message-date">${formatDate(msg.createdAt)}</span>
                            <span class="message-status ${(msg.status || 'pending').toLowerCase()}">
                                ${msg.status || 'Pending'}
                            </span>
                        </div>
                        <p class="message-content">${msg.message}</p>
                        ${msg.adminReply ? `
                            <div class="message-reply">
                                <strong>Admin Reply:</strong>
                                <p>${msg.adminReply}</p>
                                <small>${formatDate(msg.replyDate)}</small>
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="no-data">No messages yet</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

async function loadMessages() {
    if (!appState.isAdmin) return;
    
    try {
        const result = await callAPI('getmessages');
        const container = document.getElementById('adminMessages');
        
        if (container && result.success && result.data) {
            const messages = Array.isArray(result.data) ? result.data : (result.data.messages || []);
            
            if (messages.length > 0) {
                container.innerHTML = messages.map(msg => `
                    <div class="message-card admin ${(msg.status || 'pending').toLowerCase()}">
                        <div class="message-header">
                            <strong>${msg.userName || 'Unknown'}</strong>
                            <span class="message-date">${formatDate(msg.createdAt)}</span>
                        </div>
                        <p class="message-content">${msg.message}</p>
                        ${msg.adminReply ? `
                            <div class="message-reply">
                                <strong>Your Reply:</strong>
                                <p>${msg.adminReply}</p>
                                <small>${formatDate(msg.replyDate)}</small>
                            </div>
                        ` : `
                            <button class="btn btn-sm btn-primary" 
                                onclick="replyToMessage('${msg.id}')">
                                Reply
                            </button>
                        `}
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="no-data">No messages</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

async function loadManageLeaders() {
    await loadLeaders();
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function logout() {
    // Clear local storage
    clearStorage();
    
    // Update UI
    updateNavigation();
    showPage('homePage');
    showToast('Logged out successfully', 'success');
}

function checkAuthState() {
    if (appState.isAuthenticated) {
        if (appState.isAdmin) {
            showPage('adminDashboard');
        } else {
            showPage('userDashboard');
        }
    } else {
        showPage('homePage');
    }
}

async function testAPIConnection() {
    try {
        const result = await callAPI('ping');
        if (result.success) {
            showToast('Connected to server', 'success', 3000);
        }
    } catch (error) {
        console.log('API test failed:', error);
    }
}

// ==================== MODAL FUNCTIONS ====================

function showAddLeaderModal() {
    const modal = document.getElementById('addLeaderModal');
    if (modal) modal.style.display = 'block';
}

function showEditLeaderModal(leader) {
    const modal = document.getElementById('editLeaderModal');
    if (modal) {
        document.getElementById('editLeaderId').value = leader.id || '';
        document.getElementById('editLeaderName').value = leader.name || '';
        document.getElementById('editLeaderRole').value = leader.role || '';
        document.getElementById('editLeaderDesc').value = leader.description || '';
        document.getElementById('editLeaderStatus').value = leader.status || 'ACTIVE';
        modal.style.display = 'block';
    }
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// ==================== DIRECT URL FUNCTIONS ====================

function setupDatabaseDirect() {
    window.open(CONFIG.API_URL + '?action=setup', '_blank');
    showToast('Opening setup page...', 'info');
}

function addSampleDataDirect() {
    window.open(CONFIG.API_URL + '?action=sampledata', '_blank');
    showToast('Adding sample data...', 'info');
}

// ==================== ADMIN FUNCTIONS ====================

async function replyToMessage(messageId) {
    const reply = prompt('Enter your reply:');
    if (!reply || !reply.trim()) return;
    
    try {
        const result = await callAPI('replytomessage', {
            messageId: messageId,
            reply: reply.trim()
        });
        
        if (result.success) {
            showToast('Reply sent!', 'success');
            loadMessages();
        } else {
            showToast('Failed to send reply', 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// ==================== GLOBAL EXPORTS ====================

window.showPage = showPage;
window.goBack = goBack;
window.showAddLeaderModal = showAddLeaderModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.logout = logout;
window.setupDatabaseDirect = setupDatabaseDirect;
window.addSampleDataDirect = addSampleDataDirect;
window.showEditLeaderModal = showEditLeaderModal;
window.replyToMessage = replyToMessage;
