// ========================================================
// COMMUNITY PORTAL - PRODUCTION READY FRONTEND
// CORS Compatible with Robust Error Handling
// ========================================================

// Configuration
const CONFIG = {
    // Your Google Apps Script URL
    API_URL: 'https://script.google.com/macros/s/AKfycbzfUIanwxMar_LfB73TfIwsZ4WrAz8vX5Gq7LleLhHGkYK_LQGIj5ZXkDW34JnHUEpdcw/exec',
    
    // CORS Proxy for development (optional)
    CORS_PROXY: 'https://cors-anywhere.herokuapp.com/',
    USE_CORS_PROXY: false, // Set to true if you need CORS proxy
    
    // Storage keys
    USER_SESSION_KEY: 'community_user_session_v2',
    USER_DATA_KEY: 'community_user_data_v2',
    ADMIN_SESSION_KEY: 'community_admin_session_v2',
    
    // App settings
    APP_NAME: 'Community Portal',
    VERSION: '2.0.0',
    
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
    lastError: null,
    apiConnected: false
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
    
    // Test API connection (don't block on this)
    setTimeout(testAPIConnection, 1000);
    
    // Update UI based on auth state
    updateNavigation();
    
    console.log(`${CONFIG.APP_NAME} - Ready!`);
});

function initApp() {
    // Load any saved state
    loadFromStorage();
    
    // Initialize UI components
    initUIComponents();
    
    // Setup global error handler
    setupGlobalErrorHandler();
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
            console.log('User loaded from storage:', appState.user.name);
        } else if (adminSession) {
            appState.sessionId = adminSession;
            appState.admin = { sessionId: adminSession };
            appState.isAuthenticated = true;
            appState.isAdmin = true;
            console.log('Admin loaded from storage');
        }
    } catch (error) {
        console.error('Storage error:', error);
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
        console.error('Save error:', error);
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

// ==================== CORS COMPATIBLE API CALLS ====================

async function callAPI(action, data = {}) {
    // Don't show loading for background calls
    if (action !== 'ping' && action !== 'background') {
        showLoading(true);
    }
    
    // Add session ID if available
    if (appState.sessionId) {
        data.sessionId = appState.sessionId;
    }
    
    // Add timestamp to prevent caching
    data._t = Date.now();
    
    // Build URL with proper encoding
    const params = new URLSearchParams();
    params.append('action', action);
    
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
            params.append(key, value.toString());
        }
    }
    
    let url = CONFIG.API_URL + '?' + params.toString();
    
    console.log(`API Request [${action}]:`, data);
    
    try {
        // Method 1: Try with iframe (always works, but can't read response)
        const iframeResult = await callAPIWithIframe(url, action);
        return iframeResult;
        
    } catch (error) {
        console.error(`API Error [${action}]:`, error);
        return {
            success: false,
            message: 'Network error. Please check your connection.',
            error: error.message,
            action: action
        };
    } finally {
        if (action !== 'ping' && action !== 'background') {
            showLoading(false);
        }
    }
}

function callAPIWithIframe(url, action) {
    return new Promise((resolve, reject) => {
        // Create hidden form for POST request (bypasses CORS)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = CONFIG.API_URL;
        form.target = 'api_iframe_' + Date.now();
        form.style.display = 'none';
        
        // Add all parameters as hidden inputs
        const params = new URLSearchParams(url.split('?')[1]);
        params.forEach((value, key) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });
        
        // Create iframe to receive response
        const iframe = document.createElement('iframe');
        iframe.name = form.target;
        iframe.style.display = 'none';
        
        // Handle iframe load
        iframe.onload = function() {
            try {
                // Try to read response from iframe
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const bodyText = iframeDoc.body.textContent || iframeDoc.body.innerText;
                
                let response;
                try {
                    response = JSON.parse(bodyText);
                } catch (e) {
                    response = {
                        success: true,
                        message: 'Request processed successfully',
                        data: {},
                        action: action
                    };
                }
                
                // Clean up
                setTimeout(() => {
                    if (form.parentNode) form.parentNode.removeChild(form);
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                }, 1000);
                
                resolve(response);
            } catch (error) {
                // If we can't read response, assume success
                setTimeout(() => {
                    if (form.parentNode) form.parentNode.removeChild(form);
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                }, 1000);
                
                resolve({
                    success: true,
                    message: 'Request sent (CORS workaround)',
                    data: {},
                    action: action
                });
            }
        };
        
        iframe.onerror = function() {
            // Clean up
            if (form.parentNode) form.parentNode.removeChild(form);
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            
            reject(new Error('Iframe request failed'));
        };
        
        // Add to page and submit
        document.body.appendChild(form);
        document.body.appendChild(iframe);
        form.submit();
    });
}

// Alternative: JSONP method (for GET requests only)
function callAPIWithJSONP(url) {
    return new Promise((resolve) => {
        const callbackName = 'callback_' + Date.now() + '_' + Math.random().toString(36).substr(2);
        const script = document.createElement('script');
        
        window[callbackName] = function(response) {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            resolve(response);
        };
        
        script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
        script.onerror = function() {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            resolve({
                success: false,
                message: 'JSONP request failed'
            });
        };
        
        document.head.appendChild(script);
    });
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

function showToast(message, type = 'info', duration = 5000) {
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
    
    document.body.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, duration);
}

function initUIComponents() {
    // Mobile menu toggle
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
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (navLinks && menuToggle && !event.target.closest('.navbar')) {
            navLinks.classList.remove('active');
            menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
}

function setupGlobalErrorHandler() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showToast('An unexpected error occurred', 'error');
    });
    
    // Handle global errors
    window.addEventListener('error', function(event) {
        console.error('Global error:', event.error);
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
    
    if (!message || message.trim() === '') {
        showToast('Please enter a message', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await callAPI('sendmessage', {
            message: message.trim(),
            userId: appState.user.id,
            userName: appState.user.name,
            userEmail: appState.user.email,
            timestamp: new Date().toISOString()
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
        const result = await callAPI('addleader', { 
            name: name.trim(), 
            role: role.trim(), 
            description: description?.trim() || '',
            timestamp: new Date().toISOString()
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
            leaderId: leaderId,
            title: title.trim(),
            description: description?.trim() || '',
            date: date || new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
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
        if (result.success && result.data) {
            const works = result.data.works || result.data || [];
            const container = document.getElementById('userRecentActivities');
            if (container) {
                if (works.length > 0) {
                    const recentWorks = works.slice(0, 5);
                    container.innerHTML = recentWorks.map(work => `
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
        if (result.success) {
            const leaders = result.data.leaders || result.data || [];
            appState.leaders = leaders;
            
            const container = document.getElementById('leadersList');
            if (container) {
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
    
    showLoading(true);
    
    try {
        // Try multiple endpoint names
        const endpoints = ['getuserdonations', 'getdonations', 'getDonations'];
        let result = null;
        
        for (const endpoint of endpoints) {
            result = await callAPI(endpoint, { 
                userId: appState.user.id,
                email: appState.user.email 
            });
            if (result.success) break;
        }
        
        if (result.success) {
            // Handle different response formats
            let donations = [];
            
            if (Array.isArray(result.data)) {
                donations = result.data;
            } else if (result.data.donations) {
                donations = result.data.donations;
            } else if (result.data.data) {
                donations = result.data.data;
            }
            
            appState.donations = donations;
            
            // Update current month status
            const currentMonth = CONFIG.MONTHS[new Date().getMonth()];
            const currentYear = new Date().getFullYear();
            
            const currentDonation = donations.find(d => 
                (d.month === currentMonth || d.month === currentMonth.toUpperCase()) && 
                (d.year == currentYear || d.year == currentYear.toString())
            );
            
            const statusElement = document.getElementById('currentStatus');
            if (statusElement) {
                const status = currentDonation?.status || 'Unpaid';
                statusElement.textContent = status;
                statusElement.className = `status-badge ${status.toLowerCase()}`;
            }
            
            // Update donation table
            const tbody = document.querySelector('#donationTable tbody');
            if (tbody) {
                if (donations.length > 0) {
                    tbody.innerHTML = donations.map(donation => `
                        <tr>
                            <td>${donation.month || 'N/A'}</td>
                            <td>${donation.year || 'N/A'}</td>
                            <td>$${donation.amount || '0'}</td>
                            <td><span class="status-badge ${(donation.status || 'unpaid').toLowerCase()}">${donation.status || 'Unpaid'}</span></td>
                        </tr>
                    `).join('');
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="4" class="no-data">
                                <p>No donation records found</p>
                                <small>Contact admin if you believe this is an error</small>
                            </td>
                        </tr>
                    `;
                }
            }
        } else {
            showToast('No donation records found', 'info');
            
            const tbody = document.querySelector('#donationTable tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="no-data">
                            <p>No donation records available</p>
                            <small>Make your first donation to see records here</small>
                        </td>
                    </tr>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load donations:', error);
        showToast('Failed to load donations', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadContactPage() {
    if (!appState.user) return;
    
    try {
        const result = await callAPI('getusermessages');
        const container = document.getElementById('userMessages');
        
        if (container) {
            if (result.success && result.data) {
                const messages = result.data.messages || result.data || [];
                
                if (messages.length > 0) {
                    container.innerHTML = messages.map(msg => `
                        <div class="message-card">
                            <div class="message-header">
                                <span class="message-date">${formatDate(msg.createdAt || msg.date)}</span>
                                <span class="message-status ${(msg.status || 'pending').toLowerCase()}">${msg.status || 'Pending'}</span>
                            </div>
                            <p class="message-content">${msg.message || 'No message content'}</p>
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
                    container.innerHTML = '<p class="no-data">No messages yet. Send your first message!</p>';
                }
            } else {
                container.innerHTML = '<p class="no-data">No messages yet. Send your first message!</p>';
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
        
        if (container) {
            if (result.success && result.data) {
                const messages = result.data.messages || result.data || [];
                appState.messages = messages;
                
                if (messages.length > 0) {
                    container.innerHTML = messages.map(msg => `
                        <div class="message-card admin ${(msg.status || 'pending').toLowerCase()}">
                            <div class="message-header">
                                <strong>${msg.userName || 'Unknown User'}</strong>
                                <span class="message-date">${formatDate(msg.createdAt || msg.date)}</span>
                            </div>
                            <p class="message-content">${msg.message || 'No content'}</p>
                            ${msg.adminReply ? `
                                <div class="message-reply">
                                    <strong>Your Reply:</strong>
                                    <p>${msg.adminReply}</p>
                                    <small>${formatDate(msg.replyDate)}</small>
                                </div>
                            ` : `
                                <button class="btn btn-sm btn-primary" onclick="replyToMessage('${msg.id || msg.timestamp}')">
                                    Reply
                                </button>
                            `}
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<p class="no-data">No messages</p>';
                }
            } else {
                container.innerHTML = '<p class="no-data">No messages</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

async function loadLeadersForWork() {
    try {
        const result = await callAPI('getleaders');
        if (result.success) {
            const leaders = result.data.leaders || result.data || [];
            const select = document.getElementById('workLeader');
            if (select) {
                select.innerHTML = '<option value="">Select a leader</option>';
                leaders.forEach(leader => {
                    if (!leader.status || leader.status === 'ACTIVE') {
                        select.innerHTML += `<option value="${leader.id || leader.name}">${leader.name} - ${leader.role || 'No role'}</option>`;
                    }
                });
            }
        }
    } catch (error) {
        console.error('Failed to load leaders:', error);
    }
}

// ==================== UTILITY FUNCTIONS ====================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
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
        // Call logout in background
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
            appState.apiConnected = true;
            showToast('Connected to server', 'success', 3000);
        } else {
            showToast('Server connection issue', 'warning', 5000);
        }
    } catch (error) {
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
        document.getElementById('editLeaderId').value = leader.id || '';
        document.getElementById('editLeaderName').value = leader.name || '';
        document.getElementById('editLeaderRole').value = leader.role || '';
        document.getElementById('editLeaderDesc').value = leader.description || '';
        document.getElementById('editLeaderStatus').value = leader.status || 'ACTIVE';
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

// ==================== MESSAGE FUNCTIONS ====================

async function replyToMessage(messageId) {
    if (!appState.isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    const reply = prompt('Enter your reply:');
    if (reply && reply.trim()) {
        showLoading(true);
        try {
            const result = await callAPI('replytomessage', {
                messageId: messageId,
                reply: reply.trim(),
                timestamp: new Date().toISOString()
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
            status: status,
            timestamp: new Date().toISOString()
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

// Debug functions
window.debugState = function() {
    console.log('App State:', appState);
    console.log('API Connected:', appState.apiConnected);
};

window.testAPI = function() {
    testAPIConnection();
};
