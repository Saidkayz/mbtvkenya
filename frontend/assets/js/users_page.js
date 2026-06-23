/* Personnel Management Page Script for MBTV Kenya */

// 1. ATTACH GLOBAL FUNCTIONS IMMEDIATELY to prevent "not a function" errors
window.openCreateUser = () => {
    const modal = document.getElementById('user-modal');
    if (!modal) return;
    
    // Reset form
    const form = document.getElementById('user-form');
    if (form) form.reset();
    
    // Reset state
    if (typeof tsRoleModal !== 'undefined' && tsRoleModal) tsRoleModal.clear();
    const editId = document.getElementById('edit-user-id');
    if (editId) editId.value = '';
    
    const title = document.getElementById('modal-title');
    if (title) title.textContent = 'Initialize User';
    
    const passField = document.getElementById('password-field');
    if (passField) passField.classList.remove('opacity-50');
    
    // Set to Step 1
    if (window.updateStep) window.updateStep(1);
    
    modal.classList.remove('hidden');
};

window.updateStep = (step) => {
    currentStep = step;
    const indicator = document.getElementById('modal-step-indicator');
    const progressBar = document.getElementById('user-progress-bar');
    const nextBtn = document.getElementById('user-next-step');
    const prevBtn = document.getElementById('user-prev-step');
    const submitBtn = document.getElementById('user-submit-btn');
    const cancelBtn = document.getElementById('user-cancel-modal');

    // Hide all steps (totalSteps defined below)
    for(let i=1; i<=2; i++) {
        const el = document.getElementById(`user-step-${i}`);
        if (el) el.classList.add('hidden');
    }
    
    // Show current
    const currentEl = document.getElementById(`user-step-${currentStep}`);
    if (currentEl) currentEl.classList.remove('hidden');
    
    // Update Buttons
    if (prevBtn) prevBtn.classList.toggle('hidden', currentStep === 1);
    if (cancelBtn) cancelBtn.classList.toggle('hidden', currentStep !== 1);
    if (nextBtn) nextBtn.classList.toggle('hidden', currentStep === 2);
    if (submitBtn) submitBtn.classList.toggle('hidden', currentStep !== 2);
    
    if (indicator) indicator.textContent = `Step ${currentStep} of 2`;
    if (progressBar) progressBar.style.width = `${(currentStep / 2) * 100}%`;
};

// 2. SHARED STATE
let tsRoleModal, tsRoleFilter;
let allUsers = [];
let currentStep = 1;

// 3. DOM CONTENT LOADED FOR INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    if (typeof MBTV_CORE === 'undefined') {
        console.error('MBTV_CORE not found. Core services unavailable.');
        return;
    }

    const { checkAuth, renderNavUser } = MBTV_CORE;
    checkAuth();
    renderNavUser();
    
    window.loadRoles();
    window.loadUsers();
    window.bindForm();

    document.getElementById('user-search')?.addEventListener('input', window.applyFilters);
    
    const nextBtn = document.getElementById('user-next-step');
    const prevBtn = document.getElementById('user-prev-step');
    
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (currentStep === 1) {
            const name = document.querySelector('input[name="full_name"]');
            const email = document.querySelector('input[name="email"]');
            const phoneDigits = document.querySelector('input[name="phone_digits"]');
            
            if (!name.value || !email.value) {
                MBTV_CORE.showToast('Name and Email are required', 'error');
                return;
            }
            if (phoneDigits.value && !/^\d{9}$/.test(phoneDigits.value)) {
                MBTV_CORE.showToast('Phone must exactly be 9 digits following +254', 'error');
                return;
            }
        }
        window.updateStep(currentStep + 1);
    });
    
    if (prevBtn) prevBtn.addEventListener('click', () => window.updateStep(currentStep - 1));
});

window.loadRoles = async () => {
    const modalSelect = document.getElementById('modal-role-select');
    const filterSelect = document.getElementById('role-filter');
    if (!modalSelect || !filterSelect) return;

    try {
        const result = await MBTV_CORE.fetchJson(MBTV_CORE.endpoints.users, {
            method: 'POST',
            body: JSON.stringify({ action: 'list-roles' })
        });
        if (result.success) {
            if (tsRoleModal) tsRoleModal.destroy();
            tsRoleModal = new TomSelect(modalSelect, {
                valueField: 'id', labelField: 'name', searchField: ['name'],
                options: result.roles,
                render: { option: (data, escape) => `<div class="text-[10px] font-black uppercase italic">${escape(data.name)}</div>` }
            });

            if (tsRoleFilter) tsRoleFilter.destroy();
            tsRoleFilter = new TomSelect(filterSelect, {
                valueField: 'id', labelField: 'name', searchField: ['name'],
                options: result.roles,
                render: { option: (data, escape) => `<div class="text-[10px] font-black uppercase italic">${escape(data.name)}</div>` },
                onChange: () => window.applyFilters()
            });
        }
    } catch (e) { console.error('Roles load failed', e); }
};

window.loadUsers = async () => {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;

    try {
        const result = await MBTV_CORE.fetchJson(MBTV_CORE.endpoints.users, {
            method: 'POST',
            body: JSON.stringify({ action: 'list-users' })
        });
        if (result.success) {
            allUsers = result.users || [];
            window.applyFilters();
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-8 py-16 text-center text-error font-black uppercase italic">Handshake Interrupted</td></tr>`;
    }
};

window.applyFilters = () => {
    const tbody = document.getElementById('user-table-body');
    const searchInput = document.getElementById('user-search');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const roleId = tsRoleFilter ? tsRoleFilter.getValue() : '';
    const currentUser = MBTV_CORE.getCurrentUser();

    let filtered = allUsers.filter(u => {
        const matchesSearch = !search || 
            u.full_name.toLowerCase().includes(search) || 
            (u.username && u.username.toLowerCase().includes(search)) || 
            u.email.toLowerCase().includes(search);
        const matchesRole = !roleId || String(u.role_id) === String(roleId);
        return matchesSearch && matchesRole;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-8 py-16 text-center text-slate-600 font-black uppercase tracking-widest italic">No matches</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        const isSelf = currentUser && String(currentUser.id) === String(u.id);
        const statusColor = {
            active: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
            inactive: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
            suspended: 'text-error bg-error/10 border-error/20'
        }[u.status] || 'text-slate-400 bg-slate-400/10 border-slate-400/20';

        return `<tr class="hover:bg-white/5 transition-colors group">
            <td class="px-8 py-5">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black shadow-lg">${u.full_name.charAt(0)}</div>
                    <div class="flex flex-col">
                        <span class="font-black text-white italic uppercase tracking-tight">${u.full_name}</span>
                        <span class="text-[9px] text-slate-500 uppercase font-black">@${u.username || 'unknown'}</span>
                    </div>
                </div>
            </td>
            <td class="px-8 py-5 text-[10px] font-black italic uppercase">${u.role_name}</td>
            <td class="px-8 py-5 text-center"><span class="px-2.5 py-1 ${statusColor} text-[9px] font-black rounded-full border uppercase tracking-tighter italic">${u.status}</span></td>
            <td class="px-8 py-5 text-xs text-slate-400">${u.email}</td>
            <td class="px-8 py-5 text-right">
                <div class="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${isSelf ? '<span class="text-[10px] text-primary font-black uppercase italic">Self</span>' : `
                        <button onclick="window.populateEditUser(${u.id})" class="p-2 text-slate-500 hover:text-white transition-colors"><span class="material-symbols-outlined text-base">shield_person</span></button>
                        <button onclick="window.confirmDeleteUser(${u.id})" class="p-2 text-slate-500 hover:text-error transition-colors"><span class="material-symbols-outlined text-base">person_remove</span></button>
                    `}
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.bindForm = () => {
    const form = document.getElementById('user-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('user-submit-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Committing...';

        const payload = MBTV_CORE.serializeForm(form);
        payload.action = payload.id ? 'update-user' : 'register';

        if (!payload.username && payload.email) {
            payload.username = payload.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        }
        
        if (payload.phone_digits) {
            payload.phone = '+254' + payload.phone_digits;
            delete payload.phone_digits;
        }
        
        if (payload.role_id) {
            payload.role = payload.role_id;
            delete payload.role_id;
        }

        try {
            await MBTV_CORE.fetchJson(MBTV_CORE.endpoints.users, {
                method: 'POST', body: JSON.stringify(payload)
            });
            MBTV_CORE.showToast(payload.id ? 'Personnel updated' : 'Personnel initialized', 'success');
            form.reset();
            document.getElementById('user-modal').classList.add('hidden');
            window.loadUsers();
        } catch (err) { MBTV_CORE.showToast(err.message, 'error'); }
        finally { btn.disabled = false; btn.textContent = originalText; }
    });
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
    
    if (user.phone && user.phone.startsWith('+254')) {
        form.phone_digits.value = user.phone.substring(4);
    } else {
        form.phone_digits.value = user.phone || '';
    }
    if (tsRoleModal) tsRoleModal.setValue(user.role_id);
    window.updateStep(1);
    document.getElementById('user-modal').classList.remove('hidden');
};

window.confirmDeleteUser = async (id) => {
    if (!confirm('Revoke access?')) return;
    try {
        await MBTV_CORE.fetchJson(MBTV_CORE.endpoints.users, {
            method: 'POST', body: JSON.stringify({ action: 'delete-user', user_id: id })
        });
        MBTV_CORE.showToast('Revoked', 'success');
        window.loadUsers();
    } catch (err) { MBTV_CORE.showToast(err.message, 'error'); }
};
