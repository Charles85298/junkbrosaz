
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
  const galleryCache = new Map();
  let activeGallery = null;
  let activeIndex = 0;

  function localFallback(slug) {
    const gallery = window.SERVICE_GALLERIES?.[slug];
    if (!gallery) return null;
    return {
      title: gallery.title,
      images: gallery.images.map((url, index) => ({
        url,
        name: `${gallery.title} ${index + 1}`
      })),
      source: 'local'
    };
  }

  function titleFromCard(slug) {
    return document.querySelector(`[data-gallery="${slug}"] strong`)?.textContent?.trim()
      || slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  async function fetchAllGalleries() {
    try {
      const response = await fetch(`/api/gallery?t=${Date.now()}`, { headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }, cache: 'no-store' });
      if (!response.ok) throw new Error(`Gallery API returned ${response.status}`);
      const data = await response.json();

      Object.entries(data.galleries || {}).forEach(([slug, images]) => {
        galleryCache.set(slug, {
          title: titleFromCard(slug),
          images,
          source: 'r2'
        });
      });

      document.querySelectorAll('[data-gallery]').forEach(card => {
        const slug = card.dataset.gallery;
        const gallery = galleryCache.get(slug);
        const cover = card.querySelector('img');
        const count = card.querySelector('.photo-count');

        if (gallery?.images?.length) {
          if (cover) cover.src = gallery.images[0].url;
          if (count) count.textContent = `${gallery.images.length} photo${gallery.images.length === 1 ? '' : 's'}`;
        } else if (count) {
          count.textContent = '0 photos';
        }
      });
    } catch (error) {
      console.info('Live R2 galleries are unavailable; using local fallback images.', error);
    }
  }

  async function getGallery(slug) {
    try {
      const response = await fetch(`/api/gallery?service=${encodeURIComponent(slug)}&t=${Date.now()}`, {
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Gallery API returned ${response.status}`);
      const data = await response.json();
      const gallery = {
        title: titleFromCard(slug),
        images: data.images || [],
        source: 'r2'
      };
      galleryCache.set(slug, gallery);
      return gallery;
    } catch (error) {
      return localFallback(slug);
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
    galleryMainImage.onerror = async () => {
      galleryMainImage.hidden = true;
      let detail = 'The image endpoint did not return a displayable image.';
      try {
        const check = await fetch(selected.url, { cache: 'no-store' });
        const message = await check.text();
        detail = `Image request failed (${check.status}). ${message || detail}`;
      } catch (_) {
        detail = 'The browser could not reach the image endpoint.';
      }
      galleryCaption.textContent = detail;
    };
    galleryMainImage.onload = () => {
      galleryMainImage.hidden = false;
    };
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
      image.onerror = () => {
        button.classList.add('image-load-error');
        button.setAttribute('title', 'Image failed to load');
      };
      button.appendChild(image);
      button.addEventListener('click', () => showGalleryImage(index));
      galleryThumbnails.appendChild(button);
    });
    showGalleryImage(0);
  }

  async function openServiceGallery(slug) {
    const title = titleFromCard(slug);
    setGalleryLoading(title);
    galleryDialog.showModal();
    document.body.classList.add('gallery-open');
    const gallery = await getGallery(slug);
    renderGallery(gallery || { title, images: [] });
  }

  document.querySelectorAll('[data-gallery]').forEach(card => {
    card.addEventListener('click', () => openServiceGallery(card.dataset.gallery));
  });
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

  fetchAllGalleries();

  // Keep the gallery synchronized with R2 without requiring a page reload.
  const galleryRefreshInterval = setInterval(fetchAllGalleries, 30000);
  window.addEventListener('focus', fetchAllGalleries);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') fetchAllGalleries();
  });
  window.addEventListener('beforeunload', () => clearInterval(galleryRefreshInterval), { once: true });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
