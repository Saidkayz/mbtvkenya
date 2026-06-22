/* Equipment Management Script for MBTV Kenya */

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, checkAuth, serializeForm, renderNavUser } = MBTV_CORE;

    let tsEquipment, tsStaff;

    // ----- Load activity-log table -----
    const loadActivityLog = async () => {
        const tableBody = document.getElementById('activity-log-body');
        if (!tableBody) return;

        try {
            const result = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'checkouts' })
            });

            if (result.success && result.checkouts.length > 0) {
                tableBody.innerHTML = result.checkouts.map(c => {
                    const directionClass = c.status === 'checked_out'
                        ? 'bg-sky-950 text-sky-400 border-sky-400/20'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-400/20';
                    const directionLabel = c.status === 'checked_out' ? 'OUT' : 'RETURNED';
                    
                    const returnButton = (c.status === 'checked_out') 
                        ? `<button class="px-3 py-1 bg-slate-800 hover:bg-emerald-600 text-white rounded text-[8px] font-black uppercase tracking-widest transition-colors shadow-lg shadow-black/20" onclick="window.confirmReturn(${c.id})">Return Gear</button>`
                        : `<span class="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">Verified</span>`;

                    const date = c.checkout_date
                        ? new Date(c.checkout_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                        : '—';
                    const time = c.checkout_date
                        ? new Date(c.checkout_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : '—';

                    return `
                        <tr class="hover:bg-slate-900/40 transition-colors border-b border-slate-800/50">
                            <td class="px-6 py-4">
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-black text-white">${date}</span>
                                    <span class="text-[8px] text-slate-500 uppercase tracking-widest font-bold">${time}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-xs font-bold text-white">
                                <div class="flex items-center gap-3">
                                    <div class="w-2 h-2 bg-primary rounded-full"></div>
                                    <div class="flex flex-col">
                                        <span class="text-xs font-black uppercase italic">${c.equipment_name}</span>
                                        <span class="text-[8px] text-slate-500 font-bold uppercase tracking-widest">${c.item_code}</span>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">${c.recipient_name || 'Staff Member'}</td>
                            <td class="px-6 py-4">
                                <div class="flex justify-center">
                                    <span class="px-2 py-0.5 ${directionClass} text-[8px] font-black rounded border italic uppercase tracking-tighter">${directionLabel} x${c.quantity}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-right">${returnButton}</td>
                        </tr>`;
                }).join('');
            } else {
                tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-slate-500 text-xs font-black uppercase tracking-widest italic">Awaiting Payload...</td></tr>';
            }
        } catch (e) {
            console.error('Failed to load activity log', e);
            tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-10 text-center text-error text-[10px] font-black uppercase italic">Handshake Error</td></tr>';
        }
    };

    // ----- Populate equipment dropdown -----
    const populateEquipmentDropdown = async () => {
        const select = document.getElementById('equipment-checkout-select');
        if (!select) return;

        try {
            const result = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'list' })
            });
            if (result.success) {
                const options = result.equipment.map(e => ({
                    value: e.id,
                    text: `[${e.item_code}] ${e.name}`,
                    stock: e.available_quantity
                }));

                if (tsEquipment) tsEquipment.destroy();
                select.innerHTML = '<option value="">Search Hardware Inventory...</option>';
                
                tsEquipment = new TomSelect(select, {
                    valueField: 'value',
                    labelField: 'text',
                    searchField: ['text'],
                    options: options,
                    render: {
                        option: function(data, escape) {
                            return '<div>' +
                                '<span class="text-xs font-black italic uppercase">' + escape(data.text) + '</span>' +
                                '<div class="text-[8px] text-sky-500 uppercase font-black">Stock: ' + escape(data.stock) + ' Units Available</div>' +
                            '</div>';
                        },
                        item: function(data, escape) {
                            return '<div>' + escape(data.text) + '</div>';
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load equipment list', e);
        }
    };

    // ----- Populate staff dropdown -----
    const populateStaffDropdown = async () => {
        const select = document.getElementById('checkout-personnel');
        if (!select) return;

        try {
            const result = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'list_staff' })
            });
            if (result.success) {
                if (tsStaff) tsStaff.destroy();
                select.innerHTML = '<option value="">Search Personnel Directory...</option>';
                
                tsStaff = new TomSelect(select, {
                    valueField: 'id',
                    labelField: 'full_name',
                    searchField: ['full_name', 'username'],
                    options: result.users,
                    render: {
                        option: function(data, escape) {
                            return '<div>' +
                                '<span class="text-xs font-black italic uppercase">' + escape(data.full_name) + '</span>' +
                                '<div class="text-[8px] text-slate-500 uppercase font-black">@' + escape(data.username) + '</div>' +
                            '</div>';
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load staff list', e);
        }
    };
    
    // ----- Load Logistics Stats -----
    const loadLogisticsStats = async () => {
        const utilStat = document.getElementById('utilization-stat');
        const overdueStat = document.getElementById('overdue-stat');
        if (!utilStat || !overdueStat) return;

        try {
            const result = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'logistics_stats' })
            });

            if (result.success) {
                utilStat.textContent = `${result.utilization}%`;
                overdueStat.textContent = `${result.overdue_count} Items Pending`;
            }
        } catch (e) {
            console.error('Failed to load logistics stats', e);
        }
    };

    // ----- Global Return Gear Function -----
    window.confirmReturn = async (checkoutId) => {
        if (!confirm('Confirm hardware return verification?')) return;

        try {
            await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'return', checkout_id: checkoutId })
            });
            showToast('Hardware successfully returned to inventory', 'success');
            loadActivityLog();
            populateEquipmentDropdown();
            loadLogisticsStats();
        } catch (err) {
            showToast(err.message || 'Operation failed', 'error');
        }
    };

    // ----- Checkout form submission -----
    const bindCheckoutForm = () => {
        const form = document.getElementById('equipment-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const equipmentId = tsEquipment.getValue();
            const userId = tsStaff.getValue();
            const quantity = document.getElementById('quantity-input')?.value;

            if (!equipmentId) { showToast('Select hardware unit', 'error'); return; }
            if (!userId) { showToast('Identify personnel recipient', 'error'); return; }

            try {
                await fetchJson(endpoints.equipment, {
                    method: 'POST',
                    body: JSON.stringify({ 
                        action: 'checkout', 
                        equipment_id: equipmentId, 
                        user_id: userId,
                        quantity: quantity
                    })
                });
                showToast('Deployment registered successfully', 'success');
                
                // Reset form visibility and state
                tsEquipment.clear();
                tsStaff.clear();
                document.getElementById('quantity-input').value = 1;
                
                loadActivityLog();
                populateEquipmentDropdown();
                loadLogisticsStats();
            } catch (err) {
                showToast(err.message || 'Deployment rejected', 'error');
            }
        });
    };

    populateEquipmentDropdown();
    populateStaffDropdown();
    loadActivityLog();
    loadLogisticsStats();
    bindCheckoutForm();
});
