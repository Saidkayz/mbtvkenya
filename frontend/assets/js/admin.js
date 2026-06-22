/* Admin Dashboard Script for MBTV Kenya
   Handles Dashboard logic, visualizations, and activity logs.
*/

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, getCurrentUser, checkAuth } = MBTV_CORE;

    let equipmentChartInstance = null;
    let growthChartInstance = null;

    // ─── Nav: display authenticated user name & role ─────────────────────────
    const renderNavUser = () => {
        const user = getCurrentUser();
        if (!user) return;

        const nameEl = document.getElementById('nav-user-name');
        const roleEl = document.getElementById('nav-user-role');
        const avatarEl = document.getElementById('nav-user-avatar');

        if (nameEl) nameEl.textContent = user.full_name || user.username || 'Unknown';
        if (roleEl) roleEl.textContent = user.role_name || '—';
        if (avatarEl && (user.full_name || user.username)) {
            avatarEl.textContent = (user.full_name || user.username).charAt(0).toUpperCase();
        }
    };

    // ─── Dashboard summary cards ──────────────────────────────────────────────
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
            set('stat-video-pending',   data.video_pending);
            set('stat-total-equipment', data.total_equipment);
            set('stat-total-users',     data.total_users);
            set('stat-pending-returns', data.pending_returns);
            set('storage-util-text',    `${data.storage_pct}% Full`);

            const storageBar = document.getElementById('storage-util-bar');
            if (storageBar) {
                setTimeout(() => {
                    storageBar.style.width = `${data.storage_pct}%`;
                }, 100);
            }

        } catch (e) {
            console.warn('Failed to load dashboard stats:', e.message);
        }
    };

    // ─── Dashboard Visualization (Charts) ─────────────────────────────────────
    const initDashboardCharts = async () => {
        const equipCtx = document.getElementById('equipmentChart')?.getContext('2d');
        const growthCtx = document.getElementById('videoGrowthChart')?.getContext('2d');
        if (!equipCtx || !growthCtx) return;

        try {
            const data = await fetchJson(endpoints.dashboard, {
                method: 'POST',
                body: JSON.stringify({ action: 'chart-data' })
            });

            if (!data.success) return;

            // 1. Equipment Distribution (Doughnut)
            const dist = data.equipment_dist || {};
            if (equipmentChartInstance) equipmentChartInstance.destroy();
            equipmentChartInstance = new Chart(equipCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(dist).map(s => s.toUpperCase()),
                    datasets: [{
                        data: Object.values(dist),
                        backgroundColor: ['#9fccef', '#e3c286', '#ffb4ab', '#10b981'],
                        borderWidth: 0,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'bottom', labels: { color: '#64748b', font: { family: 'Manrope', size: 10, weight: 'bold' } } }
                    },
                    cutout: '75%'
                }
            });

            // 2. Video Growth (Line)
            const trend = data.video_trend || [];
            if (growthChartInstance) growthChartInstance.destroy();
            growthChartInstance = new Chart(growthCtx, {
                type: 'line',
                data: {
                    labels: trend.map(t => t.date),
                    datasets: [{
                        label: 'Uploads',
                        data: trend.map(t => t.count),
                        borderColor: '#9fccef',
                        backgroundColor: 'rgba(159, 204, 239, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#9fccef'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                        x: { grid: { display: false }, ticks: { color: '#64748b' } }
                    },
                    plugins: { legend: { display: false } }
                }
            });

        } catch (e) {
            console.warn('Failed to load chart data:', e.message);
        }
    };

    // Alert mapping removed as per request.

    // ─── Equipment Activity Log ───────────────────────────────────────────────
    const loadActivityLog = async () => {
        const tbody = document.getElementById('activity-log-body');
        if (!tbody) return;

        try {
            const data = await fetchJson(endpoints.equipment, {
                method: 'POST',
                body: JSON.stringify({ action: 'checkouts' })
            });

            const checkouts = (data.checkouts || []).slice(0, 5);

            if (checkouts.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="px-8 py-10 text-center text-slate-500 text-sm">No activity recorded.</td></tr>`;
                return;
            }

            tbody.innerHTML = checkouts.map(c => {
                const date = new Date(c.checkout_date);
                const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const isOut = c.status === 'checked_out' || c.status === 'overdue';
                
                return `
                    <tr class="hover:bg-white/5 transition-colors">
                        <td class="px-8 py-5 text-xs text-slate-500 font-black uppercase tracking-tighter">${dateStr}</td>
                        <td class="px-8 py-5 text-sm font-bold text-white italic uppercase tracking-tight">${c.equipment_name || 'Item'}</td>
                        <td class="px-8 py-5 text-sm underline decoration-white/10 underline-offset-4 text-slate-300 font-bold uppercase italic">${c.recipient_name || c.recipient_username || 'Staff Member'}</td>
                        <td class="px-8 py-5 text-right">
                            <span class="px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest ${isOut ? 'text-primary bg-primary/10 border-primary/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'}">
                                ${isOut ? 'OUT' : 'RETURNED'}
                            </span>
                        </td>
                    </tr>`;
            }).join('');

        } catch (e) {
            console.warn('Activity log load failed:', e.message);
        }
    };

    // ─── Role-based UI visibility ─────────────────────────────────────────────
    const setAdminUI = () => {
        const user = getCurrentUser();
        if (!user) return;
        const isChief = user.role_name === 'Chief IT';
        document.querySelectorAll('.chief-only').forEach(el => {
            el.classList.toggle('hidden', !isChief);
        });
    };

    // ─── Global action delegation ─────────────────────────────────────────────
    const bindGlobalActions = () => {
        document.addEventListener('click', (event) => {
            const button = event.target.closest('[data-action]');
            if (!button) return;
            const action = button.dataset.action;

            if (action === 'logout') {
                event.preventDefault();
                localStorage.removeItem('mbtv_user');
                window.location.href = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
            }
        });
    };

    // ─── Initialise ───────────────────────────────────────────────────────────
    checkAuth();
    renderNavUser();
    setAdminUI();
    loadDashboardStats();
    loadActivityLog();
    initDashboardCharts();
    bindGlobalActions();
});
