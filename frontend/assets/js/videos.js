/* Video Management Script for MBTV Kenya */

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, checkAuth, serializeForm, renderNavUser } = MBTV_CORE;

    let tsFilterCategory, tsModalCategory;

    const loadVideos = async () => {
        const grid = document.getElementById('video-grid');
        if (!grid) return;

        try {
            const result = await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'list' })
            });
            
            if (result.success) {
                if (result.videos.length === 0) {
                    grid.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500 font-black uppercase tracking-widest italic">No Media Assets Found</div>';
                    return;
                }

                grid.innerHTML = result.videos.map(v => {
                    const date = v.created_at ? new Date(v.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';
                    const thumb = v.thumbnail_url || 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=400';
                    return `
                    <div class="bg-surface border border-white/5 rounded-3xl overflow-hidden group hover:border-primary/30 transition-all shadow-xl">
                        <div class="relative aspect-video overflow-hidden">
                            <img src="${thumb}" alt="${v.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                            <div class="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent"></div>
                            <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                <span class="bg-primary/20 backdrop-blur-md text-primary text-[8px] font-black px-2 py-0.5 rounded border border-primary/20 uppercase tracking-widest">${v.category_name || 'Uncategorized'}</span>
                                <a href="${v.video_url}" target="_blank" class="w-10 h-10 bg-white text-slate-950 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                                    <span class="material-symbols-outlined fill-icon">play_arrow</span>
                                </a>
                            </div>
                        </div>
                        <div class="p-6">
                            <h4 class="text-sm font-headline font-black text-white leading-tight mb-2 line-clamp-1">${v.title}</h4>
                            <p class="text-[10px] text-slate-500 line-clamp-2 mb-6 font-medium italic">"${v.description || 'No description provided.'}"</p>
                            <div class="flex items-center justify-between border-t border-white/5 pt-4">
                                <span class="text-[8px] font-black text-slate-600 uppercase tracking-widest">${date}</span>
                                <div class="flex gap-2">
                                    <button onclick="window.populateEditVideo(${v.id})" class="p-2 text-slate-500 hover:text-white transition-colors"><span class="material-symbols-outlined text-base">edit</span></button>
                                    <button onclick="window.confirmDeleteVideo(${v.id})" class="p-2 text-slate-500 hover:text-error transition-colors chief-only"><span class="material-symbols-outlined text-base">delete</span></button>
                                </div>
                            </div>
                        </div>
                    </div>`;
                }).join('');
            }
        } catch (e) {
            console.error('Failed to load videos', e);
            showToast('Failed to load videos', 'error');
        }
    };

    const loadCategories = async () => {
        const filterSelect = document.getElementById('category-filter');
        const modalSelect = document.getElementById('modal-category-select');

        try {
            const result = await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'categories' })
            });
            if (result.success) {
                // Filter dropdown
                if (filterSelect) {
                    if (tsFilterCategory) tsFilterCategory.destroy();
                    filterSelect.innerHTML = '<option value="">All Streams</option>';
                    tsFilterCategory = new TomSelect(filterSelect, {
                        valueField: 'id',
                        labelField: 'name',
                        searchField: ['name'],
                        options: result.categories,
                        render: {
                            option: (data, escape) => `<div class="text-[10px] font-black uppercase italic">${escape(data.name)}</div>`
                        }
                    });
                }

                // Modal dropdown
                if (modalSelect) {
                    if (tsModalCategory) tsModalCategory.destroy();
                    modalSelect.innerHTML = '<option value="">Select Category...</option>';
                    tsModalCategory = new TomSelect(modalSelect, {
                        valueField: 'id',
                        labelField: 'name',
                        searchField: ['name'],
                        options: result.categories,
                        render: {
                            option: (data, escape) => `<div class="text-[10px] font-black uppercase italic">${escape(data.name)}</div>`
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load categories', e);
        }
    };

    const nextBtn = document.getElementById('next-to-step-2');
    const backBtn = document.getElementById('back-to-step-1');
    const step1 = document.getElementById('form-step-1');
    const step2 = document.getElementById('form-step-2');
    const step1Actions = document.getElementById('step-1-actions');
    const step2Actions = document.getElementById('step-2-actions');
    const stepIndicator = document.getElementById('modal-step-indicator');

    const showStep = (step) => {
        if (step === 1) {
            step1.classList.remove('hidden');
            step2.classList.add('hidden');
            step1Actions.classList.remove('hidden');
            step2Actions.classList.add('hidden');
            if (stepIndicator) stepIndicator.textContent = 'Step 1 of 2';
        } else {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            step1Actions.classList.add('hidden');
            step2Actions.classList.remove('hidden');
            if (stepIndicator) stepIndicator.textContent = 'Step 2 of 2';
        }
    };

    if (nextBtn) nextBtn.addEventListener('click', () => {
        // Basic validation for step 1
        const title = document.querySelector('input[name="title"]');
        const cat = document.querySelector('select[name="category_id"]');
        if (!title.value || !cat.value) {
            showToast('Please complete required fields', 'error');
            return;
        }
        showStep(2);
    });
    if (backBtn) backBtn.addEventListener('click', () => showStep(1));

    const bindForm = () => {
        const form = document.getElementById('video-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn?.textContent ?? '';
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Synchronizing...'; }

            const payload = serializeForm(form);
            payload.action = payload.id ? 'update' : 'create';

            try {
                await fetchJson(endpoints.videos, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast(payload.id ? 'Asset updated' : 'Asset ingested', 'success');
                form.reset();
                if (tsModalCategory) tsModalCategory.clear();
                showStep(1); // Reset to step 1
                document.getElementById('video-modal').classList.add('hidden');
                loadVideos();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
            }
        });
    };

    window.confirmDeleteVideo = async (id) => {
        if (!confirm('Permanent asset removal?')) return;
        try {
            await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', id })
            });
            showToast('Asset removed', 'success');
            loadVideos();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    window.openCreateVideo = () => {
        const form = document.getElementById('video-form');
        if (form) form.reset();
        if (tsModalCategory) tsModalCategory.clear();
        document.getElementById('edit-video-id').value = '';
        document.getElementById('modal-title').textContent = 'Asset Ingestion';
        showStep(1);
        document.getElementById('video-modal').classList.remove('hidden');
    };

    window.populateEditVideo = async (id) => {
        try {
            const result = await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'list' }) // In a real app, fetch single
            });
            const v = result.videos.find(item => item.id == id);
            if (!v) return;

            const form = document.getElementById('video-form');
            document.getElementById('edit-video-id').value = v.id;
            document.getElementById('modal-title').textContent = 'Modify Asset';
            
            form.querySelector('[name="title"]').value = v.title;
            form.querySelector('[name="description"]').value = v.description || '';
            form.querySelector('[name="video_url"]').value = v.video_url;
            form.querySelector('[name="thumbnail_url"]').value = v.thumbnail_url || '';
            
            if (tsModalCategory) tsModalCategory.setValue(v.category_id);

            showStep(1);
            document.getElementById('video-modal').classList.remove('hidden');
        } catch (e) {
            showToast('Failed to fetch asset details', 'error');
        }
    };

    checkAuth();
    loadVideos();
    loadCategories();
    bindForm();
});
