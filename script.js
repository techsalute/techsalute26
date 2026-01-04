// Configuration
const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzJAOZo9UBDb8YcTIwv5EG0w7GsPKbwkO2IY4RCTh3VnYLmtd5ApiY6uj52FwulD8q1/exec', // Replace with your deployed URL
    USER_KEY: 'community_user',
    ADMIN_KEY: 'community_admin',
    MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 
             'July', 'August', 'September', 'October', 'November', 'December']
};

// State Management
let currentUser = null;
let currentAdmin = false;
let leaders = [];
let leaderWorks = [];
let donations = [];
let messages = [];

// DOM Elements
const navLinks = document.getElementById('navLinks');
const mainContent = document.getElementById('mainContent');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    setupEventListeners();
    showPage('homePage');
});

// Check Login Status
function checkLoginStatus() {
    const user = localStorage.getItem(CONFIG.USER_KEY);
    const admin = localStorage.getItem(CONFIG.ADMIN_KEY);
    
    if (user) {
        currentUser = JSON.parse(user);
        updateNavigation('user');
    } else if (admin) {
        currentAdmin = true;
        updateNavigation('admin');
    } else {
        updateNavigation('guest');
    }
}

// Update Navigation
function updateNavigation(role) {
    navLinks.innerHTML = '';
    
    switch(role) {
        case 'user':
            navLinks.innerHTML = `
                <a href="#" class="nav-link" onclick="showPage('userDashboard')">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
                <a href="#" class="nav-link" onclick="showPage('leadersPage')">
                    <i class="fas fa-user-tie"></i> Leaders
                </a>
                <a href="#" class="nav-link" onclick="showPage('donationStatus')">
                    <i class="fas fa-hand-holding-usd"></i> Donations
                </a>
                <a href="#" class="nav-link" onclick="showPage('contactAdmin')">
                    <i class="fas fa-comments"></i> Contact
                </a>
                <a href="#" class="nav-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
            break;
            
        case 'admin':
            navLinks.innerHTML = `
                <a href="#" class="nav-link" onclick="showPage('adminDashboard')">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
                <a href="#" class="nav-link" onclick="showPage('manageLeaders')">
                    <i class="fas fa-user-tie"></i> Manage Leaders
                </a>
                <a href="#" class="nav-link" onclick="showPage('manageDonations')">
                    <i class="fas fa-hand-holding-usd"></i> Donations
                </a>
                <a href="#" class="nav-link" onclick="showPage('viewMessages')">
                    <i class="fas fa-envelope"></i> Messages
                </a>
                <a href="#" class="nav-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
            break;
            
        default:
            navLinks.innerHTML = `
                <a href="#" class="nav-link" onclick="showPage('homePage')">
                    <i class="fas fa-home"></i> Home
                </a>
                <a href="#" class="nav-link" onclick="showPage('userLogin')">
                    <i class="fas fa-sign-in-alt"></i> Member Login
                </a>
                <a href="#" class="nav-link" onclick="showPage('adminLogin')">
                    <i class="fas fa-user-shield"></i> Admin Login
                </a>
            `;
    }
    
    // Mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Page Navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        
        // Load page-specific data
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
            case 'manageLeaders':
                loadManageLeaders();
                break;
            case 'donationStatus':
                loadDonationStatus();
                break;
            case 'manageDonations':
                loadManageDonations();
                break;
            case 'contactAdmin':
                loadUserMessages();
                break;
            case 'viewMessages':
                loadAllMessages();
                break;
            case 'addLeaderWork':
                loadLeadersForWork();
                break;
        }
    }
    
    // Close mobile menu
    navLinks.classList.remove('active');
}

function goBack() {
    if (currentAdmin) {
        showPage('adminDashboard');
    } else if (currentUser) {
        showPage('userDashboard');
    } else {
        showPage('homePage');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // User Login
    document.getElementById('userLoginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;
        
        const response = await callAPI('loginUser', { email, password });
        
        if (response.success) {
            currentUser = response.user;
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(currentUser));
            updateNavigation('user');
            showPage('userDashboard');
            showToast('Login successful!', 'success');
        } else {
            showToast(response.message, 'error');
        }
    });
    
    // User Registration
    document.getElementById('userRegisterForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userData = {
            name: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
            password: document.getElementById('regPassword').value,
            phone: document.getElementById('regPhone').value,
            address: document.getElementById('regAddress').value
        };
        
        const response = await callAPI('registerUser', userData);
        
        if (response.success) {
            showToast('Registration successful! Please login.', 'success');
            showPage('userLogin');
            document.getElementById('userLoginForm').reset();
        } else {
            showToast(response.message, 'error');
        }
    });
    
    // Admin Login
    document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        
        const response = await callAPI('loginAdmin', { password });
        
        if (response.success) {
            currentAdmin = true;
            localStorage.setItem(CONFIG.ADMIN_KEY, 'true');
            updateNavigation('admin');
            showPage('adminDashboard');
            showToast('Admin login successful!', 'success');
        } else {
            showToast(response.message, 'error');
        }
    });
    
    // Add Leader Form
    document.getElementById('addLeaderForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const leaderData = {
            name: document.getElementById('leaderName').value,
            role: document.getElementById('leaderRole').value,
            description: document.getElementById('leaderDesc').value
        };
        
        const response = await callAPI('addLeader', leaderData);
        
        if (response.success) {
            showToast('Leader added successfully!', 'success');
            closeModal();
            loadManageLeaders();
            document.getElementById('addLeaderForm').reset();
        } else {
            showToast(response.message, 'error');
        }
    });
    
    // Edit Leader Form
    document.getElementById('editLeaderForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const leaderData = {
            leaderId: document.getElementById('editLeaderId').value,
            name: document.getElementById('editLeaderName').value,
            role: document.getElementById('editLeaderRole').value,
            description: document.getElementById('editLeaderDesc').value,
            status: document.getElementById('editLeaderStatus').value
        };
        
        const response = await callAPI('updateLeader', leaderData);
        
        if (response.success) {
            showToast('Leader updated successfully!', 'success');
            closeModal();
            loadManageLeaders();
        } else {
            showToast(response.message, 'error');
        }
    });
    
    // Add Work Form
    document.getElementById('addWorkForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const workData = {
            leaderId: document.getElementById('workLeader').value,
            title: document.getElementById('workTitle').value,
            description: document.getElementById('workDescription').value,
            date: document.getElementById('workDate').value
        };
        
        const response = await callAPI('addLeaderWork', workData);
        
        if (response.success) {
            showToast('Work added successfully!', 'success');
            document.getElementById('addWorkForm').reset();
        } else {
            showToast(response.message, 'error');
        }
    });
    
    // Message Form
    document.getElementById('messageForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('messageContent').value;
        
        const response = await callAPI('sendMessage', {
            userId: currentUser.id,
            message: message
        });
        
        if (response.success) {
            showToast('Message sent successfully!', 'success');
            document.getElementById('messageContent').value = '';
            loadUserMessages();
        } else {
            showToast(response.message, 'error');
        }
    });
}

// API Call Function
async function callAPI(method, data = {}) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: method,
                ...data
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            message: 'Network error. Please try again.'
        };
    }
}

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Modal Functions
function showAddLeaderModal() {
    document.getElementById('addLeaderModal').classList.add('active');
}

function showEditLeaderModal(leader) {
    document.getElementById('editLeaderId').value = leader.id;
    document.getElementById('editLeaderName').value = leader.name;
    document.getElementById('editLeaderRole').value = leader.role;
    document.getElementById('editLeaderDesc').value = leader.description;
    document.getElementById('editLeaderStatus').value = leader.status;
    document.getElementById('editLeaderModal').classList.add('active');
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Delete Leader
async function deleteLeader() {
    const leaderId = document.getElementById('editLeaderId').value;
    
    if (confirm('Are you sure you want to delete this leader?')) {
        const response = await callAPI('deleteLeader', { leaderId });
        
        if (response.success) {
            showToast('Leader deleted successfully!', 'success');
            closeModal();
            loadManageLeaders();
        } else {
            showToast(response.message, 'error');
        }
    }
}

// Load User Dashboard
async function loadUserDashboard() {
    if (!currentUser) return;
    
    document.getElementById('userName').textContent = currentUser.name;
    
    // Load recent activities
    const worksResponse = await callAPI('getLeaderWorks');
    if (worksResponse.success) {
        leaderWorks = worksResponse.works;
        const activitiesContainer = document.getElementById('userRecentActivities');
        activitiesContainer.innerHTML = '';
        
        // Show latest 5 activities
        const recentWorks = leaderWorks.slice(0, 5);
        recentWorks.forEach(work => {
            const leader = leaders.find(l => l.id === work.leaderId);
            const activityCard = `
                <div class="activity-card">
                    <div class="activity-header">
                        <strong>${work.title}</strong>
                        <span class="activity-date">${formatDate(work.date)}</span>
                    </div>
                    <p>${work.description}</p>
                    <small>By: ${leader ? leader.name : 'Unknown Leader'}</small>
                </div>
            `;
            activitiesContainer.innerHTML += activityCard;
        });
    }
}

// Load Admin Dashboard
async function loadAdminDashboard() {
    const leadersResponse = await callAPI('getLeaders');
    const messagesResponse = await callAPI('getMessages');
    
    if (leadersResponse.success) {
        leaders = leadersResponse.leaders;
        document.getElementById('totalLeaders').textContent = leaders.length;
    }
    
    if (messagesResponse.success) {
        messages = messagesResponse.messages;
        const unreadMessages = messages.filter(m => m.readStatus === 'Unread');
        document.getElementById('totalMessages').textContent = unreadMessages.length;
    }
    
    // In a real app, you would also load donation statistics
}

// Load Leaders
async function loadLeaders() {
    const response = await callAPI('getLeaders');
    
    if (response.success) {
        leaders = response.leaders;
        const container = document.getElementById('leadersList');
        container.innerHTML = '';
        
        leaders.forEach(leader => {
            if (leader.status === 'Active') {
                const leaderCard = `
                    <div class="leader-card">
                        <div class="leader-header">
                            <div class="leader-avatar">
                                ${leader.name.charAt(0)}
                            </div>
                            <div class="leader-info">
                                <h3>${leader.name}</h3>
                                <p class="role">${leader.role}</p>
                                <span class="leader-status status-${leader.status.toLowerCase()}">
                                    ${leader.status}
                                </span>
                            </div>
                        </div>
                        <p>${leader.description}</p>
                    </div>
                `;
                container.innerHTML += leaderCard;
            }
        });
    }
}

// Load Manage Leaders (Admin)
async function loadManageLeaders() {
    const response = await callAPI('getLeaders');
    
    if (response.success) {
        leaders = response.leaders;
        const container = document.getElementById('adminLeadersList');
        container.innerHTML = '';
        
        leaders.forEach(leader => {
            const leaderCard = `
                <div class="leader-card" onclick="showEditLeaderModal(${JSON.stringify(leader).replace(/"/g, '&quot;')})">
                    <div class="leader-header">
                        <div class="leader-avatar">
                            ${leader.name.charAt(0)}
                        </div>
                        <div class="leader-info">
                            <h3>${leader.name}</h3>
                            <p class="role">${leader.role}</p>
                            <span class="leader-status status-${leader.status.toLowerCase()}">
                                ${leader.status}
                            </span>
                        </div>
                    </div>
                    <p>${leader.description}</p>
                </div>
            `;
            container.innerHTML += leaderCard;
        });
    }
}

// Load Leaders for Work Form
async function loadLeadersForWork() {
    const response = await callAPI('getLeaders');
    
    if (response.success) {
        const select = document.getElementById('workLeader');
        select.innerHTML = '<option value="">Select a leader</option>';
        
        response.leaders.forEach(leader => {
            if (leader.status === 'Active') {
                select.innerHTML += `<option value="${leader.id}">${leader.name} - ${leader.role}</option>`;
            }
        });
    }
}

// Load Donation Status
async function loadDonationStatus() {
    if (!currentUser) return;
    
    const response = await callAPI('getUserDonations', { userId: currentUser.id });
    
    if (response.success) {
        donations = response.donations;
        
        // Set current month/year
        const now = new Date();
        const currentMonth = CONFIG.MONTHS[now.getMonth()];
        const currentYear = now.getFullYear();
        
        document.getElementById('currentMonth').textContent = `${currentMonth} ${currentYear}`;
        
        // Find current month donation
        const currentDonation = donations.find(d => 
            d.month === currentMonth && d.year == currentYear
        );
        
        const statusBadge = document.getElementById('currentStatus');
        if (currentDonation) {
            statusBadge.className = `status-badge status-${currentDonation.status.toLowerCase()}`;
            statusBadge.textContent = currentDonation.status;
        } else {
            statusBadge.className = 'status-badge status-unpaid';
            statusBadge.textContent = 'Unpaid';
        }
        
        // Load donation history table
        const tableBody = document.querySelector('#donationTable tbody');
        tableBody.innerHTML = '';
        
        donations.forEach(donation => {
            const row = `
                <tr>
                    <td>${donation.month}</td>
                    <td>${donation.year}</td>
                    <td><span class="status-badge status-${donation.status.toLowerCase()}">${donation.status}</span></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }
}

// Load Manage Donations (Admin)
async function loadManageDonations() {
    // In a real implementation, you would load all users and their donations
    // This is a simplified version
    const container = document.getElementById('donationManagement');
    container.innerHTML = `
        <div class="message-card">
            <p>Donation management interface would display all users with their donation status.</p>
            <p>Admin can update status for each user.</p>
            <p>Search functionality to find specific users.</p>
        </div>
    `;
}

// Search Users
function searchUsers() {
    // Implement user search functionality
    console.log('Searching users...');
}

// Load User Messages
async function loadUserMessages() {
    if (!currentUser) return;
    
    const response = await callAPI('getMessages');
    
    if (response.success) {
        messages = response.messages;
        const userMessages = messages.filter(m => m.userId === currentUser.id);
        const container = document.getElementById('userMessages');
        container.innerHTML = '';
        
        if (userMessages.length === 0) {
            container.innerHTML = '<p>No messages sent yet.</p>';
            return;
        }
        
        userMessages.forEach(msg => {
            const messageCard = `
                <div class="message-card">
                    <div class="message-header">
                        <strong>Message</strong>
                        <span class="message-date">${formatDate(msg.date)}</span>
                    </div>
                    <p>${msg.message}</p>
                </div>
            `;
            container.innerHTML = messageCard;
        });
    }
}

// Load All Messages (Admin)
async function loadAllMessages() {
    const response = await callAPI('getMessages');
    
    if (response.success) {
        messages = response.messages;
        const container = document.getElementById('adminMessages');
        container.innerHTML = '';
        
        if (messages.length === 0) {
            container.innerHTML = '<p>No messages from users.</p>';
            return;
        }
        
        messages.forEach(msg => {
            const messageCard = `
                <div class="message-card ${msg.readStatus === 'Unread' ? 'unread' : ''}">
                    <div class="message-header">
                        <strong>User ID: ${msg.userId}</strong>
                        <span class="message-date">${formatDate(msg.date)}</span>
                    </div>
                    <p>${msg.message}</p>
                    <div class="message-status">
                        Status: ${msg.readStatus}
                    </div>
                </div>
            `;
            container.innerHTML += messageCard;
        });
    }
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Logout
function logout() {
    currentUser = null;
    currentAdmin = false;
    localStorage.removeItem(CONFIG.USER_KEY);
    localStorage.removeItem(CONFIG.ADMIN_KEY);
    updateNavigation('guest');
    showPage('homePage');
    showToast('Logged out successfully!', 'success');
}

// Initialize date field with today's date
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    const dateField = document.getElementById('workDate');
    if (dateField) {
        dateField.value = today;
        dateField.min = '2020-01-01';
        dateField.max = today;
    }
});