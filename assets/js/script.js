
(() => {
  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle?.querySelector('.theme-icon');
  const saved = localStorage.getItem('azjb-theme');
  const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (preferredDark ? 'dark' : 'light');

  function setTheme(theme) {
    html.dataset.theme = theme;
    localStorage.setItem('azjb-theme', theme);
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? '☀' : '☾';
    themeToggle?.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  setTheme(initial);
  themeToggle?.addEventListener('click', () => setTheme(html.dataset.theme === 'dark' ? 'light' : 'dark'));

  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('siteNav');
  menuToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    document.body.classList.toggle('nav-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    document.body.classList.remove('nav-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  const header = document.querySelector('.site-header');
  const progress = document.getElementById('progress');
  function onScroll() {
    const y = window.scrollY;
    header?.classList.toggle('scrolled', y > 10);
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  const galleryDialog = document.getElementById('galleryDialog');
  const galleryTitle = document.getElementById('galleryDialogTitle');
  const galleryMainImage = document.getElementById('galleryMainImage');
  const galleryCounter = document.getElementById('galleryCounter');
  const galleryCaption = document.getElementById('galleryCaption');
  const galleryThumbnails = document.getElementById('galleryThumbnails');
  const galleryGrid = document.getElementById('galleryCategoryGrid');
  const galleryMap = new Map();
  let activeGallery = null;
  let activeIndex = 0;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
  }

  function renderGalleryCards(galleries) {
    if (!galleryGrid) return;
    if (!galleries.length) {
      galleryGrid.innerHTML = '<div class="gallery-loading-card">No service photos were found.</div>';
      return;
    }

    galleryGrid.innerHTML = galleries.map((gallery, index) => {
      galleryMap.set(gallery.slug, gallery);
      const cover = gallery.cover
        ? `<img src="${escapeHtml(gallery.cover)}" alt="${escapeHtml(gallery.title)} project" loading="lazy" decoding="async">`
        : `<div class="gallery-card-placeholder" aria-hidden="true">${escapeHtml(gallery.icon || '•')}</div>`;
      const count = `${gallery.count} photo${gallery.count === 1 ? '' : 's'}`;
      return `<button class="gallery-category-card reveal visible" type="button" data-gallery="${escapeHtml(gallery.slug)}" aria-label="Open ${escapeHtml(gallery.title)} gallery">
        <span class="gallery-category-media">${cover}<span class="gallery-count-badge">${count}</span></span>
        <span class="gallery-category-copy">
          <span class="gallery-category-icon" aria-hidden="true">${escapeHtml(gallery.icon || '•')}</span>
          <span><strong>${escapeHtml(gallery.title)}</strong><small> View completed jobs</small></span>
          <span class="gallery-category-arrow" aria-hidden="true">→</span>
        </span>
      </button>`;
    }).join('');

    galleryGrid.querySelectorAll('[data-gallery]').forEach(card => {
      card.addEventListener('click', () => openServiceGallery(card.dataset.gallery));
    });
  }

  async function loadGalleryManifest() {
    try {
      const response = await fetch(`/assets/data/galleries.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Gallery manifest returned ${response.status}`);
      const data = await response.json();
      renderGalleryCards(Array.isArray(data.galleries) ? data.galleries : []);
    } catch (error) {
      console.error(error);
      if (galleryGrid) galleryGrid.innerHTML = '<div class="gallery-loading-card">The galleries are temporarily unavailable. Please refresh the page.</div>';
    }
  }

  function showGalleryImage(index) {
    if (!activeGallery?.images?.length) return;
    const images = activeGallery.images;
    activeIndex = (index + images.length) % images.length;
    const selected = images[activeIndex];
    galleryMainImage.hidden = false;
    galleryMainImage.src = selected.url;
    galleryMainImage.alt = `${activeGallery.title} photo ${activeIndex + 1}`;
    galleryCounter.textContent = `${activeIndex + 1} / ${images.length}`;
    galleryCaption.textContent = selected.name || activeGallery.title;
    galleryThumbnails.querySelectorAll('button').forEach((button, i) => {
      button.classList.toggle('active', i === activeIndex);
      button.setAttribute('aria-current', i === activeIndex ? 'true' : 'false');
      if (i === activeIndex) button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }

  function openServiceGallery(slug) {
    const gallery = galleryMap.get(slug);
    if (!gallery || !galleryDialog) return;
    activeGallery = gallery;
    activeIndex = 0;
    galleryTitle.textContent = gallery.title;
    galleryThumbnails.innerHTML = '';

    if (!gallery.images?.length) {
      galleryMainImage.hidden = true;
      galleryMainImage.removeAttribute('src');
      galleryCounter.textContent = '0 photos';
      galleryCaption.textContent = 'Photos for this service are coming soon.';
    } else {
      gallery.images.forEach((imageData, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `View photo ${index + 1}`);
        const image = document.createElement('img');
        image.src = imageData.url;
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        button.appendChild(image);
        button.addEventListener('click', () => showGalleryImage(index));
        galleryThumbnails.appendChild(button);
      });
      showGalleryImage(0);
    }

    galleryDialog.showModal();
    document.body.classList.add('gallery-open');
  }

  document.getElementById('galleryPrev')?.addEventListener('click', () => showGalleryImage(activeIndex - 1));
  document.getElementById('galleryNext')?.addEventListener('click', () => showGalleryImage(activeIndex + 1));
  document.getElementById('galleryDialogClose')?.addEventListener('click', () => galleryDialog.close());
  galleryDialog?.addEventListener('close', () => document.body.classList.remove('gallery-open'));
  galleryDialog?.addEventListener('click', event => {
    if (event.target === galleryDialog) galleryDialog.close();
  });
  document.addEventListener('keydown', event => {
    if (!galleryDialog?.open || !activeGallery?.images?.length) return;
    if (event.key === 'ArrowLeft') showGalleryImage(activeIndex - 1);
    if (event.key === 'ArrowRight') showGalleryImage(activeIndex + 1);
  });

  loadGalleryManifest();

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
