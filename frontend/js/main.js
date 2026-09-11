const API = '/api';
let WA  = '918800105244'; // default, will be overridden from settings
let IG  = 'midnightatelier.gn';

/* ── Load settings from API ───────────────────────────────────────── */
async function loadSettings() {
  try {
    const settings = await fetch(`${API}/settings`).then(r => r.json());
    if (settings.whatsapp_number) WA = settings.whatsapp_number;
    if (settings.instagram_handle) IG = settings.instagram_handle;
    // Update all hardcoded WhatsApp links on the page
    document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
      const url = new URL(a.href);
      const text = url.searchParams.get('text') || '';
      a.href = `https://wa.me/${WA}${text ? '?text=' + encodeURIComponent(text) : ''}`;
    });
    // Update Instagram links
    document.querySelectorAll('a[href*="instagram.com"]').forEach(a => {
      a.href = `https://www.instagram.com/${IG}`;
    });
  } catch { /* use defaults */ }
}
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

/* ── Mobile hamburger ─────────────────────────────────────────────── */
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks?.classList.toggle('mobile-open');
});
navLinks?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    hamburger?.classList.remove('open');
    navLinks.classList.remove('mobile-open');
  });
});

/* ── Scroll reveal ────────────────────────────────────────────────── */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

function observeAll() {
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
}

/* ── Resolve image URL ───────────────────────────────────────────── */
function resolveImg(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : url;
}

/* ── Build room card ──────────────────────────────────────────────── */
function buildCard(room) {
  const imgs  = (room.images || '').split(',').map(s => s.trim()).filter(Boolean);
  const tags  = (room.amenities || '').split(',').map(s => s.trim()).filter(Boolean);
  const price = room.price_per_night ? `₹${Number(room.price_per_night).toLocaleString('en-IN')}` : 'On Request';
  const avail = room.is_available === 1;
  const msg   = encodeURIComponent(`Hi! I'm interested in *${room.name}*. Can you share availability?`);

  const srcList = imgs.map(i => resolveImg(i));

  /* Carousel HTML */
  let carouselHTML;
  if (srcList.length) {
    carouselHTML = `
      <div class="room-img" data-imgs='${JSON.stringify(srcList)}' data-idx="0">
        <img src="${srcList[0]}" alt="${room.name}" loading="lazy"
          onerror="this.closest('.room-img').innerHTML='<div class=\\'room-placeholder\\'><svg viewBox=\\'0 0 24 24\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><polyline points=\\'21 15 16 10 5 21\\'/></svg></div>'" />
        ${srcList.length > 1 ? `
          <button class="c-btn prev" onclick="event.stopPropagation();slide(this,-1)" aria-label="Prev">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="c-btn next" onclick="event.stopPropagation();slide(this,1)" aria-label="Next">
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div class="c-dots">
            ${srcList.map((_,i) => `<span class="d ${i===0?'on':''}" onclick="event.stopPropagation();goTo(this,${i})"></span>`).join('')}
          </div>` : ''}
      </div>`;
  } else {
    carouselHTML = `
      <div class="room-img">
        <div class="room-placeholder">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span>Photo coming soon</span>
        </div>
      </div>`;
  }

  const tagHTML = tags.slice(0,4).map(t => `<span class="room-tag">${t}</span>`).join('');
  const extra   = tags.length > 4 ? `<span class="room-tag">+${tags.length-4}</span>` : '';

  const card = document.createElement('div');
  card.className = 'room-card';
  card.style.cursor = 'pointer';
  card.onclick = () => openRoomDetail(room);
  card.innerHTML = `
    ${carouselHTML}
    <span class="room-badge ${avail ? 'avail' : 'noavail'}">${avail ? 'Available' : 'Unavailable'}</span>
    <div class="room-body">
      <h3 class="room-name">${room.name}</h3>
      <p class="room-desc">${room.description || 'A meticulously curated luxury retreat.'}</p>
      <div class="room-tags">${tagHTML}${extra}</div>
      <div class="room-foot">
        <div class="room-price">
          <span class="amt">${price}</span>
          <span class="per">per night</span>
        </div>
        ${avail
          ? `<a href="https://wa.me/${WA}?text=${msg}" target="_blank" rel="noopener" class="wa-btn" id="wa-${room.id}" onclick="event.stopPropagation()">
              <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.989.574 3.842 1.563 5.408L2 22l4.748-1.542C8.116 21.412 9.998 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
              Book via WhatsApp
            </a>`
          : `<span style="font-size:0.72rem;color:var(--muted);font-style:italic;">Unavailable</span>`}
      </div>
    </div>`;
  return card;
}

/* ── Carousel helpers ─────────────────────────────────────────────── */
function slide(btn, dir) {
  const wrap = btn.closest('.room-img');
  navCarousel(wrap, +wrap.dataset.idx + dir);
}
function goTo(dot, idx) {
  navCarousel(dot.closest('.room-img'), idx);
}
function navCarousel(wrap, n) {
  const imgs = JSON.parse(wrap.dataset.imgs || '[]');
  if (!imgs.length) return;
  const idx = ((n % imgs.length) + imgs.length) % imgs.length;
  wrap.dataset.idx = idx;
  const img = wrap.querySelector('img');
  if (img) { img.style.opacity = '0'; setTimeout(() => { img.src = imgs[idx]; img.style.opacity = '1'; }, 220); }
  wrap.querySelectorAll('.d').forEach((d,i) => d.classList.toggle('on', i === idx));
}

/* ── Load rooms ───────────────────────────────────────────────────── */
let allRooms = [];
async function loadRooms() {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;
  try {
    allRooms = await fetch(`${API}/rooms`).then(r => r.json());
    grid.innerHTML = '';
    if (!allRooms.length) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:48px 0;font-size:0.9rem;">Rooms are being prepared. Check back soon.</p>`;
      return;
    }
    allRooms.forEach((room, i) => {
      const card = buildCard(room);
      card.classList.add('reveal');
      if (i % 3 === 1) card.classList.add('reveal-d1');
      if (i % 3 === 2) card.classList.add('reveal-d2');
      grid.appendChild(card);
      revealObs.observe(card);
    });
  } catch {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:48px 0;">Could not load rooms. Please contact us directly.</p>`;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   ROOM DETAIL MODAL
   ══════════════════════════════════════════════════════════════════════ */
function openRoomDetail(room) {
  const imgs = (room.images || '').split(',').map(s => s.trim()).filter(Boolean).map(resolveImg);
  const tags = (room.amenities || '').split(',').map(s => s.trim()).filter(Boolean);
  const price = room.price_per_night ? `₹${Number(room.price_per_night).toLocaleString('en-IN')}` : 'On Request';
  const avail = room.is_available === 1;
  const msg = encodeURIComponent(`Hi! I'm interested in *${room.name}*. Can you share availability and rates?`);

  // Image gallery with thumbnails
  const mainImg = imgs.length ? imgs[0] : '';
  const thumbsHTML = imgs.map((url, i) =>
    `<div class="rd-thumb ${i===0?'active':''}" onclick="switchDetailImg(this, '${url}')">
      <img src="${url}" alt="" loading="lazy">
    </div>`
  ).join('');

  const tagsHTML = tags.map(t => `<span class="rd-amenity">${t}</span>`).join('');

  const modal = document.getElementById('room-detail-modal');
  if (!modal) return;

  modal.querySelector('.rd-main-img').src = mainImg || '';
  modal.querySelector('.rd-main-img').alt = room.name;
  modal.querySelector('.rd-main-img').style.cursor = mainImg ? 'zoom-in' : 'default';
  modal.querySelector('.rd-main-img').onclick = mainImg ? () => openLb(modal.querySelector('.rd-main-img').src) : null;
  modal.querySelector('.rd-thumbs').innerHTML = thumbsHTML || '<p style="color:var(--muted);font-size:0.8rem;">No photos available</p>';
  modal.querySelector('.rd-name').textContent = room.name;
  modal.querySelector('.rd-desc').textContent = room.description || 'A meticulously curated luxury retreat.';
  modal.querySelector('.rd-amenities').innerHTML = tagsHTML || '<span style="color:var(--muted);">No amenities listed</span>';
  modal.querySelector('.rd-price-val').textContent = price;
  modal.querySelector('.rd-status').className = `rd-status ${avail ? 'avail' : 'noavail'}`;
  modal.querySelector('.rd-status').textContent = avail ? '● Available for Booking' : '● Currently Unavailable';

  const waBtn = modal.querySelector('.rd-wa-btn');
  if (avail) {
    waBtn.href = `https://wa.me/${WA}?text=${msg}`;
    waBtn.style.display = 'inline-flex';
    modal.querySelector('.rd-unavail-msg').style.display = 'none';
  } else {
    waBtn.style.display = 'none';
    modal.querySelector('.rd-unavail-msg').style.display = 'block';
  }

  modal.style.display = '';
  modal.style.visibility = '';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function switchDetailImg(thumb, url) {
  const modal = document.getElementById('room-detail-modal');
  const mainImg = modal.querySelector('.rd-main-img');
  mainImg.style.opacity = '0';
  setTimeout(() => {
    mainImg.src = url;
    mainImg.style.opacity = '1';
    mainImg.onclick = () => openLb(url);
  }, 200);
  modal.querySelectorAll('.rd-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function closeRoomDetail() {
  const m = document.getElementById('room-detail-modal');
  if (m) { m.classList.remove('open'); m.style.visibility = 'hidden'; }
  document.body.style.overflow = '';
}

/* ── Load gallery (from gallery API — only admin-uploaded photos) ── */
async function loadGallery() {
  const wrap = document.getElementById('gallery-container');
  const section = document.getElementById('gallery');
  if (!wrap) return;
  try {
    const galleryImages = await fetch(`${API}/gallery`).then(r => r.json());
    if (!galleryImages.length) {
      // Hide gallery section if no admin-uploaded photos
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = '';
    wrap.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'gal-grid';
    galleryImages.forEach(({ image_url, caption }) => {
      const url = resolveImg(image_url);
      const item = document.createElement('div');
      item.className = 'gal-item reveal';
      item.innerHTML = `
        <img src="${url}" alt="${caption || 'Gallery'}" loading="lazy">
        <div class="gal-overlay">
          <svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </div>`;
      item.addEventListener('click', () => openLb(url));
      grid.appendChild(item);
      revealObs.observe(item);
    });
    wrap.appendChild(grid);
  } catch { /* keep placeholder */ }
}

/* ── Lightbox ─────────────────────────────────────────────────────── */
const lb    = document.getElementById('lightbox');
const lbImg = document.getElementById('lightbox-img');
function openLb(src) {
  lbImg.src = src; lb?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLb() { lb?.classList.remove('open'); document.body.style.overflow = ''; }
document.getElementById('lb-close')?.addEventListener('click', closeLb);
lb?.addEventListener('click', e => { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLb(); closeRoomDetail(); } });

/* ── Init ─────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  observeAll();
  await loadSettings();
  await loadRooms();
  await loadGallery();

  // Room detail modal close handlers
  document.getElementById('room-detail-modal')?.addEventListener('click', e => {
    if (e.target.id === 'room-detail-modal') closeRoomDetail();
  });
  document.getElementById('rd-close')?.addEventListener('click', closeRoomDetail);
});

/* Expose for inline handlers */
window.slide  = slide;
window.goTo   = goTo;
window.switchDetailImg = switchDetailImg;
window.openRoomDetail = openRoomDetail;
window.closeRoomDetail = closeRoomDetail;
