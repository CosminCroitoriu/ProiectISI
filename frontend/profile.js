// Check if user is logged in
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    // Not logged in, redirect to login page
    window.location.href = 'index.html';
}

// Back to map button
document.getElementById('backToMapBtn').addEventListener('click', () => {
    window.location.href = 'map.html';
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

// Fetch and display profile
async function loadProfile() {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('errorMessage');
    const detailsDiv = document.getElementById('profileDetails');
    
    try {
        const response = await fetch('http://localhost:5000/api/user/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to load profile');
        }
        
        if (data.success && data.user) {
            // Hide loading, show details
            loadingDiv.style.display = 'none';
            detailsDiv.style.display = 'block';
            
            // Display profile data
            const userData = data.user;
            
            // Set avatar initial (first letter of username)
            const initial = userData.username.charAt(0).toUpperCase();
            document.getElementById('avatarInitial').textContent = initial;
            
            // Set header username
            document.getElementById('profileUsername').textContent = userData.username;
            
            // Set profile details
            document.getElementById('userId').textContent = userData.id;
            document.getElementById('username').textContent = userData.username;
            document.getElementById('email').textContent = userData.email;
            document.getElementById('reputationScore').textContent = userData.reputation_score || 0;
            
            // Format created_at date
            const createdDate = new Date(userData.created_at);
            const formattedDate = createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById('createdAt').textContent = formattedDate;
            
        } else {
            throw new Error('Invalid response from server');
        }
        
    } catch (error) {
        console.error('Profile error:', error);
        
        // Hide loading, show error
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = `Error loading profile: ${error.message}`;
        
        // If token is invalid/expired, redirect to login
        if (error.message.includes('token') || error.message.includes('expired')) {
            setTimeout(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            }, 2000);
        }
    }
}

// Load profile on page load
loadProfile();

