/* Equipment Management Script for MBTV Kenya */

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, checkAuth, serializeForm, renderNavUser, user } = MBTV_CORE;
    
    // Show register button for admins
    if (user && user.role_name === 'Chief IT') {
        const regBtn = document.querySelector('button[onclick*="register-modal"]');
        if (regBtn) regBtn.classList.remove('hidden');
    }

    let tsEquipment, tsStaff;

    // ----- Load activity-log table -----
    const loadActivityLog = async () => {
        const streamContainer = document.getElementById('movement-stream');
        if (!streamContainer) return;

        // Set skeleton state
        streamContainer.innerHTML = Array(3).fill(0).map(() => MBTV_CORE.skeleton('h-24 w-full rounded-2xl')).join('');

        try {
            const result = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'checkouts' })
            });

            if (result.success && result.checkouts.length > 0) {
                streamContainer.innerHTML = result.checkouts.map(c => {
                    const isOut = c.status === 'checked_out';
                    const statusClass = isOut
                        ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(159,204,239,0.05)]'
                        : 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20 shadow-[0_0_15px_rgba(52,211,153,0.05)]';
                    
                    const statusLabel = isOut ? 'Currently Out' : 'Back in Storage';
                    const icon = isOut ? 'rocket_launch' : 'inventory_2';
                    
                    const returnButton = isOut 
                        ? `<button class="px-4 py-1.5 bg-slate-900 border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500 hover:text-slate-950 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2" onclick="window.confirmReturn(${c.id})"><span class="material-symbols-outlined text-[10px]">check_circle</span> Mark as Returned</button>`
                        : `<div class="flex items-center justify-end gap-1.5 text-emerald-400/50 font-black text-[8px] uppercase tracking-widest"><span class="material-symbols-outlined text-[10px]">verified</span> Returned</div>`;

                    const date = c.checkout_date
                        ? new Date(c.checkout_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                        : '—';

                    return `
                        <div class="flex gap-4 group relative">
                            <!-- Action Icon -->
                            <div class="z-10 w-9 h-9 rounded-xl bg-surface border border-white/10 flex items-center justify-center ${isOut ? 'text-primary' : 'text-emerald-400'} shadow-xl transition-all group-hover:scale-105 group-hover:border-primary/50 shrink-0">
                                <span class="material-symbols-outlined text-base ${!isOut ? 'fill-icon' : ''}">${icon}</span>
                            </div>

                            <!-- Movement Card -->
                            <div class="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.04] transition-all hover:border-primary/20 flex items-center justify-between gap-4">
                                <div class="flex flex-col min-w-0">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-[8px] text-slate-500 uppercase tracking-widest font-black">${date}</span>
                                        <span class="w-0.5 h-0.5 bg-white/10 rounded-full"></span>
                                        <span class="text-[8px] text-slate-600 uppercase tracking-widest font-bold">#L${String(c.id).padStart(3, '0')}</span>
                                    </div>
                                    <h4 class="text-xs font-black text-white italic uppercase tracking-tight truncate">
                                        ${c.equipment_name}
                                        <span class="ml-2 text-[9px] text-primary/40 font-medium not-italic uppercase tracking-tighter">${c.item_code}</span>
                                    </h4>
                                    <div class="flex items-center gap-2 mt-2">
                                        <div class="w-4 h-4 rounded bg-slate-800 border border-white/5 flex items-center justify-center text-[7px] font-black text-white uppercase shrink-0">${(c.recipient_username || 'S')[0]}</div>
                                        <span class="text-[8px] text-slate-500 font-bold uppercase tracking-widest truncate">@${c.recipient_username || 'SYSTEM'}</span>
                                    </div>
                                </div>
                                
                                <div class="flex flex-col items-end gap-3 shrink-0">
                                    <div class="flex flex-col items-end gap-0.5">
                                        <span class="px-3 py-1 ${statusClass} text-[8px] font-black rounded-lg border italic uppercase tracking-widest text-center">${statusLabel}</span>
                                        <span class="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">x${c.quantity} Units</span>
                                    </div>
                                    ${returnButton}
                                </div>
                            </div>
                        </div>`;
                }).join('');
            } else {
                streamContainer.innerHTML = '<div class="flex flex-col items-center justify-center py-12 gap-3 opacity-20"><span class="material-symbols-outlined text-3xl">inventory_2</span><p class="text-[9px] font-black uppercase tracking-widest italic">No Logistics Movement</p></div>';
            }
        } catch (e) {
            console.error('Failed to load logistics stream', e);
            streamContainer.innerHTML = '<div class="p-6 text-center text-error text-[8px] font-black uppercase italic">Protocol Interrupted</div>';
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
        if (!overdueStat) return;

        try {
            const result = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'logistics_stats' })
            });

            if (result.success) {
                if (utilStat) utilStat.textContent = `${result.utilization}%`;
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

    // ----- Registration form submission -----
    const bindRegisterForm = () => {
        const form = document.getElementById('register-equipment-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Registering...';

            const payload = serializeForm(form);
            payload.action = 'create';
            payload.status = 'available';

            try {
                await fetchJson(endpoints.equipment, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast('New asset onboarded', 'success');
                document.getElementById('register-modal').classList.add('hidden');
                form.reset();
                
                populateEquipmentDropdown();
                loadLogisticsStats();
                loadTrendData();
            } catch (err) {
                showToast(err.message || 'Registration failed', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
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
    window.confirmReturn = async (checkoutId) => {
        if (!confirm('Are you sure you want to close this logistics protocol?')) return;
        
        try {
            await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ 
                    action: 'return', 
                    checkout_id: checkoutId 
                })
            });
            showToast('Unit securely returned to inventory', 'success');
            loadActivityLog();
            populateEquipmentDropdown();
            loadLogisticsStats();
            loadTrendData();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    bindRegisterForm();
});
