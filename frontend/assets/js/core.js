/* MBTV Kenya Shared Core JS
   Contains common utilities used across all independent script files.
*/

const MBTV_CORE = (() => {
    const getApiUrl = (endpoint) => {
        const isPage = window.location.pathname.includes('/pages/');
        return isPage ? `../../server/Core/${endpoint}` : `../server/Core/${endpoint}`;
    };

    const endpoints = {
        login: getApiUrl('users.php'),
        signup: getApiUrl('users.php'),
        verifyOtp: getApiUrl('users.php'),
        users: getApiUrl('users.php'),
        equipment: getApiUrl('equipment.php'),
        equipmentCheckout: getApiUrl('equipment.php'),
        videos: getApiUrl('videos.php'),
        categories: getApiUrl('video-categories.php'),
        smsSettings: getApiUrl('sms.php'),
        smsTest: getApiUrl('sms.php'),
        smsNotifications: getApiUrl('sms.php'),
        reports: getApiUrl('reports.php'),
        logout: getApiUrl('logout.php')
    };

    const getCurrentUser = () => {
        const userStr = localStorage.getItem('mbtv_user');
        return userStr ? JSON.parse(userStr) : null;
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

    return {
        endpoints,
        getCurrentUser,
        checkAuth,
        fetchJson,
        showToast,
        serializeForm
    };
})();

