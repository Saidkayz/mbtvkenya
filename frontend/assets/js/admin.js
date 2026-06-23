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
                if (el) el.innerHTML = typeof value === 'number' ? value.toLocaleString() : (value || '--');
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
            const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v ?? '--'; };
            setEl('video-stat-total',    total);
            setEl('video-donut-center',  total);

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
                            responsive: true, maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                                x: {
                                    grid:   { display: false },
                                    ticks:  { color: '#c1c7ce', font: { size: 9, weight: '700' } },
                                    border: { display: false }
                                },
                                y: {
                                    grid:       { color: 'rgba(255,255,255,0.04)' },
                                    ticks:      { color: '#64748b', font: { size: 9, weight: '700' } },
                                    beginAtZero: true,
                                    border:     { display: false }
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
                            <div class="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-primary/20 transition-all cursor-default">
                                <div class="flex items-center justify-between">
                                    <span class="material-symbols-outlined ${statusDot[v.status] || 'text-slate-500'} text-xs">radio_button_checked</span>
                                    <span class="text-[7px] text-slate-500 font-black uppercase tracking-widest">${date}</span>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[10px] font-black text-white uppercase italic truncate mb-1">${v.title}</p>
                                    <p class="text-[8px] text-primary font-bold uppercase tracking-widest">${v.category || '—'}</p>
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

            const donutCenter = document.getElementById('equip-donut-center');
            if (donutCenter) donutCenter.innerHTML = data.total || 0;

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
        } catch (e) {
            console.warn('Equipment analytics load failed:', e.message);
        }
    };
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
