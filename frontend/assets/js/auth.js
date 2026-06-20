/* Authentication Script for MBTV Kenya
   Handles Login, Signup, and OTP Verification.
*/

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, serializeForm } = MBTV_CORE;

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

        switchAuthPanel('login-panel');
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

    const bindSignupForm = () => {
        const signupForm = document.querySelector('form#signup-form');
        if (!signupForm) return;

        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const payload = serializeForm(signupForm);
            const password = payload.password?.trim();
            const errorPanel = document.getElementById('signup-error');

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

    // Initialize
    bindAuthModeToggle();
    bindLoginForm();
    bindSignupForm();
    bindOtpForm();
});
