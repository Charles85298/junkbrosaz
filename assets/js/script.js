
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

  const photoCarousel = document.getElementById('photoCarousel');
  const photoCarouselStage = document.getElementById('photoCarouselStage');
  const photoCarouselImage = document.getElementById('photoCarouselImage');
  const photoCarouselTitle = document.getElementById('photoCarouselTitle');
  const photoCarouselCounter = document.getElementById('photoCarouselCounter');
  const photoCarouselPrev = document.getElementById('photoCarouselPrev');
  const photoCarouselNext = document.getElementById('photoCarouselNext');
  const photoCarouselDots = document.getElementById('photoCarouselDots');

  let serviceGallery = null;
  let carouselIndex = 0;
  let dialogIndex = 0;

  function imageUrl(imageData) {
    return imageData?.url || imageData?.src || '';
  }

  function imageName(imageData, index) {
    const raw = imageData?.name || imageData?.alt || '';
    if (!raw || /^img\s*\d+$/i.test(raw) || /^[a-f0-9 -]{20,}$/i.test(raw)) {
      return `Service job photo ${index + 1}`;
    }
    return raw;
  }

  function setCarouselMessage(message) {
    if (photoCarouselTitle) photoCarouselTitle.textContent = message;
    if (photoCarouselCounter) photoCarouselCounter.textContent = '';
    if (photoCarouselImage) {
      photoCarouselImage.hidden = true;
      photoCarouselImage.removeAttribute('src');
    }
    if (photoCarouselPrev) photoCarouselPrev.disabled = true;
    if (photoCarouselNext) photoCarouselNext.disabled = true;
  }

  function renderCarouselDots() {
    if (!photoCarouselDots) return;
    photoCarouselDots.innerHTML = '';
    const images = serviceGallery?.images || [];
    images.forEach((imageData, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'photo-carousel-dot';
      dot.setAttribute('aria-label', `Show project photo ${index + 1}`);
      dot.addEventListener('click', () => showCarouselImage(index));
      photoCarouselDots.appendChild(dot);
    });
    photoCarouselDots.hidden = images.length <= 1;
  }

  function showCarouselImage(index) {
    const images = serviceGallery?.images || [];
    if (!images.length) return;

    carouselIndex = (index + images.length) % images.length;
    const selected = images[carouselIndex];
    const url = imageUrl(selected);

    if (photoCarouselImage) {
      photoCarouselImage.hidden = false;
      photoCarouselImage.src = url;
      photoCarouselImage.alt = imageName(selected, carouselIndex);
    }
    if (photoCarouselTitle) photoCarouselTitle.textContent = serviceGallery.title || 'Our Service Work';
    if (photoCarouselCounter) photoCarouselCounter.textContent = `${carouselIndex + 1} of ${images.length} photos`;
    if (photoCarouselPrev) photoCarouselPrev.disabled = images.length <= 1;
    if (photoCarouselNext) photoCarouselNext.disabled = images.length <= 1;

    photoCarouselDots?.querySelectorAll('.photo-carousel-dot').forEach((dot, dotIndex) => {
      const active = dotIndex === carouselIndex;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
  }

  function buildDialogThumbnails() {
    if (!galleryThumbnails || !serviceGallery) return;
    galleryThumbnails.innerHTML = '';

    serviceGallery.images.forEach((imageData, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `View photo ${index + 1}`);

      const image = document.createElement('img');
      image.src = imageUrl(imageData);
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';

      button.appendChild(image);
      button.addEventListener('click', () => showDialogImage(index));
      galleryThumbnails.appendChild(button);
    });
  }

  function showDialogImage(index) {
    const images = serviceGallery?.images || [];
    if (!images.length || !galleryMainImage) return;

    dialogIndex = (index + images.length) % images.length;
    const selected = images[dialogIndex];
    galleryMainImage.hidden = false;
    galleryMainImage.src = imageUrl(selected);
    galleryMainImage.alt = imageName(selected, dialogIndex);
    if (galleryCounter) galleryCounter.textContent = `${dialogIndex + 1} / ${images.length}`;
    if (galleryCaption) galleryCaption.textContent = imageName(selected, dialogIndex);

    galleryThumbnails?.querySelectorAll('button').forEach((button, thumbIndex) => {
      const active = thumbIndex === dialogIndex;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'true' : 'false');
      if (active) button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }

  function openGallery(index = carouselIndex) {
    if (!galleryDialog || !serviceGallery?.images?.length) return;
    if (galleryTitle) galleryTitle.textContent = serviceGallery.title || 'Our Service Work';
    buildDialogThumbnails();
    showDialogImage(index);
    galleryDialog.showModal();
    document.body.classList.add('gallery-open');
  }

  function initializeGallery(galleries) {
    serviceGallery = galleries.find(gallery => gallery.slug === 'services') || galleries[0] || null;
    if (!serviceGallery?.images?.length) {
      setCarouselMessage('No service photos were found.');
      return;
    }
    renderCarouselDots();
    showCarouselImage(0);
  }

  async function loadGalleryManifest() {
    setCarouselMessage('Loading project photos…');
    try {
      const manifestUrl = new URL('assets/data/galleries.json', document.baseURI);
      manifestUrl.searchParams.set('v', Date.now().toString());
      const response = await fetch(manifestUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Gallery manifest returned ${response.status}`);
      const data = await response.json();
      initializeGallery(Array.isArray(data.galleries) ? data.galleries : []);
    } catch (error) {
      console.error('Unable to load the service gallery:', error);
      const fallback = window.SERVICE_GALLERIES?.services;
      if (fallback?.images?.length) {
        initializeGallery([{ slug: 'services', ...fallback }]);
      } else {
        setCarouselMessage('The project photos are temporarily unavailable.');
      }
    }
  }

  photoCarouselPrev?.addEventListener('click', () => showCarouselImage(carouselIndex - 1));
  photoCarouselNext?.addEventListener('click', () => showCarouselImage(carouselIndex + 1));
  photoCarouselStage?.addEventListener('click', () => openGallery(carouselIndex));

  photoCarousel?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showCarouselImage(carouselIndex - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showCarouselImage(carouselIndex + 1);
    }
  });

  document.getElementById('galleryPrev')?.addEventListener('click', () => showDialogImage(dialogIndex - 1));
  document.getElementById('galleryNext')?.addEventListener('click', () => showDialogImage(dialogIndex + 1));
  document.getElementById('galleryDialogClose')?.addEventListener('click', () => galleryDialog?.close());
  galleryDialog?.addEventListener('close', () => document.body.classList.remove('gallery-open'));
  galleryDialog?.addEventListener('click', event => {
    if (event.target === galleryDialog) galleryDialog.close();
  });

  document.addEventListener('keydown', event => {
    if (!galleryDialog?.open || !serviceGallery?.images?.length) return;
    if (event.key === 'ArrowLeft') showDialogImage(dialogIndex - 1);
    if (event.key === 'ArrowRight') showDialogImage(dialogIndex + 1);
    if (event.key === 'Escape') galleryDialog.close();
  });

  loadGalleryManifest();

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
