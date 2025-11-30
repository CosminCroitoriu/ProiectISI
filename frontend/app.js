const form = document.getElementById('authForm');
const messageDiv = document.getElementById('message');
const toggleModeLink = document.getElementById('toggleMode');
const toggleText = document.getElementById('toggleText');
const submitBtn = document.getElementById('submitBtn');
const usernameInput = document.getElementById('username');

const API_URL = 'http://localhost:5000/api';
let isLoginMode = true;

// Toggle between login and register
toggleModeLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        // Switch to login mode
        usernameInput.style.display = 'none';
        usernameInput.removeAttribute('required');
        submitBtn.textContent = 'Login';
        toggleText.textContent = "Don't have an account?";
        toggleModeLink.textContent = 'Sign Up';
    } else {
        // Switch to register mode
        usernameInput.style.display = 'block';
        usernameInput.setAttribute('required', 'required');
        submitBtn.textContent = 'Sign Up';
        toggleText.textContent = 'Already have an account?';
        toggleModeLink.textContent = 'Login';
    }
    
    // Clear message
    messageDiv.className = '';
    messageDiv.textContent = '';
});

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    
    // Validation
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (!isLoginMode && !username) {
        showMessage('Please enter a username', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    // Disable button during request
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = isLoginMode ? 'Logging in...' : 'Creating account...';
    
    try {
        const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
        const body = isLoginMode 
            ? { email, password }
            : { username, email, password };
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (data.success && data.token) {
            // Save token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            const successMessage = isLoginMode 
                ? 'Login successful!' 
                : 'Account created!';
            showMessage(successMessage, 'success');
            
            // Redirect to map immediately
            setTimeout(() => {
                window.location.href = 'map.html';
            }, 500);
        } else {
            showMessage(data.message || 'Request failed', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    } catch (error) {
        console.error('Auth error:', error);
        showMessage('Cannot connect to server. Make sure backend is running on port 5000.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
}

