const Auth = {
    getToken: () => localStorage.getItem('crm_token'),
    getUser: () => JSON.parse(localStorage.getItem('crm_user')),

    setSession: (token, user) => {
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(user));
    },

    logout: () => {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        window.location.href = 'login.html';
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('crm_token');
    },

    checkAuth: () => {
        const path = window.location.pathname;
        const isAuthPage = path.includes('login.html') || path.includes('register.html');
        const authenticated = Auth.isAuthenticated();
        const user = Auth.getUser();

        console.log('[Auth] Path:', path, '| isAuthPage:', isAuthPage, '| Authenticated:', authenticated);

        if (!authenticated && !isAuthPage) {
            console.log('[Auth] Redirecting to login.html');
            window.location.href = 'login.html';
            return;
        }

        // Show admin elements if admin
        if (authenticated && user && user.role === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        }
    },

    getAuthHeader: () => {
        const token = Auth.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};
