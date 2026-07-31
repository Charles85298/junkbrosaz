
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
  const galleryGrid = document.getElementById('serviceGalleryGrid');
  const galleryFilters = document.getElementById('galleryFilters');
  const galleryCache = new Map();
  let activeGallery = null;
  let activeIndex = 0;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function titleFromSlug(slug) {
    return window.SERVICE_GALLERY_TITLES?.[slug]
      || slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  function renderGalleryCards(galleries) {
    if (!galleryGrid) return;
    if (!galleries.length) {
      galleryGrid.innerHTML = '<p class="gallery-empty">Project photos are coming soon.</p>';
      return;
    }
    galleryGrid.innerHTML = galleries.map(gallery => `
      <button class="service-gallery-card reveal visible" type="button" data-gallery="${escapeHtml(gallery.slug)}" aria-label="Open ${escapeHtml(gallery.title)} gallery">
        <img src="${escapeHtml(gallery.cover)}" alt="${escapeHtml(gallery.title)} gallery cover" loading="lazy" decoding="async">
        <span class="gallery-card-overlay"><strong>${escapeHtml(gallery.title)}</strong><small>View gallery</small></span>
        <span class="photo-count">${gallery.count} photo${gallery.count === 1 ? '' : 's'}</span>
      </button>`).join('');
    galleryGrid.querySelectorAll('[data-gallery]').forEach(card => {
      card.addEventListener('click', () => openServiceGallery(card.dataset.gallery));
    });
  }

  function renderFilters(galleries) {
    if (!galleryFilters) return;
    const filters = [{ slug: 'all', title: 'All services' }, ...galleries.map(g => ({ slug: g.slug, title: g.title }))];
    galleryFilters.innerHTML = filters.map((filter, index) => `
      <button type="button" class="gallery-filter${index === 0 ? ' active' : ''}" data-filter="${escapeHtml(filter.slug)}">${escapeHtml(filter.title)}</button>`).join('');
    galleryFilters.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      galleryFilters.querySelectorAll('.gallery-filter').forEach(item => item.classList.toggle('active', item === button));
      const filter = button.dataset.filter;
      galleryGrid.querySelectorAll('[data-gallery]').forEach(card => {
        card.hidden = filter !== 'all' && card.dataset.gallery !== filter;
      });
    });
  }

  async function loadGalleryManifest() {
    try {
      const response = await fetch(`/assets/data/galleries.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Manifest returned ${response.status}`);
      const data = await response.json();
      const galleries = (data.galleries || []).filter(gallery => gallery.count > 0);
      galleries.forEach(gallery => galleryCache.set(gallery.slug, gallery));
      renderGalleryCards(galleries);
      renderFilters(galleries);
    } catch (error) {
      console.error('Could not load gallery manifest.', error);
      if (galleryGrid) galleryGrid.innerHTML = '<p class="gallery-empty">Project photos are temporarily unavailable.</p>';
    }
  }

  function setGalleryLoading(title) {
    galleryTitle.textContent = title;
    galleryMainImage.removeAttribute('src');
    galleryMainImage.alt = '';
    galleryMainImage.hidden = true;
    galleryCounter.textContent = '';
    galleryCaption.textContent = 'Loading photos…';
    galleryThumbnails.innerHTML = '';
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
    const next = images[(activeIndex + 1) % images.length];
    if (next) new Image().src = next.url;
  }

  function renderGallery(gallery) {
    activeGallery = gallery;
    galleryTitle.textContent = gallery.title;
    galleryThumbnails.innerHTML = '';
    if (!gallery.images.length) {
      galleryMainImage.hidden = true;
      galleryCounter.textContent = '0 photos';
      galleryCaption.textContent = 'No photos have been uploaded to this service gallery yet.';
      return;
    }
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

  function openServiceGallery(slug) {
    const gallery = galleryCache.get(slug) || { slug, title: titleFromSlug(slug), images: [] };
    setGalleryLoading(gallery.title);
    galleryDialog.showModal();
    document.body.classList.add('gallery-open');
    renderGallery(gallery);
  }

  document.getElementById('galleryPrev')?.addEventListener('click', () => showGalleryImage(activeIndex - 1));
  document.getElementById('galleryNext')?.addEventListener('click', () => showGalleryImage(activeIndex + 1));
  document.getElementById('galleryDialogClose')?.addEventListener('click', () => galleryDialog.close());
  galleryDialog?.addEventListener('close', () => document.body.classList.remove('gallery-open'));
  galleryDialog?.addEventListener('click', event => { if (event.target === galleryDialog) galleryDialog.close(); });
  document.addEventListener('keydown', event => {
    if (!galleryDialog?.open || !activeGallery?.images?.length) return;
    if (event.key === 'ArrowLeft') showGalleryImage(activeIndex - 1);
    if (event.key === 'ArrowRight') showGalleryImage(activeIndex + 1);
    if (event.key === 'Escape') galleryDialog.close();
  });

  loadGalleryManifest();

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
