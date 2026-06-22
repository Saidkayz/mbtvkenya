/* Personnel Management Page Script for MBTV Kenya */

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, getCurrentUser, checkAuth, serializeForm, renderNavUser } = MBTV_CORE;

    let tsRoleModal, tsRoleFilter;
    let allUsers = [];

    const loadRoles = async () => {
        const modalSelect = document.getElementById('modal-role-select');
        const filterSelect = document.getElementById('role-filter');

        try {
            const result = await fetchJson(endpoints.users, {
                method: 'POST',
                body: JSON.stringify({ action: 'list-roles' })
            });
            if (result.success) {
                // Modal Select
                if (modalSelect) {
                    if (tsRoleModal) tsRoleModal.destroy();
                    modalSelect.innerHTML = '<option value="">Select Level...</option>';
                    tsRoleModal = new TomSelect(modalSelect, {
                        valueField: 'id',
                        labelField: 'name',
                        searchField: ['name'],
                        options: result.roles,
                        render: {
                            option: (data, escape) => `<div class="text-[10px] font-black uppercase italic">${escape(data.name)}</div>`
                        }
                    });
                }

                // Filter Select
                if (filterSelect) {
                    if (tsRoleFilter) tsRoleFilter.destroy();
                    filterSelect.innerHTML = '<option value="">All Clearances</option>';
                    tsRoleFilter = new TomSelect(filterSelect, {
                        valueField: 'id',
                        labelField: 'name',
                        searchField: ['name'],
                        options: result.roles,
                        render: {
                            option: (data, escape) => `<div class="text-[10px] font-black uppercase italic">${escape(data.name)}</div>`
                        },
                        onChange: () => applyFilters()
                    });
                }
            }
        } catch (e) { console.error('Roles load failed', e); }
    };

    const loadUsers = async () => {
        const tbody = document.getElementById('user-table-body');
        if (!tbody) return;

        try {
            const result = await fetchJson(endpoints.users, {
                method: 'POST',
                body: JSON.stringify({ action: 'list-users' })
            });

            if (result.success) {
                allUsers = result.users || [];
                applyFilters();
            }
        } catch (e) {
            console.error('Users load failed', e);
            tbody.innerHTML = `<tr><td colspan="5" class="px-8 py-16 text-center text-error font-black uppercase italic">Handshake Interrupted</td></tr>`;
        }
    };

    const applyFilters = () => {
        const tbody = document.getElementById('user-table-body');
        const search = document.getElementById('user-search').value.toLowerCase();
        const roleId = tsRoleFilter ? tsRoleFilter.getValue() : '';
        const currentUser = getCurrentUser();

        let filtered = allUsers.filter(u => {
            const matchesSearch = !search || 
                u.full_name.toLowerCase().includes(search) || 
                u.username.toLowerCase().includes(search) || 
                u.email.toLowerCase().includes(search);
            const matchesRole = !roleId || String(u.role_id) === String(roleId);
            return matchesSearch && matchesRole;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-8 py-16 text-center text-slate-600 font-black uppercase tracking-widest italic">No matches found in directory</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(u => {
            const isSelf = currentUser && String(currentUser.id) === String(u.id);
            const statusColor = {
                active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                inactive: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
                suspended: 'text-error bg-error/10 border-error/20'
            }[u.status] || 'text-slate-400 bg-slate-400/10 border-slate-400/20';

            return `
                <tr class="hover:bg-white/5 transition-colors group">
                    <td class="px-8 py-5">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black shadow-lg">
                                ${u.full_name.charAt(0)}
                            </div>
                            <div class="flex flex-col">
                                <span class="font-black text-white italic uppercase tracking-tight">${u.full_name}</span>
                                <span class="text-[9px] text-slate-500 uppercase font-black">@${u.username}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-8 py-5">
                        <span class="px-3 py-1 bg-white/5 text-white text-[10px] font-black rounded-lg border border-white/5 uppercase tracking-widest italic">${u.role_name}</span>
                    </td>
                    <td class="px-8 py-5 text-center">
                        <span class="px-2.5 py-1 ${statusColor} text-[9px] font-black rounded-full border uppercase tracking-tighter italic">
                            ${u.status}
                        </span>
                    </td>
                    <td class="px-8 py-5">
                        <div class="flex flex-col">
                            <span class="text-xs text-slate-300 font-medium">${u.email}</span>
                            <span class="text-[9px] text-slate-600 uppercase font-black tracking-widest mt-0.5">${u.phone || 'NO SECURE LINK'}</span>
                        </div>
                    </td>
                    <td class="px-8 py-5 text-right">
                        <div class="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            ${isSelf ? '<span class="text-[10px] text-primary font-black uppercase italic tracking-widest">Self</span>' : `
                                <button onclick="window.populateEditUser(${u.id})" class="p-2 text-slate-500 hover:text-white transition-colors"><span class="material-symbols-outlined text-base">shield_person</span></button>
                                <button onclick="window.confirmDeleteUser(${u.id})" class="p-2 text-slate-500 hover:text-error transition-colors"><span class="material-symbols-outlined text-base">person_remove</span></button>
                            `}
                        </div>
                    </td>
                </tr>`;
        }).join('');
    };

    const bindForm = () => {
        const form = document.getElementById('user-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = serializeForm(form);
            payload.action = payload.id ? 'update-user' : 'register';

            // Auto-derive username from email if missing
            if (!payload.username && payload.email) {
                payload.username = payload.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            }

            try {
                await fetchJson(endpoints.users, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast(payload.id ? 'Personnel configuration updated' : 'Personnel initialized', 'success');
                form.reset();
                if (tsRoleModal) tsRoleModal.clear();
                document.getElementById('user-modal').classList.add('hidden');
                loadUsers();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    };

    window.confirmDeleteUser = async (id) => {
        if (!confirm('Permanently revoke personnel access?')) return;
        try {
            await fetchJson(endpoints.users, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete-user', user_id: id })
            });
            showToast('Access revoked', 'success');
            loadUsers();
        } catch (err) { showToast(err.message, 'error'); }
    };

    window.populateEditUser = async (id) => {
        const user = allUsers.find(u => String(u.id) === String(id));
        if (!user) return;

        const form = document.getElementById('user-form');
        document.getElementById('edit-user-id').value = id;
        document.getElementById('modal-title').textContent = 'Modify Personnel';
        const passField = document.getElementById('password-field');
        if (passField) passField.classList.add('opacity-50');
        
        form.full_name.value = user.full_name;
        form.email.value = user.email;
        form.status.value = user.status;
        if (tsRoleModal) tsRoleModal.setValue(user.role_id);

        document.getElementById('user-modal').classList.remove('hidden');
    };

    document.getElementById('user-search')?.addEventListener('input', applyFilters);

    checkAuth();
    renderNavUser();
    loadRoles();
    loadUsers();
    bindForm();
});
