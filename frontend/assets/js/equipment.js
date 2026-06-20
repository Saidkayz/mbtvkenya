/* Equipment Management Script for MBTV Kenya */

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, checkAuth, serializeForm } = MBTV_CORE;

    // ----- Load equipment into activity-log table -----
    const loadActivityLog = async () => {
        const tableBody = document.getElementById('activity-log-body');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 text-sm">Loading activity…</td></tr>';

        try {
            const result = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'checkouts' })
            });

            if (result.success && result.checkouts.length > 0) {
                tableBody.innerHTML = result.checkouts.map(c => {
                    const directionClass = c.status === 'checked_out'
                        ? 'bg-sky-950 text-sky-400 border-sky-400/20'
                        : 'bg-amber-950 text-amber-400 border-amber-400/20';
                    const directionLabel = c.status === 'checked_out' ? 'OUT' : 'IN';
                    const statusHtml = c.status === 'returned'
                        ? `<span class="text-xs font-semibold text-emerald-400 flex items-center justify-end gap-1">
                                Verified <span class="material-symbols-outlined text-sm">verified</span>
                           </span>`
                        : `<span class="text-xs font-semibold text-slate-500">Processing…</span>`;

                    const time = c.checkout_date
                        ? new Date(c.checkout_date).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                        : '—';

                    return `
                        <tr class="hover:bg-slate-900/40 transition-colors">
                            <td class="px-6 py-5 text-sm text-slate-400 font-mono">${time}</td>
                            <td class="px-6 py-5">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 bg-surface-container-highest rounded flex items-center justify-center">
                                        <span class="material-symbols-outlined text-sm text-sky-400">build</span>
                                    </div>
                                    <div>
                                        <p class="text-sm font-bold text-white">${c.equipment_name}</p>
                                        <p class="text-[10px] text-slate-500">${c.item_code}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-5 text-sm text-on-surface">${c.user_name || '—'}</td>
                            <td class="px-6 py-5">
                                <div class="flex justify-center">
                                    <span class="px-3 py-1 ${directionClass} text-[10px] font-bold rounded-full border">${directionLabel}</span>
                                </div>
                            </td>
                            <td class="px-6 py-5 text-right">${statusHtml}</td>
                        </tr>`;
                }).join('');
            } else {
                tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 text-sm">No activity logged yet.</td></tr>';
            }
        } catch (e) {
            console.error('Failed to load activity log', e);
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-error text-sm">Failed to load activity.</td></tr>';
        }
    };

    // ----- Populate equipment checkout dropdown -----
    const populateCheckoutDropdown = async () => {
        const select = document.getElementById('equipment-checkout-select');
        if (!select) return;

        try {
            const result = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'list' })
            });
            if (result.success) {
                if (result.equipment.length === 0) {
                    select.innerHTML = '<option value="">No equipment available</option>';
                } else {
                    select.innerHTML = '<option value="">-- Select Equipment --</option>' +
                        result.equipment.map(e =>
                            `<option value="${e.id}">[${e.item_code}] ${e.name} (${e.status})</option>`
                        ).join('');
                }
            }
        } catch (e) {
            console.error('Failed to load equipment list', e);
        }
    };

    // ----- Checkout form submission -----
    const bindCheckoutForm = () => {
        const form = document.getElementById('equipment-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const equipmentId = document.getElementById('equipment-checkout-select')?.value;
            const personnel = document.getElementById('checkout-personnel')?.value;
            const msgBox = document.getElementById('checkout-message');

            if (!equipmentId) { showToast('Please select an equipment item', 'error'); return; }

            try {
                await fetchJson(endpoints.equipment, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'checkout', equipment_id: equipmentId, personnel })
                });
                showToast('Equipment checked out successfully', 'success');
                if (msgBox) {
                    msgBox.className = 'bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded flex items-center gap-3 mt-4';
                    msgBox.innerHTML = `<span class="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
                        <p class="text-xs text-emerald-300 font-medium">Gear checked out to ${personnel || 'staff'}.</p>`;
                }
                form.reset();
                loadActivityLog();
                populateCheckoutDropdown();
            } catch (err) {
                showToast(err.message || 'Checkout failed', 'error');
            }
        });
    };

    checkAuth();
    populateCheckoutDropdown();
    loadActivityLog();
    bindCheckoutForm();
});
