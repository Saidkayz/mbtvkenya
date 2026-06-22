/* =====================================================================
   MBTV Kenya – Admin Dashboard
   Handles stats cards, video analytics charts, equipment analytics.
   ===================================================================== */

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, getCurrentUser, checkAuth } = MBTV_CORE;

    // Chart instances (kept so we can destroy before re-render)
    let videoStatusChartInst   = null;
    let videoCategoryChartInst = null;
    let equipAvailChartInst    = null;

    // ─── Chart.js global defaults ─────────────────────────────────────────────
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family  = "'Work Sans', sans-serif";
        Chart.defaults.color        = '#64748b';
    }

    // ─── Nav: display authenticated user ─────────────────────────────────────
    const renderNavUser = () => {
        const user = getCurrentUser();
        if (!user) return;
        const nameEl   = document.getElementById('nav-user-name');
        const roleEl   = document.getElementById('nav-user-role');
        const avatarEl = document.getElementById('nav-user-avatar');
        if (nameEl)   nameEl.textContent   = user.full_name || user.username || 'Unknown';
        if (roleEl)   roleEl.textContent   = user.role_name || '—';
        if (avatarEl && (user.full_name || user.username)) {
            avatarEl.textContent = (user.full_name || user.username).charAt(0).toUpperCase();
        }
    };

    // ─── Top summary stat cards ───────────────────────────────────────────────
    const loadDashboardStats = async () => {
        try {
            const data = await fetchJson(endpoints.dashboard, {
                method: 'POST',
                body: JSON.stringify({ action: 'stats' })
            });
            if (!data.success) return;

            const set = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
            };

            set('stat-total-videos',    data.total_videos);
            set('stat-video-pending',   `${data.video_pending} PENDING`);
            set('stat-total-equipment', data.total_equipment);
            set('stat-total-users',     data.total_users);
            set('stat-pending-returns', data.pending_returns);
        } catch (e) {
            console.warn('Stats load failed:', e.message);
        }
    };

    // ─── Video Production Analytics ───────────────────────────────────────────
    const loadVideoSection = async () => {
        try {
            const data = await fetchJson(endpoints.dashboard, {
                method: 'POST',
                body: JSON.stringify({ action: 'video-stats' })
            });
            if (!data.success) return;

            const total      = data.total    || 0;
            const statuses   = data.statuses || {};
            const categories = data.categories || {};

            // ── Total counter ──────────────────────────────────────────────
            const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
            setEl('video-stat-total',    total);
            setEl('video-donut-center',  total);

            // ── Status pill badges ─────────────────────────────────────────
            setEl('vstat-pending',   statuses['Pending']          || 0);
            setEl('vstat-edit',      statuses['Edit In Progress'] || 0);
            setEl('vstat-completed', statuses['Completed']        || 0);
            setEl('vstat-archived',  statuses['Archived']         || 0);

            // ── Status Doughnut Chart ──────────────────────────────────────
            const statusList = [
                { label: 'Pending',          color: '#f59e0b' },
                { label: 'Edit In Progress', color: '#60a5fa' },
                { label: 'Review',           color: '#a78bfa' },
                { label: 'Completed',        color: '#34d399' },
                { label: 'Archived',         color: '#475569' },
            ];
            const statusCounts = statusList.map(s => statuses[s.label] || 0);
            const statusColors = statusList.map(s => s.color);

            const statusCtx = document.getElementById('videoStatusChart')?.getContext('2d');
            if (statusCtx) {
                if (videoStatusChartInst) videoStatusChartInst.destroy();
                videoStatusChartInst = new Chart(statusCtx, {
                    type: 'doughnut',
                    data: {
                        labels:   statusList.map(s => s.label),
                        datasets: [{
                            data:            statusCounts,
                            backgroundColor: statusColors,
                            borderWidth:     0,
                            hoverOffset:     10,
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        cutout: '74%',
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}` } }
                        }
                    }
                });
            }

            // ── Category Horizontal Bar Chart ──────────────────────────────
            const catCtx = document.getElementById('videoCategoryChart')?.getContext('2d');
            if (catCtx) {
                const catLabels = Object.keys(categories);
                const catValues = Object.values(categories);

                if (videoCategoryChartInst) videoCategoryChartInst.destroy();

                if (catLabels.length === 0) {
                    // Show placeholder text if no category data
                    catCtx.canvas.parentElement.innerHTML =
                        '<p class="text-[9px] text-slate-600 font-black uppercase italic text-center mt-16">No category data yet</p>';
                } else {
                    videoCategoryChartInst = new Chart(catCtx, {
                        type: 'bar',
                        data: {
                            labels:   catLabels,
                            datasets: [{
                                data:            catValues,
                                backgroundColor: 'rgba(159, 204, 239, 0.12)',
                                borderColor:     '#9fccef',
                                borderWidth:     2,
                                borderRadius:    6,
                                borderSkipped:   false,
                                hoverBackgroundColor: 'rgba(159, 204, 239, 0.25)',
                            }]
                        },
                        options: {
                            indexAxis: 'y',
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                x: {
                                    grid:       { color: 'rgba(255,255,255,0.04)' },
                                    ticks:      { color: '#64748b', font: { size: 9, weight: '700' } },
                                    beginAtZero: true,
                                    border:     { display: false }
                                },
                                y: {
                                    grid:   { display: false },
                                    ticks:  { color: '#c1c7ce', font: { size: 9, weight: '700' } },
                                    border: { display: false }
                                }
                            }
                        }
                    });
                }
            }

            // ── Latest Captures list ───────────────────────────────────────
            const list = document.getElementById('latest-videos-list');
            if (list) {
                if (data.latest && data.latest.length > 0) {
                    const statusDot = {
                        'Pending':          'text-amber-400',
                        'Edit In Progress': 'text-blue-400',
                        'Review':           'text-purple-400',
                        'Completed':        'text-emerald-400',
                        'Archived':         'text-slate-400'
                    };
                    list.innerHTML = data.latest.map(v => {
                        const date = v.video_date
                            ? new Date(v.video_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—';
                        return `
                            <div class="flex items-start gap-3">
                                <span class="material-symbols-outlined ${statusDot[v.status] || 'text-slate-500'} text-sm mt-0.5 shrink-0">radio_button_checked</span>
                                <div class="min-w-0">
                                    <p class="text-[10px] font-black text-white uppercase italic truncate leading-tight">${v.title}</p>
                                    <p class="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">${v.category || '—'} · ${date}</p>
                                </div>
                            </div>`;
                    }).join('');
                } else {
                    list.innerHTML = '<div class="text-[9px] text-slate-600 font-black uppercase italic">No assets captured yet</div>';
                }
            }

        } catch (e) {
            console.warn('Video section load failed:', e.message);
        }
    };

    // ─── Equipment Overview Analytics ─────────────────────────────────────────
    const loadEquipmentAnalytics = async () => {
        try {
            const data = await fetchJson(endpoints.dashboard, {
                method: 'POST',
                body: JSON.stringify({ action: 'equipment-analytics' })
            });
            if (!data.success) return;

            // ── Stat cards ─────────────────────────────────────────────────
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? '--'; };
            set('eq-stat-total',      data.total       || 0);
            set('eq-stat-available',  data.available   || 0);
            set('eq-stat-deployed',   data.deployed    || 0);
            set('eq-stat-overdue',    data.overdue     || 0);
            set('equip-donut-center', data.total       || 0);

            // ── Availability Doughnut ──────────────────────────────────────
            const chartData = [
                { label: 'Available',    value: data.available   || 0, color: '#34d399' },
                { label: 'Deployed',     value: data.deployed    || 0, color: '#9fccef' },
                { label: 'Overdue',      value: data.overdue     || 0, color: '#fb7185' },
                { label: 'Maintenance',  value: data.maintenance || 0, color: '#e3c286' },
            ].filter(d => d.value > 0);

            const ctx = document.getElementById('equipAvailChart')?.getContext('2d');
            if (ctx && chartData.length > 0) {
                if (equipAvailChartInst) equipAvailChartInst.destroy();
                equipAvailChartInst = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels:   chartData.map(d => d.label),
                        datasets: [{
                            data:            chartData.map(d => d.value),
                            backgroundColor: chartData.map(d => d.color),
                            borderWidth:     0,
                            hoverOffset:     10,
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: { legend: { display: false } }
                    }
                });
            }

            // ── Recent Dispatches cards ────────────────────────────────────
            const dispatches = document.getElementById('recent-dispatches');
            if (dispatches) {
                if (data.recent && data.recent.length > 0) {
                    dispatches.innerHTML = data.recent.map(c => {
                        const isOverdue = c.status === 'overdue';
                        const isOut     = c.status === 'checked_out';
                        const date = c.checkout_date
                            ? new Date(c.checkout_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                            : '—';

                        const statusCls   = isOverdue ? 'text-rose-400 bg-rose-400/10 border-rose-400/20'
                                          : isOut     ? 'text-primary bg-primary/10 border-primary/20'
                                          :             'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
                        const statusLabel = isOverdue ? 'OVERDUE' : isOut ? 'OUT' : 'RETURNED';
                        const icon        = isOverdue ? 'warning' : 'hardware';

                        return `
                            <div class="flex items-center gap-4 p-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition-all">
                                <div class="p-2 rounded-lg ${isOverdue ? 'bg-rose-500/10' : 'bg-primary/10'} shrink-0">
                                    <span class="material-symbols-outlined ${isOverdue ? 'text-rose-400' : 'text-primary'} text-base">${icon}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-[10px] font-black text-white uppercase italic truncate">${c.equipment_name || 'Equipment'}</p>
                                    <p class="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">@${c.recipient_username || 'staff'} &bull; ${date}</p>
                                </div>
                                <span class="px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase ${statusCls} shrink-0">${statusLabel}</span>
                            </div>`;
                    }).join('');
                } else {
                    dispatches.innerHTML = '<div class="text-[9px] text-slate-600 font-black uppercase italic">No recent dispatches</div>';
                }
            }

        } catch (e) {
            console.warn('Equipment analytics load failed:', e.message);
        }
    };

    // ─── Role-based UI ────────────────────────────────────────────────────────
    const setAdminUI = () => {
        const user = getCurrentUser();
        if (!user) return;
        const isChief = user.role_name === 'Chief IT';
        document.querySelectorAll('.chief-only').forEach(el => {
            el.classList.toggle('hidden', !isChief);
        });
    };

    // ─── Logout delegation ────────────────────────────────────────────────────
    const bindGlobalActions = () => {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-action]');
            if (!button) return;
            if (button.dataset.action === 'logout') {
                event.preventDefault();
                localStorage.removeItem('mbtv_user');
                window.location.href = window.location.pathname.includes('/pages/')
                    ? '../index.html' : 'index.html';
            }
        });
    };

    // ─── Initialise ───────────────────────────────────────────────────────────
    checkAuth();
    renderNavUser();
    setAdminUI();
    loadDashboardStats();
    loadVideoSection();
    loadEquipmentAnalytics();
    bindGlobalActions();
});
