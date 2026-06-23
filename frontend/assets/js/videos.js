/* Video Management Script for MBTV Kenya - Production Logging Focus */

window.addEventListener('DOMContentLoaded', () => {
    const { endpoints, fetchJson, showToast, checkAuth, serializeForm } = MBTV_CORE;

    let tsFilterCategory, tsModalCategory, tsCamera, tsOperator;
    let currentStep = 1;
    const totalSteps = 4;
    let allVideos = [];

    const loadHelpers = async () => {
        const camSelect = document.querySelector('select[name="camera_number"]');
        const opSelect = document.querySelector('select[name="camera_operator"]');
        if (!camSelect || !opSelect) return;

        try {
            const result = await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'helpers' })
            });

            if (result.success) {
                // Populate Cameras
                camSelect.innerHTML = '<option value="">Select Camera...</option>';
                result.cameras.forEach(cam => {
                    camSelect.innerHTML += `<option value="${cam.name}">${cam.name} (${cam.item_code})</option>`;
                });

                // Populate Operators
                opSelect.innerHTML = '<option value="">Select Operator...</option>';
                result.operators.forEach(op => {
                    opSelect.innerHTML += `<option value="${op.full_name}">${op.full_name}</option>`;
                });

                // Re-initialize TomSelect if they exist
                tsCamera = new TomSelect(camSelect, {
                    create: true, // Allow manual entry if not in list
                    maxItems: 1,
                    onInitialize: function() {
                        this.wrapper.classList.add('w-full', 'bg-background', 'rounded-xl', 'text-xs', 'border', 'border-white/5');
                        this.control.classList.add('bg-background', 'p-4', 'text-white', 'border-none', 'shadow-none');
                    }
                });

                tsOperator = new TomSelect(opSelect, {
                    create: true,
                    maxItems: 1,
                    onInitialize: function() {
                        this.wrapper.classList.add('w-full', 'bg-background', 'rounded-xl', 'text-xs', 'border', 'border-white/5');
                        this.control.classList.add('bg-background', 'p-4', 'text-white', 'border-none', 'shadow-none');
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load helpers', e);
        }
    };

    const renderVideos = (videos) => {
        const grid = document.getElementById('video-grid');
        if (!grid) return;

        if (videos.length === 0) {
            grid.innerHTML = '<div class="col-span-full py-20 text-center text-slate-500 font-black uppercase tracking-widest italic">No Media Assets Match Your Search</div>';
            return;
        }

        grid.innerHTML = videos.map(v => {
            const dateStr = v.video_date ? new Date(v.video_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
            
            const statusColors = {
                'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                'Edit In Progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                'Review': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
                'Completed': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                'Archived': 'bg-slate-500/10 text-slate-500 border-slate-500/20'
            };
            const statusClass = statusColors[v.status] || statusColors['Pending'];

            return `
            <div class="bg-surface border border-white/5 rounded-3xl p-6 hover:border-primary/30 transition-all shadow-xl group relative overflow-hidden">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${statusClass}">${v.status || 'Pending'}</span>
                    <span class="text-[9px] font-bold text-slate-600 font-mono tracking-tighter">${v.code || 'NO-REF'}</span>
                </div>
                
                <h4 class="text-sm font-headline font-black text-white leading-tight mb-1 line-clamp-1 italic">${v.title}</h4>
                <p class="text-[9px] text-primary/80 font-bold uppercase tracking-widest mb-4">${v.category || 'General Production'}</p>
                
                <div class="space-y-2.5 mb-6">
                    <div class="flex items-center gap-2 text-slate-400">
                        <span class="material-symbols-outlined text-sm opacity-50">calendar_today</span>
                        <span class="text-[10px] font-medium">${dateStr}</span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-400">
                        <span class="material-symbols-outlined text-sm opacity-50">location_on</span>
                        <span class="text-[10px] font-medium line-clamp-1">${v.location || '—'}</span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-400">
                        <span class="material-symbols-outlined text-sm opacity-50">videocam</span>
                        <span class="text-[10px] font-medium">${v.camera_operator || '—'} <span class="text-slate-600 font-black">/</span> ${v.camera_number || '—'}</span>
                    </div>
                </div>

                <div class="flex items-center justify-between border-t border-white/5 pt-4">
                     <div class="flex -space-x-2">
                        <div class="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[7px] font-black text-slate-500" title="Clips">${v.num_clips || 0}</div>
                        <div class="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[7px] font-black text-primary" title="Resolution">${v.resolution ? v.resolution.split(' ')[0] : '—'}</div>
                     </div>
                     <div class="flex gap-1">
                        <button onclick="window.populateEditVideo(${v.id})" class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5">
                            <span class="material-symbols-outlined text-base">edit_note</span>
                        </button>
                        <button onclick="window.confirmDeleteVideo(${v.id})" class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-slate-400 hover:text-error hover:bg-error/10 transition-all border border-white/5 chief-only">
                            <span class="material-symbols-outlined text-base">delete</span>
                        </button>
                     </div>
                </div>
            </div>`;
        }).join('');
    };

    const loadVideos = async () => {
        const grid = document.getElementById('video-grid');
        if (grid) {
            grid.innerHTML = Array(8).fill(0).map(() => MBTV_CORE.skeleton('h-48 w-full rounded-3xl')).join('');
        }
        
        try {
            const result = await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'list' })
            });
            
            if (result.success) {
                allVideos = result.videos;
                renderVideos(allVideos);
            }
        } catch (e) {
            console.error('Failed to load videos', e);
            showToast('Failed to load videos', 'error');
            if (grid) grid.innerHTML = '<div class="col-span-full py-12 text-center text-error font-black uppercase text-[10px] italic">Archive Link Failed</div>';
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
                if (filterSelect) {
                    if (tsFilterCategory) tsFilterCategory.destroy();
                    filterSelect.innerHTML = '<option value="">Search Streams</option>';
                    tsFilterCategory = new TomSelect(filterSelect, {
                        valueField: 'name',
                        labelField: 'name',
                        searchField: ['name'],
                        options: result.categories,
                        render: {
                            option: (data, escape) => `<div class="text-[10px] font-black uppercase italic">${escape(data.name)}</div>`
                        }
                    });
                    tsFilterCategory.on('change', handleSearch);
                }
                if (modalSelect) {
                    if (tsModalCategory) tsModalCategory.destroy();
                    modalSelect.innerHTML = '<option value="">Select Category...</option>';
                    tsModalCategory = new TomSelect(modalSelect, {
                        valueField: 'name',
                        labelField: 'name',
                        searchField: ['name'],
                        options: result.categories,
                        create: true,
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

    const nextBtn = document.getElementById('next-step');
    const prevBtn = document.getElementById('prev-step');
    const submitBtn = document.getElementById('submit-asset');
    const cancelBtn = document.getElementById('cancel-modal');
    const stepIndicator = document.getElementById('modal-step-indicator');
    const progressBar = document.getElementById('progress-bar');

    const updateStep = (step) => {
        currentStep = step;
        
        // Hide all steps
        for(let i=1; i<=totalSteps; i++) {
            const el = document.getElementById(`form-step-${i}`);
            if (el) el.classList.add('hidden');
        }
        
        // Show current
        document.getElementById(`form-step-${currentStep}`).classList.remove('hidden');
        
        // Update Buttons
        prevBtn.classList.toggle('hidden', currentStep === 1);
        cancelBtn.classList.toggle('hidden', currentStep !== 1);
        nextBtn.classList.toggle('hidden', currentStep === totalSteps);
        submitBtn.classList.toggle('hidden', currentStep !== totalSteps);
        
        // Update Indicator
        if (stepIndicator) stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}`;
        
        // Update Progress Bar
        const progress = (currentStep / totalSteps) * 100;
        if (progressBar) progressBar.style.width = `${progress}%`;
    };

    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (currentStep === 1) {
            const form = document.getElementById('video-form');
            const title = form.querySelector('[name="title"]');
            const cat = form.querySelector('[name="category"]');
            if (!title.value || !cat.value) {
                showToast('Title and Category are required', 'error');
                return;
            }
        }
        updateStep(currentStep + 1);
    });
    
    if (prevBtn) prevBtn.addEventListener('click', () => updateStep(currentStep - 1));

    const handleSearch = () => {
        const searchInput = document.getElementById('video-search');
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const category = document.getElementById('category-filter')?.value || '';

        const filtered = allVideos.filter(v => {
            const matchesQuery = !query ||
                v.title.toLowerCase().includes(query) ||
                (v.location && v.location.toLowerCase().includes(query)) ||
                (v.camera_operator && v.camera_operator.toLowerCase().includes(query)) ||
                (v.camera_number && v.camera_number.toLowerCase().includes(query)) ||
                (v.speaker && v.speaker.toLowerCase().includes(query)) ||
                (v.code && v.code.toLowerCase().includes(query));

            const matchesCategory = !category || v.category === category;

            return matchesQuery && matchesCategory;
        });

        renderVideos(filtered);
    };

    const bindForm = () => {
        const form = document.getElementById('video-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-asset');
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'Archiving...';

            const payload = serializeForm(form);
            payload.action = payload.id ? 'update' : 'create';

            // Ensure TomSelect values are captured
            if (tsModalCategory) payload.category = tsModalCategory.getValue();
            if (tsCamera) payload.camera_number = tsCamera.getValue();
            if (tsOperator) payload.camera_operator = tsOperator.getValue();

            try {
                await fetchJson(endpoints.videos, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast(payload.id ? 'Log updated' : 'Asset logged successfully', 'success');
                document.getElementById('video-modal').classList.add('hidden');
                loadVideos();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    };

    window.openCreateVideo = () => {
        const form = document.getElementById('video-form');
        if (form) form.reset();
        if (tsModalCategory) tsModalCategory.clear();
        if (tsCamera) tsCamera.clear();
        if (tsOperator) tsOperator.clear();
        document.getElementById('edit-video-id').value = '';
        document.getElementById('modal-title').textContent = 'Capture Metadata';
        updateStep(1);
        document.getElementById('video-modal').classList.remove('hidden');
    };

    window.populateEditVideo = async (id) => {
        try {
            const result = await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'list' })
            });
            const v = result.videos.find(item => item.id == id);
            if (!v) return;

            const form = document.getElementById('video-form');
            document.getElementById('edit-video-id').value = v.id;
            document.getElementById('modal-title').textContent = 'Modify Log Entry';
            
            // Step 1
            form.querySelector('[name="title"]').value = v.title;
            form.querySelector('[name="video_date"]').value = v.video_date || '';
            form.querySelector('[name="location"]').value = v.location || '';
            if (tsModalCategory) tsModalCategory.setValue(v.category);

            // Step 2
            if (tsCamera) tsCamera.setValue(v.camera_number || '');
            form.querySelector('[name="resolution"]').value = v.resolution || '';
            if (tsOperator) tsOperator.setValue(v.camera_operator || '');
            form.querySelector('[name="speaker"]').value = v.speaker || '';

            // Step 3
            form.querySelector('[name="memory_card"]').value = v.memory_card || '';
            form.querySelector('[name="num_clips"]').value = v.num_clips || 0;
            form.querySelector('[name="total_duration"]').value = v.total_duration || '';

            // Step 4
            form.querySelector('[name="backup_status"]').value = v.backup_status || '';
            form.querySelector('[name="editor_assigned"]').value = v.editor_assigned || '';
            form.querySelector('[name="status"]').value = v.status || 'Pending';
            form.querySelector('[name="notes"]').value = v.notes || ''; 

            updateStep(1);
            document.getElementById('video-modal').classList.remove('hidden');
        } catch (e) {
            showToast('Failed to fetch entry details', 'error');
        }
    };

    window.confirmDeleteVideo = async (id) => {
        if (!confirm('Permanent archive deletion?')) return;
        try {
            await fetchJson(endpoints.videos, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', id })
            });
            showToast('Log Entry Removed', 'success');
            loadVideos();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    checkAuth();
    loadCategories();
    loadHelpers();
    loadVideos();
    bindForm();

    const searchInput = document.getElementById('video-search');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
});
