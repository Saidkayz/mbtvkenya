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

    /* ── Toast notification system ──────────────────────────────────────── */
    const _injectToastStyles = () => {
        if (document.getElementById('mbtv-toast-styles')) return;
        const style = document.createElement('style');
        style.id = 'mbtv-toast-styles';
        style.textContent = `
            #mbtv-toast-root {
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                gap: 0.6rem;
                pointer-events: none;
            }
            .mbtv-toast {
                display: flex;
                align-items: center;
                gap: 0.65rem;
                min-width: 280px;
                max-width: 380px;
                padding: 0.85rem 1.1rem;
                border-radius: 0.75rem;
                font-family: 'Work Sans', sans-serif;
                font-size: 0.72rem;
                font-weight: 700;
                letter-spacing: 0.04em;
                text-transform: uppercase;
                line-height: 1.4;
                border: 1px solid;
                pointer-events: all;
                cursor: default;
                backdrop-filter: blur(12px);
                box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3);
                transform: translateX(calc(100% + 2rem));
                opacity: 0;
                transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                            opacity 0.25s ease;
            }
            .mbtv-toast.visible {
                transform: translateX(0);
                opacity: 1;
            }
            .mbtv-toast.hiding {
                transform: translateX(calc(100% + 2rem));
                opacity: 0;
                transition: transform 0.25s ease, opacity 0.2s ease;
            }
            .mbtv-toast__icon {
                font-size: 1.1rem;
                flex-shrink: 0;
                font-family: 'Material Symbols Outlined';
                font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20;
            }
            .mbtv-toast__msg { flex: 1; }
            .mbtv-toast__close {
                font-family: 'Material Symbols Outlined';
                font-variation-settings: 'FILL' 0, 'wght'300, 'GRAD' 0, 'opsz' 20;
                font-size: 0.9rem;
                flex-shrink: 0;
                opacity: 0.5;
                cursor: pointer;
                transition: opacity 0.15s;
            }
            .mbtv-toast__close:hover { opacity: 1; }
            /* Type variants */
            .mbtv-toast--success {
                background: rgba(16, 185, 129, 0.12);
                border-color: rgba(16, 185, 129, 0.3);
                color: #34d399;
            }
            .mbtv-toast--error {
                background: rgba(255, 180, 171, 0.1);
                border-color: rgba(255, 180, 171, 0.3);
                color: #ffb4ab;
            }
            .mbtv-toast--warning {
                background: rgba(227, 194, 134, 0.12);
                border-color: rgba(227, 194, 134, 0.3);
                color: #e3c286;
            }
            .mbtv-toast--info {
                background: rgba(159, 204, 239, 0.1);
                border-color: rgba(159, 204, 239, 0.25);
                color: #9fccef;
            }
        `;
        document.head.appendChild(style);
    };

    const _injectSkeletonStyles = () => {
        if (document.getElementById('mbtv-skeleton-styles')) return;
        const style = document.createElement('style');
        style.id = 'mbtv-skeleton-styles';
        style.textContent = `
            @keyframes mbtv-skeleton-loading {
                0% { background-color: rgba(255, 255, 255, 0.03); }
                50% { background-color: rgba(255, 255, 255, 0.08); }
                100% { background-color: rgba(255, 255, 255, 0.03); }
            }
            .mbtv-skeleton {
                animation: mbtv-skeleton-loading 1.8s infinite ease-in-out;
                border-radius: 0.5rem;
                display: inline-block;
                width: 100%;
                height: 1rem;
                vertical-align: middle;
            }
            .mbtv-skeleton--circle { border-radius: 50%; }
        `;
        document.head.appendChild(style);
    };

    /**
     * Generates HTML for a skeleton loader.
     * @param {string} height - CSS height (e.g., '1rem', '20px')
     * @param {string} width - CSS width (e.g., '100%', '50px')
     * @param {string} extraClasses - additional classes
     */
    const skeleton = (height = '1rem', width = '100%', extraClasses = '') => {
        return `<div class="mbtv-skeleton ${extraClasses}" style="height: ${height}; width: ${width};"></div>`;
    };

    const _createToastRoot = () => {
        let root = document.getElementById('mbtv-toast-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'mbtv-toast-root';
            document.body.appendChild(root);
        }
        return root;
    };

    const _TOAST_ICONS = {
        success: 'check_circle',
        error:   'error',
        warning: 'warning',
        info:    'info'
    };

    const showToast = (message, type = 'info', duration = 3500) => {
        _injectToastStyles();
        const root = _createToastRoot();

        const toast = document.createElement('div');
        toast.className = `mbtv-toast mbtv-toast--${type}`;
        toast.innerHTML = `
            <span class="mbtv-toast__icon">${_TOAST_ICONS[type] || 'info'}</span>
            <span class="mbtv-toast__msg">${message}</span>
            <span class="mbtv-toast__close">close</span>
        `;

        const dismiss = () => {
            toast.classList.add('hiding');
            toast.classList.remove('visible');
            window.setTimeout(() => toast.remove(), 300);
        };

        toast.querySelector('.mbtv-toast__close').addEventListener('click', dismiss);
        root.appendChild(toast);

        // Trigger entrance animation
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => toast.classList.add('visible'));
        });

        // Auto-dismiss
        window.setTimeout(dismiss, duration);
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
        _injectSkeletonStyles();
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
        renderNavUser,
        skeleton,
        get user() { return getCurrentUser(); }
    };
})();

