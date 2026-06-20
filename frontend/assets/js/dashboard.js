/* MBTV Kenya dashboard interaction manager
   Handles button and form behavior across admin dashboard pages.
   Backend APIs must expose the endpoints referenced here to connect to SQL.
*/

const MBTV = (() => {
    const getApiUrl = (endpoint) => {
        const isPage = window.location.pathname.includes('/pages/');
        return isPage ? `../api/${endpoint}` : `api/${endpoint}`;
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
        
        // If unauthenticated and on a private page, redirect to index
        if (!user && !publicPages.some(p => path.endsWith(p))) {
            const isPage = window.location.pathname.includes('/pages/');
            window.location.href = isPage ? '../index.html' : 'index.html';
        }

        // If authenticated as a normal user trying to CRUD on admin.html
        if (user && path.endsWith('admin.html') && user.role_name !== 'Chief IT') {
             // We allow view, but hide CRUD elements in init
        }
    };

    const setAdminUI = () => {
        const user = getCurrentUser();
        if (!user) return;

        const isChief = user.role_name === 'Chief IT';
        
        // Hide/Show elements based on role
        document.querySelectorAll('.chief-only').forEach(el => {
            el.classList.toggle('hidden', !isChief);
        });

        if (isChief && document.getElementById('user-management-table')) {
            loadUserManagement();
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
        const root = document.createElement('div');
        root.id = 'mbtv-toast-root';
        root.style.position = 'fixed';
        root.style.bottom = '1rem';
        root.style.right = '1rem';
        root.style.zIndex = '9999';
        document.body.appendChild(root);
        return root;
    };

    const serializeForm = (form) => {
        const data = {};
        new FormData(form).forEach((value, key) => {
            data[key] = value;
        });
        return data;
    };

    const bindLoginForm = () => {
        const loginForm = document.querySelector('form#login-form');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = serializeForm(loginForm);
            payload.action = 'login';
            try {
                const result = await fetchJson(endpoints.login, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                localStorage.setItem('mbtv_user', JSON.stringify(result.user));
                showToast('Login successful', 'success');
                
                if (result.user.role_name === 'Chief IT') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'program.html';
                }
            } catch (error) {
                document.getElementById('login-error')?.classList.remove('hidden');
                showToast(error.message || 'Login failed', 'error');
            }
        });
    };

    const switchAuthPanel = (panelId) => {
        const panels = ['login-panel', 'signup-panel', 'otp-panel'];
        const buttons = {
            'login-panel': document.getElementById('auth-login-btn'),
            'signup-panel': document.getElementById('auth-signup-btn'),
        };

        panels.forEach((id) => {
            const panel = document.getElementById(id);
            if (panel) {
                panel.classList.toggle('hidden', id !== panelId);
            }
        });

        Object.entries(buttons).forEach(([id, button]) => {
            if (!button) return;
            button.classList.toggle('bg-primary', id === panelId);
            button.classList.toggle('text-on-primary', id === panelId);
            button.classList.toggle('bg-surface-container-lowest', id !== panelId);
            button.classList.toggle('text-on-surface', id !== panelId);
        });
    };

    const bindAuthModeToggle = () => {
        const loginTab = document.getElementById('auth-login-btn');
        const signupTab = document.getElementById('auth-signup-btn');
        const backToSignup = document.getElementById('otp-back-to-signup');

        loginTab?.addEventListener('click', () => switchAuthPanel('login-panel'));
        signupTab?.addEventListener('click', () => switchAuthPanel('signup-panel'));
        backToSignup?.addEventListener('click', () => switchAuthPanel('signup-panel'));

        // ensure the login panel is visible by default
        switchAuthPanel('login-panel');
    };

    const bindSignupForm = () => {
        const signupForm = document.querySelector('form#signup-form');
        if (!signupForm) return;

        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = serializeForm(signupForm);
            const password = payload.password?.trim();
            const confirmPassword = payload.confirm_password?.trim();
            const errorPanel = document.getElementById('signup-error');

            if (!password || password !== confirmPassword) {
                errorPanel?.classList.remove('hidden');
                showToast('Passwords must match', 'error');
                return;
            }

            delete payload.confirm_password;
            payload.action = 'register';

            try {
                const result = await fetchJson(endpoints.signup, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });

                document.getElementById('verification_id').value = result.verification_id || '';
                const infoDisplay = document.getElementById('otp-info');
                if (infoDisplay) {
                    infoDisplay.textContent = result.contact_message || 'A verification code was sent to your account contact details.';
                }

                errorPanel?.classList.add('hidden');
                showToast('Verification code sent', 'success');
                switchAuthPanel('otp-panel');
            } catch (error) {
                errorPanel?.classList.remove('hidden');
                showToast(error.message || 'Unable to create account', 'error');
            }
        });
    };

    const bindOtpForm = () => {
        const otpForm = document.querySelector('form#otp-form');
        if (!otpForm) return;

        otpForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = serializeForm(otpForm);
            payload.action = 'verify-otp';
            try {
                await fetchJson(endpoints.verifyOtp, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                showToast('Account verified successfully', 'success');
                switchAuthPanel('login-panel');
            } catch (error) {
                showToast(error.message || 'OTP verification failed', 'error');
            }
        });
    };

    const bindVideoAssetForm = () => {
        const videoForm = document.querySelector('form#video-asset-form');
        if (!videoForm) return;

        videoForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = serializeForm(videoForm);
            try {
                await fetchJson(endpoints.videos, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                showToast('Video asset saved successfully', 'success');
                videoForm.reset();
            } catch (error) {
                showToast(error.message || 'Unable to save video asset', 'error');
            }
        });
    };

    const bindEquipmentForm = () => {
        const equipmentForm = document.querySelector('form#equipment-form');
        if (!equipmentForm) return;

        equipmentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = serializeForm(equipmentForm);
            try {
                await fetchJson(endpoints.equipmentCheckout, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                showToast('Equipment request submitted', 'success');
                equipmentForm.reset();
            } catch (error) {
                showToast(error.message || 'Unable to submit equipment request', 'error');
            }
        });
    };

    const bindSmsSettings = () => {
        const smsForm = document.querySelector('form#sms-settings-form');
        const saveButton = document.querySelector('button[data-action="save-sms-settings"]');
        const testButton = document.querySelector('button[data-action="test-sms-connection"]');

        if (smsForm) {
            smsForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const payload = serializeForm(smsForm);
                try {
                    await fetchJson(endpoints.smsSettings, {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    });
                    showToast('SMS settings saved successfully', 'success');
                } catch (error) {
                    showToast(error.message || 'Unable to save SMS settings', 'error');
                }
            });
        }

        if (testButton) {
            testButton.addEventListener('click', async () => {
                const payload = serializeForm(smsForm || document.createElement('form'));
                try {
                    await fetchJson(endpoints.smsTest, {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    });
                    showToast('SMS connection successful', 'success');
                } catch (error) {
                    showToast(error.message || 'SMS connection failed', 'error');
                }
            });
        }
    };

    const bindReportButton = () => {
        const reportButton = document.querySelector('button[data-action="generate-report"]');
        if (!reportButton) return;

        reportButton.addEventListener('click', async () => {
            const payload = { type: 'video_export', format: 'pdf' };
            try {
                await fetchJson(endpoints.reports, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                showToast('Report generation started', 'success');
            } catch (error) {
                showToast(error.message || 'Report generation failed', 'error');
            }
        });
    };

    const bindActionButtons = () => {
        document.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action], a[data-action]');
            if (!button) return;
            const action = button.dataset.action;
            if (!action) return;

            switch (action) {
                case 'send-reminder':
                    event.preventDefault();
                    showToast('Reminder sent to staff', 'success');
                    break;
                case 'reorder-equipment':
                    event.preventDefault();
                    showToast('Equipment reorder requested', 'success');
                    break;
                case 'start-ingest':
                    event.preventDefault();
                    showToast('Media ingest process started', 'success');
                    break;
                case 'logout':
                    event.preventDefault();
                    localStorage.removeItem('mbtv_user');
                    const isPageLogout = window.location.pathname.includes('/pages/');
                    window.location.href = isPageLogout ? '../index.html' : 'index.html';
                    break;
                case 'delete-user-action':
                    const userId = button.dataset.id;
                    if (confirm('Are you sure you want to delete this user?')) {
                        try {
                            await fetchJson(endpoints.users, {
                                method: 'POST',
                                body: JSON.stringify({ action: 'delete-user', user_id: userId })
                            });
                            showToast('User deleted', 'success');
                            loadUserManagement();
                        } catch (e) {
                            showToast(e.message, 'error');
                        }
                    }
                    break;
                case 'toggle-template':
                    event.preventDefault();
                    document.body.classList.toggle('sms-template-open');
                    break;
                case 'page-change':
                    event.preventDefault();
                    showToast(`Page ${button.textContent.trim()} selected`, 'info');
                    break;
                default:
                    break;
            }
        });
    };

    const loadUserManagement = async () => {
        const tableBody = document.getElementById('user-management-body');
        if (!tableBody) return;

        try {
            const result = await fetchJson(endpoints.users + '?action=list-users', { method: 'POST' });
            tableBody.innerHTML = result.users.map(u => `
                <tr class="hover:bg-white/5 transition-colors border-b border-white/5">
                    <td class="px-6 py-4 text-sm font-medium">${u.full_name}</td>
                    <td class="px-6 py-4 text-sm text-on-surface-variant">${u.username}</td>
                    <td class="px-6 py-4 text-sm text-on-surface-variant">${u.role_name}</td>
                    <td class="px-6 py-4 text-sm">
                        <button data-action="delete-user-action" data-id="${u.id}" class="text-error hover:text-red-400">
                             <span class="material-symbols-outlined text-lg">delete</span>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            console.error('Failed to load users', e);
        }
    };

    const init = () => {
        checkAuth();
        bindLoginForm();
        bindSignupForm();
        bindOtpForm();
        bindAuthModeToggle();
        bindVideoAssetForm();
        bindEquipmentForm();
        bindSmsSettings();
        bindReportButton();
        bindActionButtons();
        setAdminUI();
    };

    return { init };
})();

window.addEventListener('DOMContentLoaded', MBTV.init);