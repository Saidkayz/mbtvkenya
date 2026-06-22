/* Video Management Script for MBTV Kenya */

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, checkAuth, serializeForm } = MBTV_CORE;

    const loadVideos = async () => {
        const tableBody = document.getElementById('video-table-body');
        if (!tableBody) return;

        try {
            const result = await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'list' })
            });
            
            if (result.success) {
                tableBody.innerHTML = result.videos.map(v => `
                    <tr class="hover:bg-white/5 transition-colors border-b border-white/5">
                        <td class="px-6 py-4 text-sm font-medium text-white">${v.code}</td>
                        <td class="px-6 py-4 text-sm">${v.title}</td>
                        <td class="px-6 py-4 text-sm text-on-surface-variant">${v.category_name || 'Uncategorized'}</td>
                        <td class="px-6 py-4 text-sm">
                            <span class="px-2 py-1 ${v.status === 'published' ? 'bg-green-900/30 text-green-400' : 'bg-secondary/30 text-secondary'} text-[10px] font-bold rounded uppercase">
                                ${v.status}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm">${v.creator_name || 'System'}</td>
                        <td class="px-6 py-4 text-sm">
                            <button data-action="delete-video" data-id="${v.id}" class="text-error hover:text-red-400 chief-only">
                                <span class="material-symbols-outlined text-lg">delete</span>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (e) {
            console.error('Failed to load videos', e);
            showToast('Failed to load videos', 'error');
        }
    };

    const loadCategories = async () => {
        const catSelect = document.getElementById('video-category-select');
        if (!catSelect) return;

        try {
            const result = await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'categories' })
            });
            if (result.success) {
                catSelect.innerHTML = '<option value="">Select Category</option>' + 
                    result.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }
        } catch (e) {
            console.error('Failed to load categories', e);
        }
    };

    const bindActions = () => {
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;
            if (action === 'delete-video') {
                if (confirm('Are you sure you want to delete this video asset?')) {
                    try {
                        await fetchJson(endpoints.videos, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'delete', id: btn.dataset.id })
                        });
                        showToast('Video deleted', 'success');
                        loadVideos();
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                }
            }
        });

        // Bind whichever video form exists on the page (inline or modal)
        for (const formId of ['video-asset-form', 'add-video-form']) {
            const form = document.getElementById(formId);
            if (!form) continue;
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn?.textContent ?? '';
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Saving…'; }

                const payload = serializeForm(form);
                payload.action = 'create';

                try {
                    await fetchJson(endpoints.videos, {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    showToast('Video registered successfully', 'success');
                    form.reset();
                    document.getElementById('add-video-modal')?.classList.add('hidden');
                    loadVideos();
                } catch (err) {
                    showToast(err.message || 'Failed to register video', 'error');
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
                }
            });
        }
    };

    const setupModal = () => {
        const modal = document.getElementById('add-video-modal');
        const trigger = document.getElementById('add-video-trigger');
        const closeBtn = document.getElementById('close-video-modal');

        if (!modal || !trigger) return;

        trigger.addEventListener('click', () => modal.classList.remove('hidden'));
        closeBtn?.addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
    };

    checkAuth();
    loadVideos();
    loadCategories();
    bindActions();
    setupModal();
});
