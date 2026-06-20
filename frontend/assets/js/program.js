/* Program Page Script for MBTV Kenya
   Handles Program Archive interactions.
*/

window.addEventListener('DOMContentLoaded', () => {
    const { checkAuth, showToast } = MBTV_CORE;

    const bindProgramActions = () => {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action], a[data-action]');
            if (!button) return;
            const action = button.dataset.action;

            if (action === 'logout') {
                event.preventDefault();
                localStorage.removeItem('mbtv_user');
                const isPage = window.location.pathname.includes('/pages/');
                window.location.href = isPage ? '../index.html' : 'index.html';
            }
        });

        // Add filter interactions if needed
        const searchInput = document.querySelector('input[placeholder="Search archive..."]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                // Logic for real-time filtering can be added here
                console.log('Searching for:', e.target.value);
            });
        }
    };

    // Initialize
    checkAuth();
    bindProgramActions();
});
