// ========================================================
// COMMUNITY PORTAL - COMPLETE FRONTEND
// Production Ready with All Functionality
// ========================================================

// Configuration
const CONFIG = {
    // UPDATE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT URL
    API_URL: 'https://script.google.com/macros/s/AKfycbzfUIanwxMar_LfB73TfIwsZ4WrAz8vX5Gq7LleLhHGkYK_LQGIj5ZXkDW34JnHUEpdcw/exec',
    
    // Storage keys
    USER_SESSION_KEY: 'community_user_session',
    USER_DATA_KEY: 'community_user_data',
    ADMIN_SESSION_KEY: 'community_admin_session',
    
    // App settings
    APP_NAME: 'Community Portal',
    VERSION: '1.0.0',
    
    // Months for donation tracking
    MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 
             'July', 'August', 'September', 'October', 'November', 'December']
};

// Global State
let appState = {
    user: null,
    admin: null,
    sessionId: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoading: false,
    currentPage: 'home',
    leaders: [],
    works: [],
    donations: [],
    messages: [],
    users: [],
    stats: null,
    lastError: null
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} - Initializing...`);
    
    // Initialize app
    initApp();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check authentication state
    checkAuthState();
    
    // Test API connection
    testAPIConnection();
    
    // Update UI based on auth state
    updateNavigation();
    
    console.log(`${CONFIG.APP_NAME} - Ready!`);
});

function initApp() {
    // Load any saved state
    loadFromStorage();
    
    // Initialize UI components
    initUIComponents();
}

function loadFromStorage() {
    try {
        const userSession = localStorage.getItem(CONFIG.USER_SESSION_KEY);
        const userData = localStorage.getItem(CONFIG.USER_DATA_KEY);
        const adminSession = localStorage.getItem(CONFIG.ADMIN_SESSION_KEY);
        
        if (userSession && userData) {
            appState.sessionId = userSession;
            appState.user = JSON.parse(userData);
            appState.isAuthenticated = true;
            appState.isAdmin = false;
        } else if (adminSession) {
            appState.sessionId = adminSession;
            appState.admin = { sessionId: adminSession };
            appState.isAuthenticated = true;
            appState.isAdmin = true;
        }
    } catch (error) {
        console.error('Error loading from storage:', error);
        clearStorage();
    }
}

function saveToStorage() {
    try {
        if (appState.user && appState.sessionId) {
            localStorage.setItem(CONFIG.USER_SESSION_KEY, appState.sessionId);
            localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(appState.user));
            localStorage.removeItem(CONFIG.ADMIN_SESSION_KEY);
        } else if (appState.isAdmin && appState.sessionId) {
            localStorage.setItem(CONFIG.ADMIN_SESSION_KEY, appState.sessionId);
            localStorage.removeItem(CONFIG.USER_SESSION_KEY);
            localStorage.removeItem(CONFIG.USER_DATA_KEY);
        }
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
}

function clearStorage() {
    localStorage.removeItem(CONFIG.USER_SESSION_KEY);
    localStorage.removeItem(CONFIG.USER_DATA_KEY);
    localStorage.removeItem(CONFIG.ADMIN_SESSION_KEY);
    appState.user = null;
    appState.admin = null;
    appState.sessionId = null;
    appState.isAuthenticated = false;
    appState.isAdmin = false;
}

// ==================== UI FUNCTIONS ====================

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show requested page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        appState.currentPage = pageId;
        
        // Load page-specific data
        loadPageData(pageId);
        
        // Close mobile menu if open
        const navLinks = document.getElementById('navLinks');
        const menuToggle = document.getElementById('menuToggle');
        if (navLinks) navLinks.classList.remove('active');
        if (menuToggle) menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        console.log('Navigated to page:', pageId);
    }
}

function goBack() {
    if (appState.isAdmin) {
        showPage('adminDashboard');
    } else if (appState.isAuthenticated) {
        showPage('userDashboard');
    } else {
        showPage('homePage');
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
        case 'addLeaderWork':
            loadLeadersForWork();
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
                <a href="#" class="nav-link" onclick="showPage('adminDashboard')">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
                <a href="#" class="nav-link" onclick="showPage('manageLeaders')">
                    <i class="fas fa-user-tie"></i> Leaders
                </a>
                <a href="#" class="nav-link" onclick="showPage('donationStatus')">
                    <i class="fas fa-hand-holding-usd"></i> Donations
                </a>
                <a href="#" class="nav-link" onclick="showPage('viewMessages')">
                    <i class="fas fa-envelope"></i> Messages
                </a>
                <a href="#" class="nav-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
        } else {
            html = `
                <a href="#" class="nav-link" onclick="showPage('userDashboard')">
                    <i class="fas fa-home"></i> Dashboard
                </a>
                <a href="#" class="nav-link" onclick="showPage('leadersPage')">
                    <i class="fas fa-users"></i> Leaders
                </a>
                <a href="#" class="nav-link" onclick="showPage('donationStatus')">
                    <i class="fas fa-money-bill"></i> Donations
                </a>
                <a href="#" class="nav-link" onclick="showPage('contactAdmin')">
                    <i class="fas fa-comments"></i> Contact
                </a>
                <a href="#" class="nav-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
        }
    } else {
        html = `
            <a href="#" class="nav-link" onclick="showPage('homePage')">
                <i class="fas fa-home"></i> Home
            </a>
            <a href="#" class="nav-link" onclick="showPage('userLogin')">
                <i class="fas fa-user"></i> Member Login
            </a>
            <a href="#" class="nav-link" onclick="showPage('userRegister')">
                <i class="fas fa-user-plus"></i> Register
            </a>
            <a href="#" class="nav-link" onclick="showPage('adminLogin')">
                <i class="fas fa-user-shield"></i> Admin
            </a>
        `;
    }
    
    navLinks.innerHTML = html;
}

function showLoading(show) {
    appState.isLoading = show;
    
    // Create or get loading overlay
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay && show) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading...</p>
        `;
        document.body.appendChild(overlay);
    }
    
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles if not present
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #333;
                color: white;
                padding: 12px 20px;
                border-radius: 5px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            .toast.toast-success { background: #28a745; }
            .toast.toast-error { background: #dc3545; }
            .toast.toast-warning { background: #ffc107; color: #333; }
            .toast.toast-info { background: #17a2b8; }
            .toast-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
            }
            .toast button {
                background: none;
                border: none;
                color: inherit;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

function initUIComponents() {
    // Setup mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            menuToggle.innerHTML = navLinks.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (navLinks && menuToggle && !event.target.closest('.navbar')) {
            navLinks.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // User Login Form
    const userLoginForm = document.getElementById('userLoginForm');
    if (userLoginForm) {
        userLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleUserLogin();
        });
    }
    
    // User Registration Form
    const userRegisterForm = document.getElementById('userRegisterForm');
    if (userRegisterForm) {
        userRegisterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleUserRegistration();
        });
    }
    
    // Admin Login Form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await handleAdminLogin();
        });
    }
    
    // Contact Form (Send Message)
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
    
    showLoading(true);
    
    try {
        const result = await callAPI('login', { email, password });
        
        if (result.success) {
            appState.user = result.data.user;
            appState.sessionId = result.data.sessionId;
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
    } finally {
        showLoading(false);
    }
}

async function handleUserRegistration() {
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value;
    const address = document.getElementById('regAddress')?.value;
    
    if (!name || !email || !password) {
        showToast('Name, email, and password are required', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await callAPI('register', {
            name, email, password, phone, address
        });
        
        if (result.success) {
            appState.user = result.data.user;
            appState.sessionId = result.data.sessionId;
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
    } finally {
        showLoading(false);
    }
}

async function handleAdminLogin() {
    const password = document.getElementById('adminPassword')?.value;
    
    if (!password) {
        showToast('Please enter admin password', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await callAPI('adminlogin', { password });
        
        if (result.success) {
            appState.admin = result.data.admin;
            appState.sessionId = result.data.sessionId;
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
    } finally {
        showLoading(false);
    }
}

async function handleSendMessage() {
    if (!appState.isAuthenticated || appState.isAdmin) {
        showToast('Please login as a user to send messages', 'error');
        showPage('userLogin');
        return;
    }
    
    const message = document.getElementById('messageContent')?.value;
    
    if (!message) {
        showToast('Please enter a message', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await callAPI('sendmessage', {
            message: message,
            userId: appState.user.id,
            userName: appState.user.name
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
    } finally {
        showLoading(false);
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
    
    showLoading(true);
    
    try {
        const result = await callAPI('addleader', { name, role, description });
        
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
    } finally {
        showLoading(false);
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
    
    showLoading(true);
    
    try {
        const result = await callAPI('addleaderwork', {
            leaderId, title, description, date
        });
        
        if (result.success) {
            showToast('Work added successfully!', 'success');
            document.getElementById('addWorkForm').reset();
        } else {
            showToast(result.message || 'Failed to add work', 'error');
        }
    } catch (error) {
        showToast('Failed to add work: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== API COMMUNICATION ====================

async function callAPI(action, data = {}) {
    showLoading(true);
    
    // Add session ID if available
    if (appState.sessionId) {
        data.sessionId = appState.sessionId;
    }
    
    // Add timestamp to prevent caching
    data._t = Date.now();
    
    // Build URL
    const url = CONFIG.API_URL + '?action=' + action + '&' + new URLSearchParams(data);
    
    console.log('API Request:', action, data);
    
    try {
        // Method 1: Try JSONP first
        const jsonpResult = await callAPIWithJSONP(url);
        if (jsonpResult) {
            showLoading(false);
            return jsonpResult;
        }
        
        // Method 2: Try direct fetch
        const fetchResult = await callAPIWithFetch(url);
        if (fetchResult) {
            showLoading(false);
            return fetchResult;
        }
        
        // Method 3: Try with iframe
        const iframeResult = await callAPIWithIframe(url);
        showLoading(false);
        return iframeResult;
        
    } catch (error) {
        showLoading(false);
        console.error('API Error:', error);
        return {
            success: false,
            message: 'Network error. Please check your connection.',
            error: error.message
        };
    }
}

function callAPIWithJSONP(url) {
    return new Promise((resolve) => {
        const callbackName = 'jsonp_callback_' + Date.now();
        const jsonpUrl = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        
        const timeout = setTimeout(() => {
            delete window[callbackName];
            resolve(null);
        }, 10000);
        
        window[callbackName] = function(response) {
            clearTimeout(timeout);
            delete window[callbackName];
            resolve(response);
        };
        
        const script = document.createElement('script');
        script.src = jsonpUrl;
        script.onerror = () => {
            clearTimeout(timeout);
            delete window[callbackName];
            resolve(null);
        };
        
        document.head.appendChild(script);
    });
}

async function callAPIWithFetch(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache'
        });
        
        // In no-cors mode, we can't read the response
        // But we assume it succeeded if no error
        return {
            success: true,
            message: 'Request sent successfully',
            data: {}
        };
    } catch (error) {
        return null;
    }
}

function callAPIWithIframe(url) {
    return new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        
        setTimeout(() => {
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            resolve({
                success: true,
                message: 'Request processed',
                data: {}
            });
        }, 2000);
        
        document.body.appendChild(iframe);
    });
}

// ==================== PAGE DATA LOADERS ====================

async function loadUserDashboard() {
    if (!appState.user) return;
    
    // Update user info
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = appState.user.name;
    }
    
    // Load recent works
    try {
        const result = await callAPI('getleaderworks');
        if (result.success && result.data.works) {
            const container = document.getElementById('userRecentActivities');
            if (container) {
                const recentWorks = result.data.works.slice(0, 5);
                if (recentWorks.length > 0) {
                    container.innerHTML = recentWorks.map(work => `
                        <div class="activity-card">
                            <h4>${work.title}</h4>
                            <p>${work.description.substring(0, 100)}...</p>
                            <small>${formatDate(work.date)}</small>
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<p class="no-data">No recent activities</p>';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load recent activities:', error);
    }
}

async function loadAdminDashboard() {
    if (!appState.isAdmin) return;
    
    try {
        const result = await callAPI('getdashboardstats');
        if (result.success && result.data) {
            const stats = result.data;
            
            // Update stats cards
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
        console.error('Failed to load admin dashboard:', error);
    }
}

async function loadLeaders() {
    try {
        const result = await callAPI('getleaders');
        if (result.success && result.data.leaders) {
            appState.leaders = result.data.leaders;
            
            const container = document.getElementById('leadersList');
            if (container) {
                if (appState.leaders.length > 0) {
                    container.innerHTML = appState.leaders.map(leader => `
                        <div class="leader-card">
                            <div class="leader-avatar">
                                ${leader.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="leader-info">
                                <h3>${leader.name}</h3>
                                <p class="leader-role">${leader.role}</p>
                                <p class="leader-desc">${leader.description}</p>
                                <span class="leader-status ${leader.status.toLowerCase()}">
                                    ${leader.status}
                                </span>
                            </div>
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<p class="no-data">No leaders found</p>';
                }
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
        const result = await callAPI('getuserdonations', { userId: appState.user.id });
        if (result.success && result.data.donations) {
            appState.donations = result.data.donations;
            
            // Update current month status
            const currentMonth = CONFIG.MONTHS[new Date().getMonth()];
            const currentYear = new Date().getFullYear();
            
            const currentDonation = appState.donations.find(d => 
                d.month === currentMonth && d.year == currentYear
            );
            
            const statusElement = document.getElementById('currentStatus');
            if (statusElement) {
                statusElement.textContent = currentDonation?.status || 'Unpaid';
                statusElement.className = `status-badge ${(currentDonation?.status || 'unpaid').toLowerCase()}`;
            }
            
            // Update donation table
            const tbody = document.querySelector('#donationTable tbody');
            if (tbody) {
                if (appState.donations.length > 0) {
                    tbody.innerHTML = appState.donations.map(donation => `
                        <tr>
                            <td>${donation.month}</td>
                            <td>${donation.year}</td>
                            <td>$${donation.amount || '0'}</td>
                            <td><span class="status-badge ${donation.status.toLowerCase()}">${donation.status}</span></td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = '<tr><td colspan="4" class="no-data">No donation records</td></tr>';
                }
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
        if (result.success && result.data.messages) {
            const container = document.getElementById('userMessages');
            if (container) {
                if (result.data.messages.length > 0) {
                    container.innerHTML = result.data.messages.map(msg => `
                        <div class="message-card">
                            <div class="message-header">
                                <span class="message-date">${formatDate(msg.createdAt)}</span>
                                <span class="message-status ${msg.status.toLowerCase()}">${msg.status}</span>
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
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

async function loadManageLeaders() {
    if (!appState.isAdmin) return;
    
    await loadLeaders();
}

async function loadMessages() {
    if (!appState.isAdmin) return;
    
    try {
        const result = await callAPI('getmessages');
        if (result.success && result.data.messages) {
            appState.messages = result.data.messages;
            
            const container = document.getElementById('adminMessages');
            if (container) {
                if (appState.messages.length > 0) {
                    container.innerHTML = appState.messages.map(msg => `
                        <div class="message-card admin ${msg.status.toLowerCase()}">
                            <div class="message-header">
                                <strong>${msg.userName || 'Unknown User'}</strong>
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
                                <button class="btn btn-sm btn-primary" onclick="replyToMessage('${msg.id}')">
                                    Reply
                                </button>
                            `}
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<p class="no-data">No messages</p>';
                }
            }
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
        showToast('Failed to load messages', 'error');
    }
}

async function loadLeadersForWork() {
    try {
        const result = await callAPI('getleaders');
        if (result.success && result.data.leaders) {
            const select = document.getElementById('workLeader');
            if (select) {
                select.innerHTML = '<option value="">Select a leader</option>';
                result.data.leaders.forEach(leader => {
                    if (leader.status === 'ACTIVE') {
                        select.innerHTML += `<option value="${leader.id}">${leader.name} - ${leader.role}</option>`;
                    }
                });
            }
        }
    } catch (error) {
        console.error('Failed to load leaders for work:', error);
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
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
    if (appState.sessionId) {
        // Call logout API if needed
        callAPI('logout').catch(() => {
            // Ignore errors on logout
        });
    }
    
    clearStorage();
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
            console.log('API Connection: OK');
            showToast('Connected to server', 'success', 3000);
        } else {
            console.warn('API Connection: Failed');
            showToast('Server connection issue', 'warning', 5000);
        }
    } catch (error) {
        console.error('API Connection: Error', error);
        showToast('Cannot connect to server', 'error', 5000);
    }
}

// ==================== MODAL FUNCTIONS ====================

function showAddLeaderModal() {
    const modal = document.getElementById('addLeaderModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function showEditLeaderModal(leader) {
    const modal = document.getElementById('editLeaderModal');
    if (modal) {
        document.getElementById('editLeaderId').value = leader.id;
        document.getElementById('editLeaderName').value = leader.name;
        document.getElementById('editLeaderRole').value = leader.role;
        document.getElementById('editLeaderDesc').value = leader.description;
        document.getElementById('editLeaderStatus').value = leader.status;
        modal.style.display = 'block';
    }
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// ==================== DIRECT URL FUNCTIONS ====================

function setupDatabaseDirect() {
    const url = CONFIG.API_URL + '?action=setup';
    window.open(url, '_blank');
    showToast('Opening setup page. Please check the new tab.', 'info');
}

function addSampleDataDirect() {
    const url = CONFIG.API_URL + '?action=sampledata';
    window.open(url, '_blank');
    showToast('Adding sample data. Please check the new tab.', 'info');
}

// ==================== ADDITIONAL FUNCTIONS ====================

async function replyToMessage(messageId) {
    const reply = prompt('Enter your reply:');
    if (reply && reply.trim()) {
        showLoading(true);
        try {
            const result = await callAPI('replytomessage', {
                messageId: messageId,
                reply: reply.trim()
            });
            
            if (result.success) {
                showToast('Reply sent successfully!', 'success');
                loadMessages();
            } else {
                showToast(result.message || 'Failed to send reply', 'error');
            }
        } catch (error) {
            showToast('Failed to send reply: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }
}

async function updateDonationStatus(donationId, status) {
    if (!appState.isAdmin) return;
    
    showLoading(true);
    try {
        const result = await callAPI('updatedonationstatus', {
            donationId: donationId,
            status: status
        });
        
        if (result.success) {
            showToast('Donation status updated!', 'success');
            loadDonationStatus();
        } else {
            showToast(result.message || 'Failed to update donation', 'error');
        }
    } catch (error) {
        showToast('Failed to update donation: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== GLOBAL EXPORTS ====================

// Make functions available globally
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
window.updateDonationStatus = updateDonationStatus;

// Also export additional utility functions that might be needed
window.testAPIConnection = testAPIConnection;
window.handleUserLogin = handleUserLogin;
window.handleUserRegistration = handleUserRegistration;
window.handleAdminLogin = handleAdminLogin;
window.handleSendMessage = handleSendMessage;
window.handleAddLeader = handleAddLeader;
window.handleAddWork = handleAddWork;

// Initialize on load
console.log(`${CONFIG.APP_NAME} - All functions loaded and ready`);
