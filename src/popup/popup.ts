document.addEventListener('DOMContentLoaded', () => {
    const loadingEl = document.getElementById('loading');
    const contentEl = document.getElementById('content');
    
    setTimeout(() => {
        if (loadingEl && contentEl) {
            loadingEl.classList.add('hidden');
            contentEl.classList.remove('hidden');
            contentEl.classList.add('animate-in', 'fade-in', 'slide-in-from-bottom-2', 'duration-500');
        }
    }, 1500);

    console.log('PrecioScout Popup Initialized');
});
