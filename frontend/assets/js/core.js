/* MBTV Kenya Shared Core JS
   Contains common utilities used across all independent script files.
*/

const MBTV_CORE = (() => {
    // ─── Session configuration ────────────────────────────────────────────────
    const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

    const getApiUrl = (endpoint) => {
        const isPage = window.location.pathname.includes('/pages/');
        return isPage ? `../../server/Core/${endpoint}` : `../server/Core/${endpoint}`;
    };

    const endpoints = {
        login:             getApiUrl('users.php'),
        signup:            getApiUrl('users.php'),
        verifyOtp:         getApiUrl('users.php'),
        users:             getApiUrl('users.php'),
        equipment:         getApiUrl('equipment.php'),
        equipmentCheckout: getApiUrl('equipment.php'),
        videos:            getApiUrl('videos.php'),
        categories:        getApiUrl('video-categories.php'),
        smsSettings:       getApiUrl('sms.php'),
        smsTest:           getApiUrl('sms.php'),
        smsNotifications:  getApiUrl('sms.php'),
        reports:           getApiUrl('reports.php'),
        dashboard:         getApiUrl('dashboard.php'),
        logout:            getApiUrl('logout.php')
    };

    /**
     * Returns the current user object from localStorage, or null if the
     * session has expired (sliding window: 24 h since last page load).
     * On a valid session the lastActive timestamp is refreshed.
     */
    const getCurrentUser = () => {
        const userStr = localStorage.getItem('mbtv_user');
        if (!userStr) return null;

        let user;
        try {
            user = JSON.parse(userStr);
        } catch {
            localStorage.removeItem('mbtv_user');
            return null;
        }

        const now = Date.now();
        const lastActive = user.lastActive || user.loginTime || 0;

        if (now - lastActive > SESSION_DURATION_MS) {
            // Session expired – clear and return null
            localStorage.removeItem('mbtv_user');
            return null;
        }

        // Slide the window forward on every page load
        user.lastActive = now;
        localStorage.setItem('mbtv_user', JSON.stringify(user));
        return user;
    };

    const checkAuth = () => {
        const user = getCurrentUser();
        const path = window.location.pathname;
        const publicPages = ['/index.html', '/login.html', '/about.html', '/contact.html', '/program.html', '/'];

        if (!user && !publicPages.some(p => path.endsWith(p))) {
            const isPage = window.location.pathname.includes('/pages/');
            window.location.href = isPage ? '../index.html' : 'index.html';
        }
    };

    const fetchJson = async (url, options = {}) => {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            ...options,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Request failed: ${response.status}`);
        }

        return response.json();
    };

    const showToast = (message, type = 'info') => {
        const toastRoot = document.getElementById('mbtv-toast-root') || createToastRoot();
        const toast = document.createElement('div');
        toast.className = `mbtv-toast mbtv-toast--${type}`;
        toast.textContent = message;
        toastRoot.appendChild(toast);
        window.setTimeout(() => toast.classList.add('visible'), 10);
        window.setTimeout(() => {
            toast.classList.remove('visible');
            window.setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    const createToastRoot = () => {
        const root = document.getElementById('mbtv-toast-root') || (() => {
            const r = document.createElement('div');
            r.id = 'mbtv-toast-root';
            r.style.position = 'fixed';
            r.style.bottom = '1rem';
            r.style.right = '1rem';
            r.style.zIndex = '9999';
            document.body.appendChild(r);
            return r;
        })();
        return root;
    };

    const serializeForm = (form) => {
        const data = {};
        new FormData(form).forEach((value, key) => {
            data[key] = value;
        });
        return data;
    };

    const renderNavUser = () => {
        const user = getCurrentUser();
        if (!user) return;

        const nameEl = document.getElementById('nav-user-name');
        const roleEl = document.getElementById('nav-user-role');

        if (nameEl) nameEl.textContent = user.full_name || user.username || 'Unknown';
        if (roleEl) roleEl.textContent = user.role_name || '—';

        // Role-based visibility
        const userRole = (user.role_name || '').trim();
        if (userRole === 'Chief IT') {
            document.querySelectorAll('.chief-only').forEach(el => el.classList.remove('hidden'));
        } else {
            document.querySelectorAll('.chief-only').forEach(el => el.remove());
        }
    };

    // ─── Activity Listener ───────────────────────────────────────────────────
    const refreshSessionOnActivity = () => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(name => {
            document.addEventListener(name, () => {
                // Throttle refresh to once every 60 seconds
                const now = Date.now();
                const lastRefresh = parseInt(localStorage.getItem('mbtv_last_refresh') || '0');
                if (now - lastRefresh > 60000) {
                    const user = getCurrentUser();
                    if (user) {
                        localStorage.setItem('mbtv_last_refresh', now.toString());
                    }
                }
            }, { passive: true });
        });
    };

    // Auto-init
    document.addEventListener('DOMContentLoaded', () => {
        checkAuth();
        renderNavUser();
        refreshSessionOnActivity();
    });

    return {
        endpoints,
        getCurrentUser,
        checkAuth,
        fetchJson,
        showToast,
        serializeForm,
        renderNavUser
    };
})();

