/* Admin Dashboard Script for MBTV Kenya
   Handles Admin-specific UI and User Management.
*/

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, getCurrentUser, checkAuth, serializeForm } = MBTV_CORE;

    const setAdminUI = () => {
        const user = getCurrentUser();
        if (!user) return;

        const isChief = user.role_name === 'Chief IT';
        
        document.querySelectorAll('.chief-only').forEach(el => {
            el.classList.toggle('hidden', !isChief);
        });

        if (isChief && document.getElementById('user-management-table')) {
            loadUserManagement();
            loadRoles();
        }
    };

    const loadRoles = async () => {
        const roleSelect = document.getElementById('new-user-role');
        if (!roleSelect) return;

        try {
            const result = await fetchJson(endpoints.users, { 
                method: 'POST',
                body: JSON.stringify({ action: 'list-roles' })
            });
            if (result.success) {
                roleSelect.innerHTML = result.roles.map(r => 
                    `<option value="${r.id}">${r.name}</option>`
                ).join('');
            }
        } catch (e) {
            console.error('Failed to load roles', e);
        }
    };

    const loadUserManagement = async () => {
        const tableBody = document.getElementById('user-management-body');
        if (!tableBody) return;

        try {
            const result = await fetchJson(endpoints.users, { 
                method: 'POST',
                body: JSON.stringify({ action: 'list-users' })
            });
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

    const bindGlobalActions = () => {
        document.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action], a[data-action]');
            if (!button) return;
            const action = button.dataset.action;

            switch (action) {
                case 'logout':
                    event.preventDefault();
                    localStorage.removeItem('mbtv_user');
                    const isPage = window.location.pathname.includes('/pages/');
                    window.location.href = isPage ? '../index.html' : 'index.html';
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
                case 'send-reminder':
                    showToast('Reminder sent to staff', 'success');
                    break;
                case 'reorder-equipment':
                    showToast('Equipment reorder requested', 'success');
                    break;
                case 'start-ingest':
                    showToast('Media ingest process started', 'success');
                    break;
            }
        });
    };

    const bindUserModal = () => {
        const modal = document.getElementById('add-user-modal');
        const trigger = document.getElementById('add-user-trigger');
        const closeBtn = document.getElementById('close-user-modal');
        const form = document.getElementById('admin-create-user-form');

        if (!modal || !trigger) return;

        trigger.addEventListener('click', () => {
            modal.classList.remove('hidden');
            setTimeout(() => modal.querySelector('div')?.classList.remove('scale-95'), 10);
        });

        const closeModal = () => {
            modal.querySelector('div')?.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 200);
            form?.reset();
        };

        closeBtn?.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = serializeForm(form);
            payload.action = 'register';

            try {
                await fetchJson(endpoints.users, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                showToast('User created successfully', 'success');
                closeModal();
                loadUserManagement();
            } catch (err) {
                showToast(err.message || 'Failed to create user', 'error');
            }
        });
    };

    // Initialize
    checkAuth();
    setAdminUI();
    bindGlobalActions();
    bindUserModal();
});
