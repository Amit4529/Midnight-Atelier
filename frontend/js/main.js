const API_BASE = 'http://localhost:8000/api';
const WA_NUMBER = '918800105244';

/* ══════════════════════════════════════════════════════════════════════
   NAVBAR
   ══════════════════════════════════════════════════════════════════════ */
const navbar    = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
});

hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('mobile-open');
});

navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('mobile-open');
  });
});

/* ══════════════════════════════════════════════════════════════════════
   SCROLL REVEAL
   ══════════════════════════════════════════════════════════════════════ */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

function observeReveal() {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

/* ══════════════════════════════════════════════════════════════════════
   ROOMS — Fetch & Render
   ══════════════════════════════════════════════════════════════════════ */
async function loadRooms() {
  const container = document.getElementById('rooms-grid');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/rooms`);
    if (!res.ok) throw new Error('Network error');
    const rooms = await res.json();

    container.innerHTML = '';

    if (rooms.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--muted);">
          <p style="font-size:0.9rem;">Rooms are being prepared. Check back soon.</p>
        </div>`;
      return;
    }

    rooms.forEach((room, i) => {
      const card = createRoomCard(room);
      card.classList.add('reveal');
      if (i % 3 === 1) card.classList.add('reveal-delay-1');
      if (i % 3 === 2) card.classList.add('reveal-delay-2');
      container.appendChild(card);
    });

    // Observe newly added cards
    container.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  } catch (err) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:var(--muted);">
        <p>Could not load rooms. Please refresh or contact us directly.</p>
      </div>`;
  }
}

function createRoomCard(room) {
  const images   = (room.images || '').split(',').map(s => s.trim()).filter(Boolean);
  const amenities = (room.amenities || '').split(',').map(s => s.trim()).filter(Boolean);
  const price    = room.price_per_night ? `₹${Number(room.price_per_night).toLocaleString('en-IN')}` : 'Contact';
  const waMsg    = encodeURIComponent(`Hi! I'm interested in booking the *${room.name}*. Can you share availability? 🙏`);
  const waUrl    = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;
  const avail    = room.is_available === 1;

  const card = document.createElement('div');
  card.className = 'room-card';

  // Build image carousel
  let carouselHTML;
  if (images.length > 0) {
    const srcs = images.map(img => img.startsWith('http') ? img : `http://localhost:8000${img}`);
    carouselHTML = `
      <div class="room-carousel" data-images='${JSON.stringify(srcs)}' data-index="0">
        <img src="${srcs[0]}" alt="${room.name}" loading="lazy"
             onerror="this.closest('.room-carousel').innerHTML='<div class=\\'carousel-placeholder\\'><div class=\\'cp-icon\\'><svg viewBox=\\'0 0 24 24\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg></div></div>'" />
        ${srcs.length > 1 ? `
          <button class="carousel-btn prev" onclick="changeSlide(this,-1)" aria-label="Previous photo">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="carousel-btn next" onclick="changeSlide(this,1)" aria-label="Next photo">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div class="carousel-dots">
            ${srcs.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(this,${i})"></span>`).join('')}
          </div>` : ''}
      </div>`;
  } else {
    carouselHTML = `
      <div class="room-carousel">
        <div class="carousel-placeholder">
          <div class="cp-icon">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <span>Photo coming soon</span>
        </div>
      </div>`;
  }

  const tagHTML = amenities.slice(0, 4).map(a => `<span class="room-tag">${a}</span>`).join('');
  const moreTag = amenities.length > 4 ? `<span class="room-tag">+${amenities.length - 4} more</span>` : '';

  card.innerHTML = `
    ${carouselHTML}
    <span class="room-status ${avail ? 'avail' : 'unavail'}">${avail ? 'Available' : 'Unavailable'}</span>
    <div class="room-body">
      <h3 class="room-name">${room.name}</h3>
      <p class="room-desc">${room.description || 'Experience luxury like never before.'}</p>
      <div class="room-tags">${tagHTML}${moreTag}</div>
      <div class="room-footer">
        <div class="room-price">
          <span class="amount">${price}</span>
          <span class="per">per night</span>
        </div>
        ${avail
          ? `<a href="${waUrl}" target="_blank" rel="noopener" class="room-wa-btn" id="wa-room-${room.id}">
              <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.989.574 3.842 1.563 5.408L2 22l4.748-1.542C8.116 21.412 9.998 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
              Book via WhatsApp
            </a>`
          : `<span style="font-size:0.75rem;color:var(--muted);font-style:italic;">Currently unavailable</span>`}
      </div>
    </div>`;

  return card;
}

/* ── Carousel Controls ──────────────────────────────────────────── */
function changeSlide(btn, dir) {
  const carousel = btn.closest('.room-carousel');
  navigateCarousel(carousel, parseInt(carousel.dataset.index) + dir);
}

function goToSlide(dot, index) {
  const carousel = dot.closest('.room-carousel');
  navigateCarousel(carousel, index);
}

function navigateCarousel(carousel, newIndex) {
  const images = JSON.parse(carousel.dataset.images || '[]');
  if (!images.length) return;
  const idx = (newIndex + images.length) % images.length;
  carousel.dataset.index = idx;
  const img = carousel.querySelector('img');
  if (img) {
    img.style.opacity = '0';
    setTimeout(() => { img.src = images[idx]; img.style.opacity = '1'; }, 220);
  }
  carousel.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

/* ══════════════════════════════════════════════════════════════════════
   GALLERY — Built from room images
   ══════════════════════════════════════════════════════════════════════ */
async function loadGallery() {
  const container = document.getElementById('gallery-grid');
  if (!container) return;

  try {
    const res = await fetch(`${API_BASE}/rooms`);
    if (!res.ok) throw new Error();
    const rooms = await res.json();

    const allImages = [];
    rooms.forEach(room => {
      (room.images || '').split(',').map(s => s.trim()).filter(Boolean).forEach(img => {
        allImages.push({ url: img.startsWith('http') ? img : `http://localhost:8000${img}`, name: room.name });
      });
    });

    if (allImages.length === 0) return; // Keep placeholder

    container.innerHTML = '';
    container.className = 'gallery-grid';

    allImages.forEach(({ url, name }) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.innerHTML = `
        <img src="${url}" alt="${name}" loading="lazy">
        <div class="gallery-overlay">
          <svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </div>`;
      item.addEventListener('click', () => openLightbox(url));
      container.appendChild(item);
    });

    container.querySelectorAll('.gallery-item').forEach((el, i) => {
      el.classList.add('reveal');
      revealObserver.observe(el);
    });

  } catch (_) { /* silent */ }
}

/* ══════════════════════════════════════════════════════════════════════
   LIGHTBOX
   ══════════════════════════════════════════════════════════════════════ */
const lightbox    = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

/* ══════════════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  observeReveal();
  await loadRooms();
  await loadGallery();
  observeReveal(); // pick up newly added elements
});

// Expose carousel globals
window.changeSlide = changeSlide;
window.goToSlide   = goToSlide;
