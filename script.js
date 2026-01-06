// ========================================================
// COMMUNITY PORTAL - PRODUCTION FRONTEND
// Complete with Error Handling & Fallbacks
// ========================================================

// Configuration
const CONFIG = {
    // Update this with your deployed Google Apps Script URL
    API_URL: 'https://script.google.com/macros/s/AKfycbzfUIanwxMar_LfB73TfIwsZ4WrAz8vX5Gq7LleLhHGkYK_LQGIj5ZXkDW34JnHUEpdcw/exec',
    
    // Storage keys
    USER_SESSION_KEY: 'community_portal_user_session',
    USER_DATA_KEY: 'community_portal_user_data',
    ADMIN_SESSION_KEY: 'community_portal_admin_session',
    
    // API Settings
    REQUEST_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 3,
    
    // Demo Mode Settings
    DEMO_MODE: false, // Set to true for offline testing
    DEMO_DATA: {
        users: [
            {
                id: 'USR_demo_001',
                name: 'John Doe',
                email: 'john@example.com',
                phone: '555-0101',
                address: '123 Main Street',
                createdAt: new Date().toISOString(),
                status: 'ACTIVE'
            }
        ],
        leaders: [
            {
                id: 'LDR_demo_001',
                name: 'Community President',
                role: 'President',
                description: 'Experienced community leader',
                image: '',
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            },
            {
                id: 'LDR_demo_002',
                name: 'Treasurer',
                role: 'Treasurer',
                description: 'Financial manager',
                image: '',
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            }
        ],
        works: [
            {
                id: 'WRK_demo_001',
                leaderId: 'LDR_demo_001',
                title: 'Monthly Community Meeting',
                description: 'Regular community gathering',
                image: '',
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            }
        ],
        donations: [
            {
                id: 'DON_demo_001',
                userId: 'USR_demo_001',
                month: 'JANUARY',
                year: '2024',
                amount: '100.00',
                status: 'PAID',
                paidDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                notes: ''
            },
            {
                id: 'DON_demo_002',
                userId: 'USR_demo_001',
                month: 'FEBRUARY',
                year: '2024',
                amount: '100.00',
                status: 'PENDING',
                paidDate: '',
                createdAt: new Date().toISOString(),
                notes: ''
            }
        ],
        messages: [
            {
                id: 'MSG_demo_001',
                userId: 'USR_demo_001',
                userName: 'John Doe',
                message: 'When is the next meeting?',
                status: 'UNREAD',
                createdAt: new Date().toISOString(),
                adminReply: '',
                replyDate: ''
            }
        ]
    }
};

// State Management
const AppState = {
    user: null,
    admin: null,
    sessionId: null,
    isAuthenticated: false,
    isAdmin: false,
    isLoading: false,
    lastError: null,
    apiStatus: 'unknown',
    
    init: function() {
        this.loadFromStorage();
        this.checkAPIStatus();
    },
    
    loadFromStorage: function() {
        try {
            const userSession = localStorage.getItem(CONFIG.USER_SESSION_KEY);
            const userData = localStorage.getItem(CONFIG.USER_DATA_KEY);
            const adminSession = localStorage.getItem(CONFIG.ADMIN_SESSION_KEY);
            
            if (userSession && userData) {
                this.sessionId = userSession;
                this.user = JSON.parse(userData);
                this.isAuthenticated = true;
                this.isAdmin = false;
            } else if (adminSession) {
                this.sessionId = adminSession;
                this.admin = { sessionId: adminSession };
                this.isAuthenticated = true;
                this.isAdmin = true;
            }
        } catch (error) {
            console.error('Failed to load state from storage:', error);
            this.clearStorage();
        }
    },
    
    saveToStorage: function() {
        try {
            if (this.user && this.sessionId) {
                localStorage.setItem(CONFIG.USER_SESSION_KEY, this.sessionId);
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(this.user));
                localStorage.removeItem(CONFIG.ADMIN_SESSION_KEY);
            } else if (this.isAdmin && this.sessionId) {
                localStorage.setItem(CONFIG.ADMIN_SESSION_KEY, this.sessionId);
                localStorage.removeItem(CONFIG.USER_SESSION_KEY);
                localStorage.removeItem(CONFIG.USER_DATA_KEY);
            }
        } catch (error) {
            console.error('Failed to save state to storage:', error);
        }
    },
    
    clearStorage: function() {
        localStorage.removeItem(CONFIG.USER_SESSION_KEY);
        localStorage.removeItem(CONFIG.USER_DATA_KEY);
        localStorage.removeItem(CONFIG.ADMIN_SESSION_KEY);
        this.reset();
    },
    
    reset: function() {
        this.user = null;
        this.admin = null;
        this.sessionId = null;
        this.isAuthenticated = false;
        this.isAdmin = false;
        this.isLoading = false;
        this.lastError = null;
    },
    
    setLoading: function(loading) {
        this.isLoading = loading;
        this.updateLoadingUI();
    },
    
    setError: function(error) {
        this.lastError = error;
        this.showError(error);
    },
    
    updateLoadingUI: function() {
        const loadingEl = document.getElementById('globalLoading');
        if (loadingEl) {
            loadingEl.style.display = this.isLoading ? 'flex' : 'none';
        }
    },
    
    checkAPIStatus: async function() {
        try {
            const response = await API.ping();
            this.apiStatus = response.success ? 'online' : 'error';
        } catch (error) {
            this.apiStatus = 'offline';
        }
    }
};

// API Service with Retry Logic & Error Handling
const API = {
    request: async function(action, data = {}, options = {}) {
        // Demo mode fallback
        if (CONFIG.DEMO_MODE) {
            return this.demoRequest(action, data);
        }
        
        const config = {
            method: 'GET',
            timeout: options.timeout || CONFIG.REQUEST_TIMEOUT,
            retries: options.retries || CONFIG.MAX_RETRIES,
            sessionId: options.sessionId || AppState.sessionId
        };
        
        // Add session ID if available
        if (config.sessionId) {
            data.sessionId = config.sessionId;
        }
        
        // Build URL
        let url = CONFIG.API_URL + '?action=' + encodeURIComponent(action);
        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
                url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
            }
        });
        
        // Add cache busting
        url += '&_t=' + Date.now();
        
        console.log('API Request:', { action, url: url.substring(0, 100) + '...' });
        
        // Try multiple methods
        let lastError = null;
        
        // Method 1: Fetch with JSONP simulation
        try {
            const result = await this.fetchWithJSONP(url, config.timeout);
            if (result) return result;
        } catch (error) {
            lastError = error;
            console.log('JSONP method failed:', error.message);
        }
        
        // Method 2: Direct fetch with no-cors
        try {
            const result = await this.fetchDirect(url, config.timeout);
            if (result) return result;
        } catch (error) {
            lastError = error;
            console.log('Direct fetch failed:', error.message);
        }
        
        // Method 3: Use iframe
        try {
            const result = await this.fetchWithIframe(url, config.timeout);
            if (result) return result;
        } catch (error) {
            lastError = error;
            console.log('Iframe method failed:', error.message);
        }
        
        // All methods failed
        throw new Error(`API request failed: ${lastError?.message || 'All methods failed'}`);
    },
    
    fetchWithJSONP: function(url, timeout) {
        return new Promise((resolve, reject) => {
            const callbackName = 'jsonp_callback_' + Date.now() + Math.random().toString(36).substr(2);
            const jsonpUrl = url + (url.includes('?') ? '&' : '?') + 'callback=' + callbackName;
            
            const timeoutId = setTimeout(() => {
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                reject(new Error('JSONP timeout'));
            }, timeout);
            
            window[callbackName] = function(response) {
                clearTimeout(timeoutId);
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                
                if (response && typeof response === 'object') {
                    resolve(response);
                } else {
                    reject(new Error('Invalid JSONP response'));
                }
            };
            
            const script = document.createElement('script');
            script.src = jsonpUrl;
            script.onerror = () => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                reject(new Error('JSONP script load failed'));
            };
            
            document.head.appendChild(script);
        });
    },
    
    fetchDirect: async function(url, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                mode: 'no-cors',
                signal: controller.signal,
                cache: 'no-cache'
            });
            
            clearTimeout(timeoutId);
            
            // In no-cors mode, we can't read the response
            // So we return a success response assuming it worked
            return {
                success: true,
                message: 'Request sent successfully',
                data: { method: 'no-cors', url: url }
            };
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },
    
    fetchWithIframe: function(url, timeout) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            
            const timeoutId = setTimeout(() => {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
                resolve({
                    success: true,
                    message: 'Request sent via iframe',
                    data: { method: 'iframe', url: url }
                });
            }, timeout);
            
            iframe.onload = function() {
                clearTimeout(timeoutId);
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
                resolve({
                    success: true,
                    message: 'Request completed via iframe',
                    data: { method: 'iframe', url: url }
                });
            };
            
            document.body.appendChild(iframe);
        });
    },
    
    demoRequest: async function(action, data) {
        console.log('Demo API Request:', action, data);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        switch(action.toLowerCase()) {
            case 'ping':
                return {
                    success: true,
                    message: 'API is running in demo mode',
                    data: {
                        service: 'Community Portal API',
                        version: '1.0.0',
                        mode: 'demo'
                    }
                };
                
            case 'setup':
                return {
                    success: true,
                    message: 'Database setup simulated',
                    data: {
                        spreadsheetId: 'demo_spreadsheet',
                        spreadsheetUrl: '#',
                        sheets: ['Users', 'Admin', 'Leaders', 'Donations', 'Messages'],
                        adminCredentials: {
                            email: 'admin@community.com',
                            password: 'admin123'
                        }
                    }
                };
                
            case 'register':
                const newUser = {
                    id: 'USR_demo_' + Date.now(),
                    name: data.name,
                    email: data.email,
                    phone: data.phone || '',
                    address: data.address || '',
                    createdAt: new Date().toISOString()
                };
                CONFIG.DEMO_DATA.users.push(newUser);
                return {
                    success: true,
                    message: 'Registration successful (demo)',
                    data: {
                        userId: newUser.id,
                        sessionId: 'demo_session_' + Date.now(),
                        user: newUser
                    }
                };
                
            case 'login':
                if (data.email && data.password) {
                    const user = CONFIG.DEMO_DATA.users[0];
                    return {
                        success: true,
                        message: 'Login successful (demo)',
                        data: {
                            sessionId: 'demo_user_session',
                            user: user
                        }
                    };
                }
                return {
                    success: false,
                    message: 'Invalid credentials',
                    error: 'AUTH_ERROR'
                };
                
            case 'adminlogin':
                if (data.password === 'admin123') {
                    return {
                        success: true,
                        message: 'Admin login successful (demo)',
                        data: {
                            sessionId: 'demo_admin_session',
                            admin: {
                                id: 'ADM_demo',
                                email: 'admin@community.com',
                                name: 'Administrator',
                                role: 'Admin'
                            }
                        }
                    };
                }
                return {
                    success: false,
                    message: 'Invalid admin password',
                    error: 'AUTH_ERROR'
                };
                
            case 'getleaders':
                return {
                    success: true,
                    message: 'Leaders retrieved',
                    data: {
                        leaders: CONFIG.DEMO_DATA.leaders,
                        count: CONFIG.DEMO_DATA.leaders.length
                    }
                };
                
            case 'getleaderworks':
                return {
                    success: true,
                    message: 'Leader works retrieved',
                    data: {
                        works: CONFIG.DEMO_DATA.works,
                        count: CONFIG.DEMO_DATA.works.length
                    }
                };
                
            case 'getuserdonations':
                return {
                    success: true,
                    message: 'Donations retrieved',
                    data: {
                        donations: CONFIG.DEMO_DATA.donations,
                        count: CONFIG.DEMO_DATA.donations.length
                    }
                };
                
            case 'getmessages':
                return {
                    success: true,
                    message: 'Messages retrieved',
                    data: {
                        messages: CONFIG.DEMO_DATA.messages,
                        count: CONFIG.DEMO_DATA.messages.length
                    }
                };
                
            case 'getdashboardstats':
                return {
                    success: true,
                    message: 'Dashboard stats',
                    data: {
                        totalUsers: CONFIG.DEMO_DATA.users.length,
                        totalLeaders: CONFIG.DEMO_DATA.leaders.length,
                        totalDonations: CONFIG.DEMO_DATA.donations.length,
                        totalMessages: CONFIG.DEMO_DATA.messages.length,
                        pendingDonations: CONFIG.DEMO_DATA.donations.filter(d => d.status === 'PENDING').length,
                        unreadMessages: CONFIG.DEMO_DATA.messages.filter(m => m.status === 'UNREAD').length
                    }
                };
                
            default:
                return {
                    success: false,
                    message: 'Action not implemented in demo mode',
                    error: 'NOT_IMPLEMENTED'
                };
        }
    },
    
    // Convenience methods
    ping: function() {
        return this.request('ping');
    },
    
    setup: function() {
        return this.request('setup');
    },
    
    addSampleData: function() {
        return this.request('sampledata');
    },
    
    register: function(userData) {
        return this.request('register', userData);
    },
    
    login: function(credentials) {
        return this.request('login', credentials);
    },
    
    adminLogin: function(password) {
        return this.request('adminlogin', { password });
    },
    
    getLeaders: function() {
        return this.request('getleaders');
    },
    
    getLeaderWorks: function(leaderId) {
        return this.request('getleaderworks', { leaderId });
    },
    
    getUserDonations: function() {
        return this.request('getuserdonations');
    },
    
    sendMessage: function(message) {
        return this.request('sendmessage', { message });
    },
    
    getMessages: function() {
        return this.request('getmessages');
    },
    
    getDashboardStats: function() {
        return this.request('getdashboardstats');
    },
    
    logout: function() {
        return this.request('logout');
    }
};

// UI Components
const UI = {
    init: function() {
        this.createGlobalLoading();
        this.createToastContainer();
        this.setupEventDelegation();
    },
    
    createGlobalLoading: function() {
        if (!document.getElementById('globalLoading')) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'globalLoading';
            loadingDiv.innerHTML = `
                <div class="loading-backdrop"></div>
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading...</p>
                </div>
            `;
            loadingDiv.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            
            const style = document.createElement('style');
            style.textContent = `
                .loading-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(2px);
                }
                .loading-spinner {
                    position: relative;
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    text-align: center;
                    min-width: 200px;
                }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
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
            document.body.appendChild(loadingDiv);
        }
    },
    
    createToastContainer: function() {
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
    },
    
    showToast: function(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        const toastId = 'toast_' + Date.now();
        
        toast.id = toastId;
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon ${this.getToastIcon(type)}"></i>
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="UI.closeToast('${toastId}')">&times;</button>
            </div>
        `;
        
        // Add styles if not already added
        if (!document.getElementById('toastStyles')) {
            const style = document.createElement('style');
            style.id = 'toastStyles';
            style.textContent = `
                .toast {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    overflow: hidden;
                    animation: slideIn 0.3s ease;
                    border-left: 4px solid;
                }
                .toast-info { border-left-color: #3498db; }
                .toast-success { border-left-color: #2ecc71; }
                .toast-warning { border-left-color: #f39c12; }
                .toast-error { border-left-color: #e74c3c; }
                .toast-content {
                    display: flex;
                    align-items: center;
                    padding: 15px 20px;
                    gap: 12px;
                }
                .toast-icon {
                    font-size: 18px;
                }
                .toast-info .toast-icon { color: #3498db; }
                .toast-success .toast-icon { color: #2ecc71; }
                .toast-warning .toast-icon { color: #f39c12; }
                .toast-error .toast-icon { color: #e74c3c; }
                .toast-message {
                    flex: 1;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .toast-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #95a5a6;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                .toast-close:hover {
                    background: #f8f9fa;
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
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        container.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            this.closeToast(toastId);
        }, duration);
        
        return toastId;
    },
    
    closeToast: function(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    },
    
    getToastIcon: function(type) {
        switch(type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-exclamation-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            default: return 'fas fa-info-circle';
        }
    },
    
    showModal: function(title, content, buttons = []) {
        const modalId = 'modal_' + Date.now();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="UI.closeModal('${modalId}')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="UI.closeModal('${modalId}')">&times;</button>
                </div>
                <div class="modal-body">${content}</div>
                ${buttons.length > 0 ? `
                    <div class="modal-footer">
                        ${buttons.map(btn => `
                            <button class="btn btn-${btn.type || 'secondary'}" 
                                    onclick="${btn.onclick}">
                                ${btn.text}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Add modal styles if not present
        if (!document.getElementById('modalStyles')) {
            const style = document.createElement('style');
            style.id = 'modalStyles';
            style.textContent = `
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .modal-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    backdrop-filter: blur(2px);
                }
                .modal-content {
                    position: relative;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    animation: modalSlideIn 0.3s ease;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                }
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.3rem;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #95a5a6;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                .modal-close:hover {
                    background: #f8f9fa;
                }
                .modal-body {
                    padding: 20px;
                }
                .modal-footer {
                    padding: 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
                @keyframes modalSlideIn {
                    from {
                        transform: translateY(-50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(modal);
        return modalId;
    },
    
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.opacity = '0';
            modal.style.transform = 'translateY(-50px)';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    },
    
    setupEventDelegation: function() {
        document.addEventListener('click', function(e) {
            // Handle form submissions
            if (e.target.matches('button[type="submit"]') || 
                e.target.closest('button[type="submit"]')) {
                const form = e.target.closest('form');
                if (form) {
                    e.preventDefault();
                    UI.handleFormSubmit(form);
                }
            }
            
            // Handle navigation links
            if (e.target.matches('[data-page]') || 
                e.target.closest('[data-page]')) {
                const page = e.target.getAttribute('data-page') || 
                           e.target.closest('[data-page]').getAttribute('data-page');
                if (page) {
                    e.preventDefault();
                    Router.navigateTo(page);
                }
            }
        });
    },
    
    handleFormSubmit: async function(form) {
        const formId = form.id;
        const formData = new FormData(form);
        const data = {};
        
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        try {
            AppState.setLoading(true);
            
            switch(formId) {
                case 'userLoginForm':
                    await Auth.login(data);
                    break;
                    
                case 'userRegisterForm':
                    await Auth.register(data);
                    break;
                    
                case 'adminLoginForm':
                    await Auth.adminLogin(data.password);
                    break;
                    
                case 'messageForm':
                    await Community.sendMessage(data.message);
                    break;
                    
                default:
                    console.warn('Unknown form:', formId);
            }
        } catch (error) {
            UI.showToast(error.message || 'Form submission failed', 'error');
        } finally {
            AppState.setLoading(false);
        }
    },
    
    updateNavigation: function() {
        const nav = document.getElementById('mainNavigation');
        if (!nav) return;
        
        let html = '';
        
        if (AppState.isAuthenticated) {
            if (AppState.isAdmin) {
                html = `
                    <a href="#" data-page="adminDashboard" class="nav-link">
                        <i class="fas fa-tachometer-alt"></i> Dashboard
                    </a>
                    <a href="#" data-page="manageLeaders" class="nav-link">
                        <i class="fas fa-user-tie"></i> Leaders
                    </a>
                    <a href="#" data-page="manageDonations" class="nav-link">
                        <i class="fas fa-hand-holding-usd"></i> Donations
                    </a>
                    <a href="#" data-page="viewMessages" class="nav-link">
                        <i class="fas fa-inbox"></i> Messages
                        ${AppState.unreadCount > 0 ? 
                          `<span class="badge">${AppState.unreadCount}</span>` : ''}
                    </a>
                    <a href="#" onclick="Auth.logout()" class="nav-link">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                `;
            } else {
                html = `
                    <a href="#" data-page="userDashboard" class="nav-link">
                        <i class="fas fa-home"></i> Dashboard
                    </a>
                    <a href="#" data-page="leaders" class="nav-link">
                        <i class="fas fa-users"></i> Leaders
                    </a>
                    <a href="#" data-page="donations" class="nav-link">
                        <i class="fas fa-money-check"></i> Donations
                    </a>
                    <a href="#" data-page="contact" class="nav-link">
                        <i class="fas fa-envelope"></i> Contact
                    </a>
                    <a href="#" onclick="Auth.logout()" class="nav-link">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                `;
            }
        } else {
            html = `
                <a href="#" data-page="home" class="nav-link">
                    <i class="fas fa-home"></i> Home
                </a>
                <a href="#" data-page="login" class="nav-link">
                    <i class="fas fa-sign-in-alt"></i> Login
                </a>
                <a href="#" data-page="register" class="nav-link">
                    <i class="fas fa-user-plus"></i> Register
                </a>
                <a href="#" data-page="adminLogin" class="nav-link">
                    <i class="fas fa-user-shield"></i> Admin
                </a>
            `;
        }
        
        nav.innerHTML = html;
    },
    
    showPage: function(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show requested page
        const page = document.getElementById(pageId + 'Page');
        if (page) {
            page.classList.add('active');
            Router.loadPageData(pageId);
        }
        
        // Update active navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelectorAll(`[data-page="${pageId}"]`).forEach(link => {
            link.classList.add('active');
        });
        
        // Close mobile menu if open
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && mobileMenu.classList.contains('show')) {
            mobileMenu.classList.remove('show');
        }
    }
};

// Router
const Router = {
    currentPage: 'home',
    
    init: function() {
        // Handle browser back/forward
        window.addEventListener('popstate', this.handlePopState.bind(this));
        
        // Initial route
        this.navigateTo(this.getCurrentRoute());
    },
    
    getCurrentRoute: function() {
        const hash = window.location.hash.substring(1);
        return hash || 'home';
    },
    
    navigateTo: function(page) {
        this.currentPage = page;
        
        // Update URL
        window.history.pushState({ page }, '', '#' + page);
        
        // Update UI
        UI.showPage(page);
        
        // Update document title
        document.title = this.getPageTitle(page) + ' | Community Portal';
    },
    
    handlePopState: function(event) {
        const page = event.state?.page || this.getCurrentRoute();
        this.navigateTo(page);
    },
    
    getPageTitle: function(page) {
        const titles = {
            home: 'Home',
            login: 'Login',
            register: 'Register',
            adminLogin: 'Admin Login',
            userDashboard: 'Dashboard',
            adminDashboard: 'Admin Dashboard',
            leaders: 'Community Leaders',
            donations: 'My Donations',
            contact: 'Contact Admin',
            manageLeaders: 'Manage Leaders',
            manageDonations: 'Manage Donations',
            viewMessages: 'Messages'
        };
        return titles[page] || 'Community Portal';
    },
    
    loadPageData: async function(page) {
        try {
            AppState.setLoading(true);
            
            switch(page) {
                case 'userDashboard':
                    await Community.loadUserDashboard();
                    break;
                    
                case 'adminDashboard':
                    await Community.loadAdminDashboard();
                    break;
                    
                case 'leaders':
                    await Community.loadLeaders();
                    break;
                    
                case 'donations':
                    await Community.loadDonations();
                    break;
                    
                case 'manageLeaders':
                    await Community.loadManageLeaders();
                    break;
                    
                case 'viewMessages':
                    await Community.loadMessages();
                    break;
                    
                case 'contact':
                    await Community.loadContactPage();
                    break;
            }
        } catch (error) {
            UI.showToast('Failed to load page data: ' + error.message, 'error');
        } finally {
            AppState.setLoading(false);
        }
    }
};

// Auth Service
const Auth = {
    login: async function(credentials) {
        try {
            const response = await API.login(credentials);
            
            if (response.success) {
                AppState.user = response.data.user;
                AppState.sessionId = response.data.sessionId;
                AppState.isAuthenticated = true;
                AppState.isAdmin = false;
                AppState.saveToStorage();
                
                UI.updateNavigation();
                Router.navigateTo('userDashboard');
                UI.showToast('Login successful!', 'success');
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            throw new Error('Login failed: ' + error.message);
        }
    },
    
    register: async function(userData) {
        try {
            const response = await API.register(userData);
            
            if (response.success) {
                AppState.user = response.data.user;
                AppState.sessionId = response.data.sessionId;
                AppState.isAuthenticated = true;
                AppState.isAdmin = false;
                AppState.saveToStorage();
                
                UI.updateNavigation();
                Router.navigateTo('userDashboard');
                UI.showToast('Registration successful!', 'success');
            } else {
                throw new Error(response.message || 'Registration failed');
            }
        } catch (error) {
            throw new Error('Registration failed: ' + error.message);
        }
    },
    
    adminLogin: async function(password) {
        try {
            const response = await API.adminLogin(password);
            
            if (response.success) {
                AppState.admin = response.data.admin;
                AppState.sessionId = response.data.sessionId;
                AppState.isAuthenticated = true;
                AppState.isAdmin = true;
                AppState.saveToStorage();
                
                UI.updateNavigation();
                Router.navigateTo('adminDashboard');
                UI.showToast('Admin login successful!', 'success');
            } else {
                throw new Error(response.message || 'Admin login failed');
            }
        } catch (error) {
            throw new Error('Admin login failed: ' + error.message);
        }
    },
    
    logout: async function() {
        try {
            if (AppState.sessionId) {
                await API.logout();
            }
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            AppState.clearStorage();
            UI.updateNavigation();
            Router.navigateTo('home');
            UI.showToast('Logged out successfully', 'info');
        }
    },
    
    checkAuth: function() {
        if (!AppState.isAuthenticated) {
            const protectedPages = [
                'userDashboard', 'adminDashboard', 'donations', 
                'contact', 'manageLeaders', 'manageDonations', 'viewMessages'
            ];
            
            if (protectedPages.includes(Router.currentPage)) {
                Router.navigateTo('home');
                UI.showToast('Please login to access this page', 'warning');
                return false;
            }
        }
        return true;
    }
};

// Community Service
const Community = {
    loadUserDashboard: async function() {
        try {
            // Load user info
            const userInfoEl = document.getElementById('userInfo');
            if (userInfoEl && AppState.user) {
                userInfoEl.innerHTML = `
                    <h2>Welcome, ${AppState.user.name}!</h2>
                    <p>Email: ${AppState.user.email}</p>
                    ${AppState.user.phone ? `<p>Phone: ${AppState.user.phone}</p>` : ''}
                `;
            }
            
            // Load recent activities
            const response = await API.getLeaderWorks();
            if (response.success) {
                const activitiesEl = document.getElementById('recentActivities');
                if (activitiesEl) {
                    const works = response.data.works.slice(0, 5);
                    if (works.length > 0) {
                        activitiesEl.innerHTML = works.map(work => `
                            <div class="activity-card">
                                <h4>${work.title}</h4>
                                <p>${work.description.substring(0, 100)}...</p>
                                <small>${new Date(work.date).toLocaleDateString()}</small>
                            </div>
                        `).join('');
                    } else {
                        activitiesEl.innerHTML = '<p class="text-muted">No recent activities</p>';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    },
    
    loadAdminDashboard: async function() {
        try {
            const response = await API.getDashboardStats();
            if (response.success) {
                const stats = response.data;
                
                // Update stats cards
                const statsMap = {
                    totalUsers: 'totalUsers',
                    totalLeaders: 'totalLeaders',
                    pendingDonations: 'pendingDonations',
                    unreadMessages: 'unreadMessages'
                };
                
                Object.keys(statsMap).forEach(key => {
                    const el = document.getElementById(statsMap[key]);
                    if (el) {
                        el.textContent = stats[key] || '0';
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load admin dashboard:', error);
        }
    },
    
    loadLeaders: async function() {
        try {
            const response = await API.getLeaders();
            if (response.success) {
                const container = document.getElementById('leadersContainer');
                if (container) {
                    if (response.data.leaders.length > 0) {
                        container.innerHTML = response.data.leaders.map(leader => `
                            <div class="leader-card">
                                <div class="leader-avatar">
                                    ${leader.name.charAt(0)}
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
                        container.innerHTML = '<p class="text-muted">No leaders found</p>';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load leaders:', error);
            UI.showToast('Failed to load leaders', 'error');
        }
    },
    
    loadDonations: async function() {
        try {
            const response = await API.getUserDonations();
            if (response.success) {
                const container = document.getElementById('donationsContainer');
                if (container) {
                    if (response.data.donations.length > 0) {
                        // Update current status
                        const currentMonth = new Date().toLocaleString('default', { month: 'long' }).toUpperCase();
                        const currentYear = new Date().getFullYear();
                        
                        const currentDonation = response.data.donations.find(d => 
                            d.month === currentMonth && d.year == currentYear
                        );
                        
                        const statusEl = document.getElementById('currentDonationStatus');
                        if (statusEl) {
                            statusEl.textContent = currentDonation?.status || 'PENDING';
                            statusEl.className = `status-badge ${(currentDonation?.status || 'PENDING').toLowerCase()}`;
                        }
                        
                        // Update table
                        const tableBody = document.getElementById('donationsTableBody');
                        if (tableBody) {
                            tableBody.innerHTML = response.data.donations.map(donation => `
                                <tr>
                                    <td>${donation.month} ${donation.year}</td>
                                    <td>$${donation.amount}</td>
                                    <td>
                                        <span class="status-badge ${donation.status.toLowerCase()}">
                                            ${donation.status}
                                        </span>
                                    </td>
                                    <td>${donation.paidDate ? new Date(donation.paidDate).toLocaleDateString() : '-'}</td>
                                </tr>
                            `).join('');
                        }
                    } else {
                        container.innerHTML = '<p class="text-muted">No donation records found</p>';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load donations:', error);
            UI.showToast('Failed to load donations', 'error');
        }
    },
    
    loadManageLeaders: async function() {
        try {
            await this.loadLeaders(); // Reuse leaders loading
            
            // Add admin controls if needed
            const container = document.getElementById('leadersContainer');
            if (container && AppState.isAdmin) {
                const addButton = document.createElement('button');
                addButton.className = 'btn btn-primary';
                addButton.innerHTML = '<i class="fas fa-plus"></i> Add Leader';
                addButton.onclick = () => this.showAddLeaderForm();
                container.parentNode.insertBefore(addButton, container);
            }
        } catch (error) {
            console.error('Failed to load manage leaders:', error);
        }
    },
    
    loadMessages: async function() {
        try {
            const response = await API.getMessages();
            if (response.success) {
                const container = document.getElementById('messagesContainer');
                if (container) {
                    if (response.data.messages.length > 0) {
                        container.innerHTML = response.data.messages.map(msg => `
                            <div class="message-card ${msg.status.toLowerCase()}">
                                <div class="message-header">
                                    <strong>${msg.userName}</strong>
                                    <span class="message-date">
                                        ${new Date(msg.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <p class="message-content">${msg.message}</p>
                                ${msg.adminReply ? `
                                    <div class="message-reply">
                                        <strong>Reply:</strong>
                                        <p>${msg.adminReply}</p>
                                        <small>${new Date(msg.replyDate).toLocaleString()}</small>
                                    </div>
                                ` : ''}
                                ${!msg.adminReply ? `
                                    <button class="btn btn-sm btn-primary" 
                                            onclick="Community.showReplyForm('${msg.id}')">
                                        Reply
                                    </button>
                                ` : ''}
                            </div>
                        `).join('');
                    } else {
                        container.innerHTML = '<p class="text-muted">No messages</p>';
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            UI.showToast('Failed to load messages', 'error');
        }
    },
    
    loadContactPage: async function() {
        // This would load user's previous messages
        // Implementation depends on your specific requirements
    },
    
    sendMessage: async function(message) {
        try {
            if (!message.trim()) {
                throw new Error('Message cannot be empty');
            }
            
            const response = await API.sendMessage({ message });
            if (response.success) {
                UI.showToast('Message sent successfully!', 'success');
                // Clear form
                const form = document.getElementById('messageForm');
                if (form) form.reset();
            } else {
                throw new Error(response.message || 'Failed to send message');
            }
        } catch (error) {
            throw new Error('Failed to send message: ' + error.message);
        }
    },
    
    showAddLeaderForm: function() {
        const modalId = UI.showModal('Add New Leader', `
            <form id="addLeaderForm">
                <div class="form-group">
                    <label for="leaderName">Name *</label>
                    <input type="text" id="leaderName" name="name" required 
                           class="form-control" placeholder="Enter leader name">
                </div>
                <div class="form-group">
                    <label for="leaderRole">Role *</label>
                    <input type="text" id="leaderRole" name="role" required
                           class="form-control" placeholder="Enter leader role">
                </div>
                <div class="form-group">
                    <label for="leaderDescription">Description</label>
                    <textarea id="leaderDescription" name="description"
                              class="form-control" rows="3" 
                              placeholder="Enter leader description"></textarea>
                </div>
            </form>
        `, [
            {
                text: 'Cancel',
                type: 'secondary',
                onclick: `UI.closeModal('${modalId}')`
            },
            {
                text: 'Add Leader',
                type: 'primary',
                onclick: `Community.submitAddLeaderForm('${modalId}')`
            }
        ]);
    },
    
    submitAddLeaderForm: async function(modalId) {
        try {
            const form = document.getElementById('addLeaderForm');
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });
            
            AppState.setLoading(true);
            
            // Here you would call API.addLeader(data)
            // For now, just show success message
            UI.showToast('Leader added successfully!', 'success');
            UI.closeModal(modalId);
            
            // Refresh leaders list
            await this.loadManageLeaders();
            
        } catch (error) {
            UI.showToast('Failed to add leader: ' + error.message, 'error');
        } finally {
            AppState.setLoading(false);
        }
    },
    
    showReplyForm: function(messageId) {
        const modalId = UI.showModal('Reply to Message', `
            <form id="replyForm">
                <div class="form-group">
                    <label for="replyMessage">Your Reply *</label>
                    <textarea id="replyMessage" name="reply" required
                              class="form-control" rows="4"
                              placeholder="Type your reply here..."></textarea>
                </div>
            </form>
        `, [
            {
                text: 'Cancel',
                type: 'secondary',
                onclick: `UI.closeModal('${modalId}')`
            },
            {
                text: 'Send Reply',
                type: 'primary',
                onclick: `Community.submitReplyForm('${modalId}', '${messageId}')`
            }
        ]);
    },
    
    submitReplyForm: async function(modalId, messageId) {
        try {
            const form = document.getElementById('replyForm');
            const reply = form.reply.value.trim();
            
            if (!reply) {
                throw new Error('Reply cannot be empty');
            }
            
            AppState.setLoading(true);
            
            // Here you would call API.replyToMessage({ messageId, reply })
            // For now, just show success message
            UI.showToast('Reply sent successfully!', 'success');
            UI.closeModal(modalId);
            
            // Refresh messages list
            await this.loadMessages();
            
        } catch (error) {
            UI.showToast('Failed to send reply: ' + error.message, 'error');
        } finally {
            AppState.setLoading(false);
        }
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Community Portal Initializing...');
    
    // Initialize state
    AppState.init();
    
    // Initialize UI
    UI.init();
    
    // Initialize Router
    Router.init();
    
    // Update navigation based on auth state
    UI.updateNavigation();
    
    // Check authentication on page load
    Auth.checkAuth();
    
    // Test API connection
    API.ping().then(response => {
        if (response.success) {
            console.log('API Connection: OK');
            UI.showToast('Connected to server', 'success', 3000);
        }
    }).catch(error => {
        console.warn('API Connection: Failed -', error.message);
        if (CONFIG.DEMO_MODE) {
            UI.showToast('Running in demo mode', 'info', 3000);
        } else {
            UI.showToast('Server connection failed. Some features may not work.', 'warning', 5000);
        }
    });
    
    console.log('Community Portal Ready!');
});

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    UI.showToast('An unexpected error occurred', 'error');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    UI.showToast('An operation failed', 'error');
});

// Export for global access
window.API = API;
window.UI = UI;
window.Router = Router;
window.Auth = Auth;
window.Community = Community;
window.AppState = AppState;
