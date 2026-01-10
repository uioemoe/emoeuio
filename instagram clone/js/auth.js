import { supabaseClient } from './supabase.js';

class Auth {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check current session
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            await this.loadUserProfile();
        }
        
        // Listen for auth changes
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                await this.loadUserProfile();
                this.redirectIfNeeded();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                window.location.href = 'login.html';
            }
        });
    }

    async loadUserProfile() {
        if (!this.currentUser) return;
        
        // Check if user profile exists
        const { data: profile } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
        
        if (!profile) {
            // Create profile if it doesn't exist
            const username = this.currentUser.email.split('@')[0];
            const { error } = await supabaseClient
                .from('users')
                .insert([{
                    id: this.currentUser.id,
                    username: username,
                    display_name: username,
                    profile_picture: null,
                    bio: '',
                    followers_count: 0,
                    following_count: 0,
                    posts_count: 0
                }]);
            
            if (error) {
                console.error('Error creating profile:', error);
            }
        }
    }

    redirectIfNeeded() {
        const currentPage = window.location.pathname;
        if (currentPage.includes('login.html') || currentPage.includes('signup.html')) {
            window.location.href = 'index.html';
        }
    }

    async signUp(email, password, username, displayName) {
        try {
            // Check if username exists
            const { data: existingUser } = await supabaseClient
                .from('users')
                .select('username')
                .eq('username', username)
                .single();
            
            if (existingUser) {
                return { error: { message: 'Username already exists' } };
            }

            // Create auth user
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: username,
                        display_name: displayName
                    }
                }
            });

            if (authError) throw authError;

            // Create user profile
            const { error: profileError } = await supabaseClient
                .from('users')
                .insert([{
                    id: authData.user.id,
                    username: username,
                    display_name: displayName,
                    profile_picture: null,
                    bio: '',
                    followers_count: 0,
                    following_count: 0,
                    posts_count: 0
                }]);

            if (profileError) throw profileError;

            return { data: authData.user, error: null };
        } catch (error) {
            console.error('Signup error:', error);
            return { error };
        }
    }

    async signIn(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            return { error };
        }
        
        this.currentUser = data.user;
        return { data: data.user, error: null };
    }

    async signOut() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            console.error('Signout error:', error);
        }
        window.location.href = 'login.html';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async getCurrentUserProfile() {
        if (!this.currentUser) return null;
        
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', this.currentUser.id)
            .single();
        
        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
        
        return data;
    }
}

// Create singleton instance
const auth = new Auth();

// Initialize auth-related event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('login-btn');
            const errorElement = document.getElementById('error-message');
            
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
            errorElement.textContent = '';
            
            const { error } = await auth.signIn(email, password);
            
            if (error) {
                errorElement.textContent = error.message;
                loginBtn.disabled = false;
                loginBtn.textContent = 'Log In';
            }
        });
    }

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const username = document.getElementById('username').value;
            const displayName = document.getElementById('display-name').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const signupBtn = document.getElementById('signup-btn');
            const errorElement = document.getElementById('error-message');
            
            // Validation
            if (password !== confirmPassword) {
                errorElement.textContent = 'Passwords do not match';
                return;
            }
            
            if (password.length < 6) {
                errorElement.textContent = 'Password must be at least 6 characters';
                return;
            }
            
            signupBtn.disabled = true;
            signupBtn.textContent = 'Creating account...';
            errorElement.textContent = '';
            
            const { error } = await auth.signUp(email, password, username, displayName);
            
            if (error) {
                errorElement.textContent = error.message;
                signupBtn.disabled = false;
                signupBtn.textContent = 'Sign Up';
            }
        });
    }

    // Show password toggle
    const showPasswordBtns = document.querySelectorAll('.show-password');
    showPasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                auth.signOut();
            }
        });
    }

    // Protect authenticated pages
    const authPages = ['index.html', 'profile.html', 'explore.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (authPages.includes(currentPage)) {
        const checkAuth = setInterval(async () => {
            if (!auth.currentUser) {
                clearInterval(checkAuth);
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) {
                    window.location.href = 'login.html';
                }
            }
        }, 100);
    }
});

export { auth };