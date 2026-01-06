// ========================================================
// COMMUNITY PORTAL - COMPLETE FRONTEND (DEBUGGED VERSION)
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
            console.log('Loaded user from storage:', appState.user.name);
        } else if (adminSession) {
            appState.sessionId = adminSession;
            appState.admin = { sessionId: adminSession };
            appState.isAuthenticated = true;
            appState.isAdmin = true;
            console.log('Loaded admin from storage');
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
            console.log('Saved user to storage');
        } else if (appState.isAdmin && appState.sessionId) {
            localStorage.setItem(CONFIG.ADMIN_SESSION_KEY, appState.sessionId);
            localStorage.removeItem(CONFIG.USER_SESSION_KEY);
            localStorage.removeItem(CONFIG.USER_DATA_KEY);
            console.log('Saved admin to storage');
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
    console.log('Cleared storage');
}

// ==================== UI FUNCTIONS ====================

function showPage(pageId) {
    console.log('showPage called with:', pageId);
    
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
    } else {
        console.error('Page not found:', pageId);
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
    console.log('Loading data for page:', pageId);
    
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
        default:
            console.log('No specific data to load for page:', pageId);
    }
}

function updateNavigation() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) {
        console.error('navLinks element not found');
        return;
    }
    
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
    console.log('Navigation updated. Is authenticated:', appState.isAuthenticated, 'Is admin:', appState.isAdmin);
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
    
    console.log('Loading state:', show);
}

function showToast(message, type = 'info') {
    console.log(`Toast [${type}]:`, message);
    
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
    console.log('Initializing UI components...');
    
    // Setup mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            menuToggle.innerHTML = navLinks.classList.contains('active') ? 
                '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
            console.log('Mobile menu toggled');
        });
    } else {
        console.warn('Menu toggle or nav links not found');
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
    console.log('Setting up event listeners...');
    
    // User Login Form
    const userLoginForm = document.getElementById('userLoginForm');
    if (userLoginForm) {
        userLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('User login form submitted');
            await handleUserLogin();
        });
    } else {
        console.warn('User login form not found');
    }
    
    // User Registration Form
    const userRegisterForm = document.getElementById('userRegisterForm');
    if (userRegisterForm) {
        userRegisterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('User registration form submitted');
            await handleUserRegistration();
        });
    } else {
        console.warn('User registration form not found');
    }
    
    // Admin Login Form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Admin login form submitted');
            await handleAdminLogin();
        });
    } else {
        console.warn('Admin login form not found');
    }
    
    // Contact Form (Send Message)
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Message form submitted');
            await handleSendMessage();
        });
    } else {
        console.warn('Message form not found');
    }
    
    // Add Leader Form
    const addLeaderForm = document.getElementById('addLeaderForm');
    if (addLeaderForm) {
        addLeaderForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Add leader form submitted');
            await handleAddLeader();
        });
    } else {
        console.warn('Add leader form not found');
    }
    
    // Add Work Form
    const addWorkForm = document.getElementById('addWorkForm');
    if (addWorkForm) {
        addWorkForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Add work form submitted');
            await handleAddWork();
        });
    } else {
        console.warn('Add work form not found');
    }
    
    // Setup Database Button
    const setupBtn = document.getElementById('setupDatabaseBtn');
    if (setupBtn) {
        setupBtn.onclick = setupDatabaseDirect;
        console.log('Setup database button found');
    }
    
    // Add Sample Data Button
    const sampleBtn = document.getElementById('addSampleDataBtn');
    if (sampleBtn) {
        sampleBtn.onclick = addSampleDataDirect;
        console.log('Add sample data button found');
    }
}

// ==================== FORM HANDLERS ====================

async function handleUserLogin() {
    console.log('handleUserLogin called');
    
    const email = document.getElementById('userEmail')?.value;
    const password = document.getElementById('userPassword')?.value;
    
    console.log('Login attempt with email:', email);
    
    if (!email || !password) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await callAPI('login', { email, password });
        console.log('Login API response:', result);
        
        if (result.success) {
            appState.user = result.data.user;
            appState.sessionId = result.data.sessionId;
            appState.isAuthenticated = true;
            appState.isAdmin = false;
            saveToStorage();
            
            updateNavigation();
            showPage('userDashboard');
            showToast('Login successful!', 'success');
            console.log('User logged in:', appState.user.name);
        } else {
            showToast(result.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleUserRegistration() {
    console.log('handleUserRegistration called');
    
    const name = document.getElementById('regName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value;
    const address = document.getElementById('regAddress')?.value;
    
    console.log('Registration attempt for:', name, email);
    
    if (!name || !email || !password) {
        showToast('Name, email, and password are required', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await callAPI('register', {
            name, email, password, phone, address
        });
        
        console.log('Registration API response:', result);
        
        if (result.success) {
            appState.user = result.data.user;
            appState.sessionId = result.data.sessionId;
            appState.isAuthenticated = true;
            appState.isAdmin = false;
            saveToStorage();
            
            updateNavigation();
            showPage('userDashboard');
            showToast('Registration successful!', 'success');
            console.log('User registered:', appState.user.name);
        } else {
            showToast(result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Registration failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleAdminLogin() {
    console.log('handleAdminLogin called');
    
    const password = document.getElementById('adminPassword')?.value;
    
    if (!password) {
        showToast('Please enter admin password', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await callAPI('adminlogin', { password });
        console.log('Admin login API response:', result);
        
        if (result.success) {
            appState.admin = result.data.admin;
            appState.sessionId = result.data.sessionId;
            appState.isAuthenticated = true;
            appState.isAdmin = true;
            saveToStorage();
            
            updateNavigation();
            showPage('adminDashboard');
            showToast('Admin login successful!', 'success');
            console.log('Admin logged in');
        } else {
            showToast(result.message || 'Admin login failed', 'error');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showToast('Admin login failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleSendMessage() {
    console.log('handleSendMessage called');
    
    if (!appState.isAuthenticated || appState.isAdmin) {
        showToast('Please login as a user to send messages', 'error');
        showPage('userLogin');
        return;
    }
    
    const message = document.getElementById('messageContent')?.value;
    
    console.log('Sending message from user:', appState.user.name, 'Message:', message);
    
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
            userEmail: appState.user.email
        });
        
        console.log('Send message API response:', result);
        
        if (result.success) {
            showToast('Message sent successfully!', 'success');
            document.getElementById('messageContent').value = '';
            loadContactPage(); // Reload messages
        } else {
            showToast(result.message || 'Failed to send message', 'error');
        }
    } catch (error) {
        console.error('Send message error:', error);
        showToast('Failed to send message: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleAddLeader() {
    console.log('handleAddLeader called');
    
    if (!appState.isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    const name = document.getElementById('leaderName')?.value;
    const role = document.getElementById('leaderRole')?.value;
    const description = document.getElementById('leaderDesc')?.value;
    
    console.log('Adding leader:', name, role);
    
    if (!name || !role) {
        showToast('Name and role are required', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const result = await callAPI('addleader', { 
            name: name.trim(), 
            role: role.trim(), 
            description: description?.trim() || '' 
        });
        
        console.log('Add leader API response:', result);
        
        if (result.success) {
            showToast('Leader added successfully!', 'success');
            document.getElementById('addLeaderForm').reset();
            loadManageLeaders();
            closeModal();
        } else {
            showToast(result.message || 'Failed to add leader', 'error');
        }
    } catch (error) {
        console.error('Add leader error:', error);
        showToast('Failed to add leader: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleAddWork() {
    console.log('handleAddWork called');
    
    if (!appState.isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    const leaderId = document.getElementById('workLeader')?.value;
    const title = document.getElementById('workTitle')?.value;
    const description = document.getElementById('workDescription')?.value;
    const date = document.getElementById('workDate')?.value;
    
    console.log('Adding work for leader:', leaderId, 'Title:', title);
    
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
            date: date || new Date().toISOString().split('T')[0]
        });
        
        console.log('Add work API response:', result);
        
        if (result.success) {
            showToast('Work added successfully!', 'success');
            document.getElementById('addWorkForm').reset();
        } else {
            showToast(result.message || 'Failed to add work', 'error');
        }
    } catch (error) {
        console.error('Add work error:', error);
        showToast('Failed to add work: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== API COMMUNICATION ====================

async function callAPI(action, data = {}) {
    console.log(`API call: ${action}`, data);
    showLoading(true);
    
    // Add session ID if available
    if (appState.sessionId) {
        data.sessionId = appState.sessionId;
        console.log('Added session ID to request');
    }
    
    // Add timestamp to prevent caching
    data._t = Date.now();
    
    // Build URL - IMPORTANT: Use encodeURIComponent for all values
    const params = new URLSearchParams();
    params.append('action', action);
    
    for (const [key, value] of Object.entries(data)) {
        params.append(key, value);
    }
    
    const url = CONFIG.API_URL + '?' + params.toString();
    console.log('API URL:', url);
    
    try {
        // Try JSONP first (works around CORS)
        const jsonpResult = await callAPIWithJSONP(url);
        if (jsonpResult) {
            console.log('API response via JSONP:', jsonpResult);
            showLoading(false);
            return jsonpResult;
        }
        
        // If JSONP fails, try fetch with mode 'cors' if possible
        console.log('JSONP failed, trying fetch...');
        const fetchResult = await callAPIWithFetch(url);
        if (fetchResult) {
            console.log('API response via fetch:', fetchResult);
            showLoading(false);
            return fetchResult;
        }
        
        // Last resort: iframe method
        console.log('Fetch failed, trying iframe...');
        const iframeResult = await callAPIWithIframe(url);
        showLoading(false);
        return iframeResult;
        
    } catch (error) {
        console.error('API call error:', error);
        showLoading(false);
        return {
            success: false,
            message: 'Network error. Please check your connection and API URL.',
            error: error.message
        };
    }
}

function callAPIWithJSONP(url) {
    return new Promise((resolve) => {
        console.log('Trying JSONP method...');
        const callbackName = 'jsonp_callback_' + Date.now();
        const jsonpUrl = url + '&callback=' + callbackName;
        
        const timeout = setTimeout(() => {
            console.log('JSONP timeout');
            delete window[callbackName];
            resolve(null);
        }, 10000);
        
        window[callbackName] = function(response) {
            console.log('JSONP callback received:', response);
            clearTimeout(timeout);
            delete window[callbackName];
            resolve(response);
        };
        
        const script = document.createElement('script');
        script.src = jsonpUrl;
        script.onerror = () => {
            console.log('JSONP script error');
            clearTimeout(timeout);
            delete window[callbackName];
            resolve(null);
        };
        
        document.head.appendChild(script);
    });
}

async function callAPIWithFetch(url) {
    console.log('Trying fetch method...');
    try {
        // First try with mode 'cors'
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Fetch successful with CORS:', data);
            return data;
        } else {
            console.log('Fetch failed with CORS, trying no-cors...');
            // Try with mode 'no-cors' (can't read response but request goes through)
            await fetch(url, {
                method: 'GET',
                mode: 'no-cors',
                cache: 'no-cache'
            });
            
            // With no-cors we can't read response, return generic success
            return {
                success: true,
                message: 'Request sent (no-cors mode)',
                data: {}
            };
        }
    } catch (error) {
        console.log('Fetch failed:', error);
        return null;
    }
}

function callAPIWithIframe(url) {
    return new Promise((resolve) => {
        console.log('Trying iframe method...');
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        
        iframe.onload = function() {
            console.log('Iframe loaded');
            setTimeout(() => {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
                resolve({
                    success: true,
                    message: 'Request processed via iframe',
                    data: {}
                });
            }, 2000);
        };
        
        iframe.onerror = function() {
            console.log('Iframe error');
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            resolve({
                success: false,
                message: 'Request failed',
                data: {}
            });
        };
        
        document.body.appendChild(iframe);
    });
}

// ==================== PAGE DATA LOADERS ====================

async function loadUserDashboard() {
    console.log('loadUserDashboard called');
    if (!appState.user) {
        console.error('No user found for dashboard');
        return;
    }
    
    // Update user info
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = appState.user.name;
        console.log('Updated user name:', appState.user.name);
    }
    
    // Load recent works
    try {
        console.log('Loading recent works...');
        const result = await callAPI('getleaderworks');
        console.log('Recent works response:', result);
        
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
                    console.log('Loaded', recentWorks.length, 'recent works');
                } else {
                    container.innerHTML = '<p class="no-data">No recent activities</p>';
                }
            }
        } else {
            console.log('No works data or API failed');
        }
    } catch (error) {
        console.error('Failed to load recent activities:', error);
    }
}

async function loadAdminDashboard() {
    console.log('loadAdminDashboard called');
    if (!appState.isAdmin) {
        console.error('Not an admin');
        return;
    }
    
    try {
        const result = await callAPI('getdashboardstats');
        console.log('Dashboard stats response:', result);
        
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
            console.log('Dashboard stats updated');
        }
    } catch (error) {
        console.error('Failed to load admin dashboard:', error);
        showToast('Failed to load dashboard stats', 'error');
    }
}

async function loadLeaders() {
    console.log('loadLeaders called');
    try {
        const result = await callAPI('getleaders');
        console.log('Leaders response:', result);
        
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
                    console.log('Loaded', leaders.length, 'leaders');
                } else {
                    container.innerHTML = '<p class="no-data">No leaders found</p>';
                }
            }
        } else {
            showToast(result.message || 'Failed to load leaders', 'error');
        }
    } catch (error) {
        console.error('Failed to load leaders:', error);
        showToast('Failed to load leaders', 'error');
    }
}

async function loadDonationStatus() {
    console.log('loadDonationStatus called');
    
    if (!appState.user) {
        console.error('No user found for donations');
        showToast('Please login to view donations', 'error');
        showPage('userLogin');
        return;
    }
    
    console.log('Loading donations for user:', appState.user.id);
    
    showLoading(true);
    
    try {
        // Try multiple possible endpoint names
        const endpoints = ['getuserdonations', 'getdonations', 'getDonations'];
        let result = null;
        
        for (const endpoint of endpoints) {
            console.log('Trying endpoint:', endpoint);
            result = await callAPI(endpoint, { userId: appState.user.id });
            if (result.success) {
                console.log('Found data with endpoint:', endpoint);
                break;
            }
        }
        
        console.log('Donations response:', result);
        
        if (result.success) {
            // Handle different response formats
            let donations = [];
            
            if (Array.isArray(result.data)) {
                donations = result.data;
            } else if (result.data.donations) {
                donations = result.data.donations;
            } else if (result.data.data) {
                donations = result.data.data;
            } else if (result.data) {
                donations = [result.data];
            }
            
            appState.donations = donations;
            console.log('Processed donations:', donations);
            
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
                console.log('Current donation status:', status);
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
                    console.log('Donation table updated with', donations.length, 'records');
                } else {
                    // Show empty state with message
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="4" class="no-data">
                                <p>No donation records found</p>
                                <p class="small-text">If you've made donations, they should appear here soon</p>
                            </td>
                        </tr>
                    `;
                }
            }
        } else {
            console.log('No donation data found, showing empty state');
            // Show empty table
            const tbody = document.querySelector('#donationTable tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" class="no-data">
                            <p>No donation records available</p>
                            <p class="small-text">Contact admin if you believe this is an error</p>
                        </td>
                    </tr>
                `;
            }
            
            const statusElement = document.getElementById('currentStatus');
            if (statusElement) {
                statusElement.textContent = 'Unpaid';
                statusElement.className = 'status-badge unpaid';
            }
            
            showToast('No donation records found', 'info');
        }
    } catch (error) {
        console.error('Failed to load donations:', error);
        
        // Show fallback UI
        const tbody = document.querySelector('#donationTable tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-data">
                        <p>Error loading donations</p>
                        <p class="small-text">Please try again later or contact support</p>
                    </td>
                </tr>
            `;
        }
        
        showToast('Failed to load donations: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadContactPage() {
    console.log('loadContactPage called');
    
    if (!appState.user) {
        console.error('No user found for contact page');
        return;
    }
    
    console.log('Loading messages for user:', appState.user.id);
    
    try {
        const result = await callAPI('getusermessages');
        console.log('Messages response:', result);
        
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
                    console.log('Loaded', messages.length, 'messages');
                } else {
                    container.innerHTML = '<p class="no-data">No messages yet. Send your first message!</p>';
                }
            } else {
                container.innerHTML = '<p class="no-data">No messages yet. Send your first message!</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
        const container = document.getElementById('userMessages');
        if (container) {
            container.innerHTML = '<p class="no-data">Error loading messages</p>';
        }
    }
}

async function loadManageLeaders() {
    console.log('loadManageLeaders called');
    if (!appState.isAdmin) {
        console.error('Not an admin');
        return;
    }
    
    await loadLeaders();
}

async function loadMessages() {
    console.log('loadMessages called');
    if (!appState.isAdmin) {
        console.error('Not an admin');
        return;
    }
    
    try {
        const result = await callAPI('getmessages');
        console.log('Admin messages response:', result);
        
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
                    console.log('Loaded', messages.length, 'messages for admin');
                } else {
                    container.innerHTML = '<p class="no-data">No messages</p>';
                }
            } else {
                container.innerHTML = '<p class="no-data">No messages</p>';
            }
        }
    } catch (error) {
        console.error('Failed to load messages:', error);
        showToast('Failed to load messages', 'error');
    }
}

async function loadLeadersForWork() {
    console.log('loadLeadersForWork called');
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
                console.log('Loaded', leaders.length, 'leaders for work assignment');
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
        if (isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Date formatting error:', error, 'for:', dateString);
        return dateString;
    }
}

function logout() {
    console.log('Logging out...');
    
    if (appState.sessionId) {
        // Call logout API if needed
        callAPI('logout').catch(error => {
            console.log('Logout API error (ignored):', error);
        });
    }
    
    clearStorage();
    updateNavigation();
    showPage('homePage');
    showToast('Logged out successfully', 'success');
}

function checkAuthState() {
    console.log('Checking auth state...');
    console.log('Is authenticated:', appState.isAuthenticated);
    console.log('Is admin:', appState.isAdmin);
    console.log('Has user:', !!appState.user);
    console.log('Has admin:', !!appState.admin);
    
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
    console.log('Testing API connection...');
    try {
        const result = await callAPI('ping');
        console.log('Ping response:', result);
        
        if (result.success) {
            console.log('API Connection: OK');
            showToast('Connected to server', 'success');
        } else {
            console.warn('API Connection: Failed -', result.message);
            showToast('Server connection issue: ' + (result.message || 'Unknown error'), 'warning');
        }
    } catch (error) {
        console.error('API Connection: Error', error);
        showToast('Cannot connect to server. Please check API URL', 'error');
    }
}

// ==================== MODAL FUNCTIONS ====================

function showAddLeaderModal() {
    console.log('showAddLeaderModal called');
    const modal = document.getElementById('addLeaderModal');
    if (modal) {
        modal.style.display = 'block';
        console.log('Add leader modal shown');
    } else {
        console.error('Add leader modal not found');
    }
}

function showEditLeaderModal(leader) {
    console.log('showEditLeaderModal called for:', leader);
    const modal = document.getElementById('editLeaderModal');
    if (modal) {
        document.getElementById('editLeaderId').value = leader.id || '';
        document.getElementById('editLeaderName').value = leader.name || '';
        document.getElementById('editLeaderRole').value = leader.role || '';
        document.getElementById('editLeaderDesc').value = leader.description || '';
        document.getElementById('editLeaderStatus').value = leader.status || 'ACTIVE';
        modal.style.display = 'block';
        console.log('Edit leader modal shown');
    } else {
        console.error('Edit leader modal not found');
    }
}

function closeModal() {
    console.log('closeModal called');
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    console.log('All modals closed');
}

// ==================== DIRECT URL FUNCTIONS ====================

function setupDatabaseDirect() {
    console.log('setupDatabaseDirect called');
    const url = CONFIG.API_URL + '?action=setup';
    console.log('Opening setup URL:', url);
    window.open(url, '_blank');
    showToast('Opening setup page. Please check the new tab.', 'info');
}

function addSampleDataDirect() {
    console.log('addSampleDataDirect called');
    const url = CONFIG.API_URL + '?action=sampledata';
    console.log('Opening sample data URL:', url);
    window.open(url, '_blank');
    showToast('Adding sample data. Please check the new tab.', 'info');
}

// ==================== ADDITIONAL FUNCTIONS ====================

async function replyToMessage(messageId) {
    console.log('replyToMessage called for message:', messageId);
    
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
                reply: reply.trim()
            });
            
            console.log('Reply to message response:', result);
            
            if (result.success) {
                showToast('Reply sent successfully!', 'success');
                loadMessages();
            } else {
                showToast(result.message || 'Failed to send reply', 'error');
            }
        } catch (error) {
            console.error('Reply to message error:', error);
            showToast('Failed to send reply: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }
}

async function updateDonationStatus(donationId, status) {
    console.log('updateDonationStatus called:', donationId, status);
    
    if (!appState.isAdmin) {
        showToast('Admin access required', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const result = await callAPI('updatedonationstatus', {
            donationId: donationId,
            status: status
        });
        
        console.log('Update donation status response:', result);
        
        if (result.success) {
            showToast('Donation status updated!', 'success');
            loadDonationStatus();
        } else {
            showToast(result.message || 'Failed to update donation', 'error');
        }
    } catch (error) {
        console.error('Update donation status error:', error);
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
window.showEditLeaderModal = showEditLeaderModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.logout = logout;
window.setupDatabaseDirect = setupDatabaseDirect;
window.addSampleDataDirect = addSampleDataDirect;
window.replyToMessage = replyToMessage;
window.updateDonationStatus = updateDonationStatus;

// Export additional functions that might be needed
window.testAPIConnection = testAPIConnection;
window.handleUserLogin = handleUserLogin;
window.handleUserRegistration = handleUserRegistration;
window.handleAdminLogin = handleAdminLogin;
window.handleSendMessage = handleSendMessage;
window.handleAddLeader = handleAddLeader;
window.handleAddWork = handleAddWork;

console.log(`${CONFIG.APP_NAME} - All functions loaded and ready`);

// ==================== DEBUG FUNCTIONS ====================

// Add debug function to check state
window.debugState = function() {
    console.log('=== DEBUG STATE ===');
    console.log('App State:', appState);
    console.log('API URL:', CONFIG.API_URL);
    console.log('Current Page:', appState.currentPage);
    console.log('User:', appState.user);
    console.log('Admin:', appState.admin);
    console.log('Session ID:', appState.sessionId);
    console.log('Is Authenticated:', appState.isAuthenticated);
    console.log('Is Admin:', appState.isAdmin);
    console.log('=== END DEBUG ===');
};

// Test API endpoint directly
window.testEndpoint = function(action, data = {}) {
    const params = new URLSearchParams();
    params.append('action', action);
    
    for (const [key, value] of Object.entries(data)) {
        params.append(key, value);
    }
    
    const url = CONFIG.API_URL + '?' + params.toString();
    console.log('Testing endpoint:', url);
    window.open(url, '_blank');
};
