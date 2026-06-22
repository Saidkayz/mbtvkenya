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
                    const statusClass = c.status === 'checked_out'
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
                    const statusLabel = c.status === 'checked_out' ? 'ACTIVE_DISPATCH' : 'UNIT_RETURNED';
                    
                    const returnButton = (c.status === 'checked_out') 
                        ? `<button class="px-4 py-1.5 bg-slate-800 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95" onclick="window.confirmReturn(${c.id})">Verify Return</button>`
                        : `<div class="flex items-center justify-end gap-2 text-emerald-400 font-bold text-[9px] uppercase"><span class="material-symbols-outlined text-xs">verified</span> LOGGED</div>`;

                    const date = c.checkout_date
                        ? new Date(c.checkout_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                        : '—';
                    const time = c.checkout_date
                        ? new Date(c.checkout_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : '—';

                    return `
                        <tr class="hover:bg-primary/5 transition-colors group">
                            <td class="px-8 py-5">
                                <div class="flex flex-col">
                                    <span class="text-[11px] font-black text-white italic">${date}</span>
                                    <span class="text-[8px] text-slate-500 uppercase tracking-widest font-bold">${time}</span>
                                </div>
                            </td>
                            <td class="px-8 py-5">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 bg-background rounded-xl border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                                        <span class="material-symbols-outlined text-xl">hardware</span>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-[11px] font-black text-white uppercase italic">${c.equipment_name}</span>
                                        <span class="text-[8px] text-primary/60 font-bold uppercase tracking-widest">${c.item_code}</span>
                                    </div>
                                </div>
                            </td>
                            <td class="px-8 py-5">
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">@${c.recipient_username || 'SYSTEM'}</span>
                                </div>
                            </td>
                            <td class="px-8 py-5 text-center">
                                <span class="px-3 py-1 ${statusClass} text-[8px] font-black rounded-lg border italic uppercase tracking-widest">${statusLabel} x${c.quantity}</span>
                            </td>
                            <td class="px-8 py-5 text-right">${returnButton}</td>
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

    // ----- Usage Analytics Charts -----
    let trendChart, categoryChart;
    
    const initTrendChart = (data) => {
        const ctx = document.getElementById('equipmentTrendChart');
        if (!ctx) return;
        if (trendChart) trendChart.destroy();

        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [
                    {
                        label: 'Check Outs',
                        data: data.map(d => d.checkouts),
                        borderColor: '#9fccef',
                        backgroundColor: 'rgba(159, 204, 239, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#9fccef',
                        pointBorderColor: '#111316',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    },
                    {
                        label: 'Returns',
                        data: data.map(d => d.returns),
                        borderColor: '#34d399',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.4,
                        borderDash: [5, 5],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#64748b',
                            font: { size: 10, weight: 'bold', family: 'Work Sans' },
                            usePointStyle: true,
                            boxWidth: 6
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 9, weight: 'bold' } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: { color: '#64748b', font: { size: 9 }, stepSize: 1 },
                        beginAtZero: true
                    }
                }
            }
        });
    };

    const initCategoryChart = (categories) => {
        const ctx = document.getElementById('categoryDistributionChart');
        if (!ctx) return;
        if (categoryChart) categoryChart.destroy();

        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(c => c.category),
                datasets: [{
                    data: categories.map(c => c.count),
                    backgroundColor: [
                        '#9fccef',
                        '#e3c286',
                        '#34d399',
                        '#818cf8',
                        '#f472b6'
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#64748b',
                            font: { size: 8, weight: 'bold' },
                            padding: 10,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    };

    const loadTrendData = async () => {
        try {
            const result = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'trend_data' })
            });
            if (result.success) {
                initTrendChart(result.trends);
                initCategoryChart(result.categories);
            }
        } catch (e) {
            console.error('Failed to load chart data', e);
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
            const dueDate = form.elements['due_date']?.value;
            const notes = form.elements['notes']?.value;

            if (!equipmentId) { showToast('Select hardware unit', 'error'); return; }
            if (!userId) { showToast('Identify personnel recipient', 'error'); return; }

            try {
                await fetchJson(endpoints.equipment, {
                    method: 'POST',
                    body: JSON.stringify({ 
                        action: 'checkout', 
                        equipment_id: equipmentId, 
                        user_id: userId,
                        quantity: parseInt(quantity) || 1,
                        due_date: dueDate
                    })
                });
                showToast('Deployment registered successfully', 'success');
                
                // Reset form visibility and state
                document.getElementById('deployment-modal').classList.add('hidden');
                tsEquipment.clear();
                tsStaff.clear();
                form.reset();
                
                loadActivityLog();
                populateEquipmentDropdown();
                loadLogisticsStats();
                loadTrendData();
            } catch (err) {
                showToast(err.message || 'Deployment rejected', 'error');
            }
        });
    };

    populateEquipmentDropdown();
    populateStaffDropdown();
    loadActivityLog();
    loadLogisticsStats();
    loadTrendData();
    bindCheckoutForm();
});
