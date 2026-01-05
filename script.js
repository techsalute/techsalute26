// ====================================================
// Community Portal - Complete Frontend JavaScript
// Error Handled & CORS Compatible
// ====================================================

// Configuration
const CONFIG = {
    // Update this with your deployed Google Apps Script URL
    API_URL: 'https://script.google.com/macros/s/AKfycby8hpVGuhAsOaIFWnzCTwiFm-qe8J5jgSSNtX9-2DC-nuLM2yKO8wMw8udKbwxU-Po_/exec',
    
    // Storage keys
    USER_KEY: 'community_portal_user',
    ADMIN_KEY: 'community_portal_admin',
    SESSION_KEY: 'community_session',
    
    // Months for donation tracking
    MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 
             'July', 'August', 'September', 'October', 'November', 'December'],
    
    // API Timeout (seconds)
    TIMEOUT: 30
};

// Application State
let appState = {
    user: null,
    isAdmin: false,
    isLoading: false,
    lastError: null,
    apiCalls: 0
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Community Portal Initializing...');
    
    // Initialize app
    initApp();
    
    // Setup event listeners
    setupEventListeners();
    
    // Check initial state
    checkAuthState();
    
    // Test API connection
    testAPIConnection();
    
    console.log('Community Portal Ready!');
});

function initApp() {
    // Load saved state
    const savedUser = localStorage.getItem(CONFIG.USER_KEY);
    const savedAdmin = localStorage.getItem(CONFIG.ADMIN_KEY);
    
    if (savedUser) {
        try {
            appState.user = JSON.parse(savedUser);
            updateUIForUser();
        } catch (e) {
            localStorage.removeItem(CONFIG.USER_KEY);
        }
    }
    
    if (savedAdmin === 'true') {
        appState.isAdmin = true;
        updateUIForAdmin();
    }
    
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
        if (!event.target.closest('.navbar')) {
            if (navLinks) navLinks.classList.remove('active');
            if (menuToggle) menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
}

// ==================== API COMMUNICATION ====================

async function callAPI(action, params = {}, method = 'GET') {
    appState.apiCalls++;
    appState.lastError = null;
    
    showLoading(true);
    
    // Add timestamp to prevent caching
    params._t = Date.now();
    params.action = action;
    
    try {
        console.log(`API Call #${appState.apiCalls}:`, action, params);
        
        // Method 1: Try JSONP first (most reliable for Google Apps Script)
        const jsonpResult = await callAPI_JSONP(action, params);
        if (jsonpResult) {
            showLoading(false);
            return jsonpResult;
        }
        
        // Method 2: Try direct fetch with GET
        const getResult = await callAPI_GET(action, params);
        if (getResult) {
            showLoading(false);
            return getResult;
        }
        
        // Method 3: Try with CORS proxy
        const proxyResult = await callAPI_Proxy(action, params);
        if (proxyResult) {
            showLoading(false);
            return proxyResult;
        }
        
        throw new Error('All API methods failed');
        
    } catch (error) {
        console.error('API Error for action', action, ':', error);
        appState.lastError = error.message;
        
        showLoading(false);
        
        return {
            success: false,
            message: 'Unable to connect to server. Please try again.',
            error: error.message,
            action: action
        };
    }
}

// Method 1: JSONP - Most reliable for Google Apps Script
function callAPI_JSONP(action, params) {
    return new Promise((resolve) => {
        const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
        params.callback = callbackName;
        
        const url = CONFIG.API_URL + '?' + new URLSearchParams(params).toString();
        
        console.log('Trying JSONP:', url);
        
        // Set timeout
        const timeout = setTimeout(() => {
            window[callbackName] = null;
            resolve(null);
        }, CONFIG.TIMEOUT * 1000);
        
        // Create callback function
        window[callbackName] = function(response) {
            clearTimeout(timeout);
            window[callbackName] = null;
            
            console.log('JSONP Response:', response);
            
            if (response && typeof response === 'object') {
                resolve(response);
            } else {
                resolve(null);
            }
        };
        
        // Create and inject script
        const script = document.createElement('script');
        script.src = url;
        script.onerror = () => {
            clearTimeout(timeout);
            window[callbackName] = null;
            resolve(null);
        };
        
        document.head.appendChild(script);
        
        // Remove script after load
        setTimeout(() => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        }, 1000);
    });
}

// Method 2: Direct GET request
async function callAPI_GET(action, params) {
    try {
        const url = CONFIG.API_URL + '?' + new URLSearchParams(params).toString();
        
        console.log('Trying GET:', url);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.TIMEOUT * 1000);
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const text = await response.text();
        
        // Try to parse as JSON
        try {
            return JSON.parse(text);
        } catch (parseError) {
            // Might be JSONP response
            const jsonpMatch = text.match(/^\w+\((.*)\)$/);
            if (jsonpMatch) {
                return JSON.parse(jsonpMatch[1]);
            }
            throw new Error('Invalid response format');
        }
        
    } catch (error) {
        console.log('GET method failed:', error.message);
        return null;
    }
}

// Method 3: CORS Proxy
async function callAPI_Proxy(action, params) {
    try {
        // Try multiple CORS proxies
        const proxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://corsproxy.io/?'
        ];
        
        const targetUrl = CONFIG.API_URL + '?' + new URLSearchParams(params).toString();
        
        for (const proxy of proxies) {
            try {
                console.log('Trying proxy:', proxy);
                
                const proxyUrl = proxy + encodeURIComponent(targetUrl);
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                clearTimeout(timeout);
                
                if (response.ok) {
                    const result = await response.json();
                    return result;
                }
            } catch (proxyError) {
                console.log(`Proxy ${proxy} failed:`, proxyError.message);
                continue;
            }
        }
        
        return null;
        
    } catch (error) {
        console.log('All proxies failed');
        return null;
    }
}

// ==================== UI HELPER FUNCTIONS ====================

function showLoading(show) {
    appState.isLoading = show;
    
    // Create or get loading overlay
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay && show) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
        document.body.appendChild(overlay);
        
        // Add CSS if not present
        if (!document.querySelector('#loading-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-styles';
            style.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.9);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                    backdrop-filter: blur(2px);
                }
                .loading-content {
                    text-align: center;
                }
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #4361ee;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
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
            <i class="toast-icon ${getToastIcon(type)}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Add CSS if not present
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 15px 20px;
                min-width: 300px;
                max-width: 400px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                border-left: 4px solid;
            }
            .toast-success {
                border-left-color: #28a745;
            }
            .toast-error {
                border-left-color: #dc3545;
            }
            .toast-warning {
                border-left-color: #ffc107;
            }
            .toast-info {
                border-left-color: #17a2b8;
            }
            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .toast-icon {
                font-size: 20px;
            }
            .toast-success .toast-icon {
                color: #28a745;
            }
            .toast-error .toast-icon {
                color: #dc3545;
            }
            .toast-warning .toast-icon {
                color: #ffc107;
            }
            .toast-info .toast-icon {
                color: #17a2b8;
            }
            .toast-message {
                flex: 1;
                font-size: 14px;
            }
            .toast-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'fas fa-check-circle';
        case 'error': return 'fas fa-exclamation-circle';
        case 'warning': return 'fas fa-exclamation-triangle';
        default: return 'fas fa-info-circle';
    }
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show requested page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        
        // Load page data
        loadPageData(pageId);
        
        // Close mobile menu
        const navLinks = document.getElementById('navLinks');
        const menuToggle = document.getElementById('menuToggle');
        if (navLinks) navLinks.classList.remove('active');
        if (menuToggle) menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        
        // Scroll to top
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

// ==================== AUTHENTICATION ====================

function checkAuthState() {
    const user = localStorage.getItem(CONFIG.USER_KEY);
    const admin = localStorage.getItem(CONFIG.ADMIN_KEY);
    
    updateNavigation(user ? 'user' : (admin ? 'admin' : 'guest'));
    
    if (user) {
        try {
            appState.user = JSON.parse(user);
            showPage('userDashboard');
        } catch (e) {
            localStorage.removeItem(CONFIG.USER_KEY);
            showPage('homePage');
        }
    } else if (admin) {
        appState.isAdmin = true;
        showPage('adminDashboard');
    } else {
        showPage('homePage');
    }
}

function updateNavigation(role) {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    
    let html = '';
    
    switch(role) {
        case 'user':
            html = `
                <a href="#" class="nav-link" onclick="showPage('userDashboard')">
                    <i class="fas fa-home"></i> Dashboard
                </a>
                <a href="#" class="nav-link" onclick="showPage('leadersPage')">
                    <i class="fas fa-users"></i> Leaders
                </a>
                <a href="#" class="nav-link" onclick="showPage('donationStatus')">
                    <i class="fas fa-hand-holding-usd"></i> Donations
                </a>
                <a href="#" class="nav-link" onclick="showPage('contactAdmin')">
                    <i class="fas fa-envelope"></i> Contact
                </a>
                <a href="#" class="nav-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
            break;
            
        case 'admin':
            html = `
                <a href="#" class="nav-link" onclick="showPage('adminDashboard')">
                    <i class="fas fa-home"></i> Dashboard
                </a>
                <a href="#" class="nav-link" onclick="showPage('manageLeaders')">
                    <i class="fas fa-user-tie"></i> Leaders
                </a>
                <a href="#" class="nav-link" onclick="showPage('donationStatus')">
                    <i class="fas fa-money-bill"></i> Donations
                </a>
                <a href="#" class="nav-link" onclick="showPage('viewMessages')">
                    <i class="fas fa-inbox"></i> Messages
                </a>
                <a href="#" class="nav-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
            break;
            
        default:
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

function updateUIForUser() {
    const userName = document.getElementById('userName');
    if (userName && appState.user) {
        userName.textContent = appState.user.name;
    }
}

function updateUIForAdmin() {
    // Admin-specific UI updates
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
}

// ==================== FORM HANDLERS ====================

async function handleUserLogin() {
    const email = document.getElementById('userEmail')?.value;
    const password = document.getElementById('userPassword')?.value;
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    const result = await callAPI('login', { email, password });
    
    if (result.success) {
        appState.user = result.user;
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(result.user));
        updateNavigation('user');
        updateUIForUser();
        showPage('userDashboard');
        showToast('Login successful!', 'success');
    } else {
        showToast(result.message || 'Login failed', 'error');
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
    
    const result = await callAPI('register', {
        name, email, password, phone, address
    });
    
    if (result.success) {
        showToast('Registration successful! Please login.', 'success');
        showPage('userLogin');
        // Clear form
        const form = document.getElementById('userRegisterForm');
        if (form) form.reset();
    } else {
        showToast(result.message || 'Registration failed', 'error');
    }
}

async function handleAdminLogin() {
    const password = document.getElementById('adminPassword')?.value;
    
    if (!password) {
        showToast('Please enter admin password', 'error');
        return;
    }
    
    const result = await callAPI('adminlogin', { password });
    
    if (result.success) {
        appState.isAdmin = true;
        localStorage.setItem(CONFIG.ADMIN_KEY, 'true');
        updateNavigation('admin');
        showPage('adminDashboard');
        showToast('Admin login successful!', 'success');
    } else {
        showToast(result.message || 'Admin login failed', 'error');
    }
}

async function handleSendMessage() {
    if (!appState.user) {
        showToast('Please login to send messages', 'error');
        showPage('userLogin');
        return;
    }
    
    const message = document.getElementById('messageContent')?.value;
    
    if (!message) {
        showToast('Please enter a message', 'error');
        return;
    }
    
    const result = await callAPI('sendmessage', {
        userId: appState.user.id,
        userName: appState.user.name,
        message: message
    });
    
    if (result.success) {
        showToast('Message sent successfully!', 'success');
        const form = document.getElementById('messageForm');
        if (form) form.reset();
        // Refresh messages
        loadContactPage();
    } else {
        showToast(result.message || 'Failed to send message', 'error');
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
    
    const result = await callAPI('addleader', { name, role, description });
    
    if (result.success) {
        showToast('Leader added successfully!', 'success');
        const form = document.getElementById('addLeaderForm');
        if (form) form.reset();
        // Refresh leaders list
        loadManageLeaders();
        // Close modal if exists
        const modal = document.getElementById('addLeaderModal');
        if (modal) modal.style.display = 'none';
    } else {
        showToast(result.message || 'Failed to add leader', 'error');
    }
}

// ==================== PAGE LOADERS ====================

async function loadUserDashboard() {
    if (!appState.user) return;
    
    // Load user info
    updateUIForUser();
    
    // Load recent activities
    const result = await callAPI('getleaderworks', { limit: 5 });
    
    if (result.success && result.works) {
        const container = document.getElementById('userRecentActivities');
        if (container) {
            if (result.works.length === 0) {
                container.innerHTML = '<p class="no-data">No recent activities found.</p>';
            } else {
                container.innerHTML = result.works.map(work => `
                    <div class="activity-card">
                        <h4>${work.title}</h4>
                        <p>${work.description.substring(0, 100)}${work.description.length > 100 ? '...' : ''}</p>
                        <small>${formatDate(work.date)}</small>
                    </div>
                `).join('');
            }
        }
    }
}

async function loadAdminDashboard() {
    if (!appState.isAdmin) return;
    
    // Load stats
    const leaders = await callAPI('getleaders');
    const messages = await callAPI('getmessages');
    const users = await callAPI('getusers');
    
    // Update stats
    if (leaders.success) {
        const element = document.getElementById('totalLeaders');
        if (element) element.textContent = leaders.count || 0;
    }
    
    if (messages.success) {
        const element = document.getElementById('totalMessages');
        if (element) {
            const unread = messages.messages?.filter(m => m.status === 'Unread').length || 0;
            element.textContent = unread;
        }
    }
    
    if (users.success) {
        const element = document.getElementById('totalUsers');
        if (element) element.textContent = users.count || 0;
    }
}

async function loadLeaders() {
    const result = await callAPI('getleaders');
    
    const container = document.getElementById('leadersList');
    if (!container) return;
    
    if (result.success && result.leaders) {
        if (result.leaders.length === 0) {
            container.innerHTML = '<p class="no-data">No leaders found.</p>';
        } else {
            container.innerHTML = result.leaders.map(leader => `
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
        }
    } else {
        container.innerHTML = `<p class="error">Error loading leaders: ${result.message}</p>`;
    }
}

async function loadDonationStatus() {
    if (!appState.user) {
        showToast('Please login to view donations', 'error');
        showPage('userLogin');
        return;
    }
    
    const result = await callAPI('getdonations', { userId: appState.user.id });
    
    if (result.success && result.donations) {
        // Update current month status
        const currentMonth = CONFIG.MONTHS[new Date().getMonth()];
        const currentYear = new Date().getFullYear();
        
        const currentDonation = result.donations.find(d => 
            d.month === currentMonth && d.year == currentYear
        );
        
        const statusElement = document.getElementById('currentStatus');
        if (statusElement) {
            statusElement.className = `status-badge ${currentDonation?.status?.toLowerCase() || 'unpaid'}`;
            statusElement.textContent = currentDonation?.status || 'Unpaid';
        }
        
        // Update table
        const tbody = document.querySelector('#donationTable tbody');
        if (tbody) {
            if (result.donations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="no-data">No donation records found.</td></tr>';
            } else {
                tbody.innerHTML = result.donations.map(donation => `
                    <tr>
                        <td>${donation.month}</td>
                        <td>${donation.year}</td>
                        <td>${donation.amount || 'N/A'}</td>
                        <td><span class="status-badge ${donation.status.toLowerCase()}">${donation.status}</span></td>
                    </tr>
                `).join('');
            }
        }
    }
}

async function loadContactPage() {
    if (!appState.user) return;
    
    // Load previous messages
    const result = await callAPI('getmessages');
    
    const container = document.getElementById('userMessages');
    if (!container) return;
    
    if (result.success && result.messages) {
        const userMessages = result.messages.filter(m => m.userId === appState.user.id);
        
        if (userMessages.length === 0) {
            container.innerHTML = '<p class="no-data">No previous messages.</p>';
        } else {
            container.innerHTML = userMessages.map(msg => `
                <div class="message-card ${msg.status.toLowerCase()}">
                    <div class="message-header">
                        <span class="message-date">${formatDate(msg.createdAt)}</span>
                        <span class="message-status">${msg.status}</span>
                    </div>
                    <p class="message-content">${msg.message}</p>
                </div>
            `).join('');
        }
    }
}

async function loadManageLeaders() {
    if (!appState.isAdmin) return;
    
    await loadLeaders();
}

async function loadMessages() {
    if (!appState.isAdmin) return;
    
    const result = await callAPI('getmessages');
    
    const container = document.getElementById('adminMessages');
    if (!container) return;
    
    if (result.success && result.messages) {
        if (result.messages.length === 0) {
            container.innerHTML = '<p class="no-data">No messages received.</p>';
        } else {
            container.innerHTML = result.messages.map(msg => `
                <div class="message-card admin ${msg.status.toLowerCase()}">
                    <div class="message-header">
                        <strong>${msg.userName || 'Unknown User'}</strong>
                        <span class="message-date">${formatDate(msg.createdAt)}</span>
                    </div>
                    <p class="message-content">${msg.message}</p>
                    <div class="message-footer">
                        <span class="user-id">User ID: ${msg.userId}</span>
                        <span class="message-status">${msg.status}</span>
                    </div>
                </div>
            `).join('');
        }
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
    } catch (e) {
        return dateString;
    }
}

function logout() {
    appState.user = null;
    appState.isAdmin = false;
    
    localStorage.removeItem(CONFIG.USER_KEY);
    localStorage.removeItem(CONFIG.ADMIN_KEY);
    
    updateNavigation('guest');
    showPage('homePage');
    showToast('Logged out successfully', 'success');
}

function goBack() {
    if (appState.isAdmin) {
        showPage('adminDashboard');
    } else if (appState.user) {
        showPage('userDashboard');
    } else {
        showPage('homePage');
    }
}

async function testAPIConnection() {
    console.log('Testing API connection...');
    
    const result = await callAPI('ping');
    
    if (result.success) {
        console.log('API connection successful!');
        // Show welcome message for first time
        if (!localStorage.getItem('welcome_shown')) {
            showToast('Welcome to Community Portal! API connected successfully.', 'success');
            localStorage.setItem('welcome_shown', 'true');
        }
    } else {
        console.warn('API connection failed:', result.message);
        showToast('Warning: Cannot connect to server. Some features may not work.', 'warning');
    }
}

// ==================== INITIAL SETUP ====================

// Auto-setup database on first run (optional)
async function initializeDatabase() {
    if (!localStorage.getItem('db_initialized')) {
        const setup = confirm('Welcome! Would you like to setup the database?');
        if (setup) {
            const result = await callAPI('setup');
            if (result.success) {
                showToast('Database setup complete!', 'success');
                localStorage.setItem('db_initialized', 'true');
                
                // Add sample data
                const addData = confirm('Add sample data for testing?');
                if (addData) {
                    await callAPI('sampledata');
                    showToast('Sample data added!', 'success');
                }
            }
        }
    }
}

// Call initialization after page loads
setTimeout(() => {
    initializeDatabase();
}, 2000);
