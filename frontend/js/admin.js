const API = '/api';

/* ═══════════════════════════════════════════════════════════════════════
   AUTH HELPERS
   ═══════════════════════════════════════════════════════════════════════ */
function getToken() { return sessionStorage.getItem('ma_token'); }
function setToken(t) { sessionStorage.setItem('ma_token', t); }
function clearToken() { sessionStorage.removeItem('ma_token'); }

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

function requireAuth() {
  if (!getToken()) { window.location.href = '/admin/'; }
}

// Clean up old localStorage token (migrated to sessionStorage)
localStorage.removeItem('ma_token');

/* ═══════════════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/* ═══════════════════════════════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════════════════════════════ */
const loginForm = document.getElementById('login-form');
if (loginForm) {
  if (getToken()) window.location.href = '/admin/dashboard.html';

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    btn.innerHTML = '<span class="spinner"></span> Signing in...';
    btn.disabled = true;
    errEl.style.display = 'none';

    try {
      const res = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Invalid credentials');
      }
      const data = await res.json();
      setToken(data.access_token);
      window.location.href = '/admin/dashboard.html';
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════════ */
if (document.getElementById('rooms-table-body')) {
  requireAuth();

  let rooms = [];
  let editingRoomId = null;
  let pendingUploadFiles = [];
  let existingImages = [];

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    clearToken();
    window.location.href = '/admin/';
  });

  // ── Section Switching ──────────────────────────────────────────────
  const sections = ['rooms', 'gallery', 'settings'];
  const sectionTitles = {
    rooms: ['Rooms Management', 'Manage your property listings'],
    gallery: ['Gallery Management', 'Upload and manage photos for the public gallery'],
    settings: ['Settings', 'Configure your contact information'],
  };

  sections.forEach(s => {
    document.getElementById(`nav-${s}`)?.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(s);
    });
  });

  function switchSection(section) {
    // Nav highlighting
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`nav-${section}`)?.classList.add('active');

    // Show/hide sections
    sections.forEach(s => {
      const el = document.getElementById(`${s}-section`);
      if (el) el.style.display = s === section ? 'block' : 'none';
    });

    // Update topbar
    const [title, sub] = sectionTitles[section] || ['Dashboard', ''];
    const titleEl = document.getElementById('topbar-title');
    const subEl = document.getElementById('topbar-sub');
    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;

    // Show/hide add room button
    const addBtn = document.getElementById('add-room-btn');
    if (addBtn) addBtn.style.display = section === 'rooms' ? 'inline-flex' : 'none';

    // Load data for section
    if (section === 'gallery') loadGallery();
    if (section === 'settings') loadSettings();
  }

  // ── Load Rooms ────────────────────────────────────────────────────
  async function loadRooms() {
    try {
      const res = await fetch(`${API}/rooms`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      rooms = await res.json();
      renderStats();
      renderTable();
    } catch {
      showToast('Failed to load rooms', 'error');
    }
  }

  function renderStats() {
    const total = rooms.length;
    const available = rooms.filter(r => r.is_available === 1).length;
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-available').textContent = available;
    document.getElementById('stat-unavailable').textContent = total - available;
  }

  function renderTable() {
    const tbody = document.getElementById('rooms-table-body');
    if (rooms.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <p>No rooms yet. Add your first room!</p>
            <button class="btn btn-gold" onclick="openAddModal()">+ Add Room</button>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = rooms.map(room => {
      const imgs = (room.images || '').split(',').map(s => s.trim()).filter(Boolean);
      const firstImg = imgs[0] || null;
      const amenities = (room.amenities || '').split(',').slice(0, 3).join(', ');
      const price = room.price_per_night ? `₹${Number(room.price_per_night).toLocaleString('en-IN')}` : '—';

      return `
        <tr>
          <td>
            ${firstImg
              ? `<img src="${firstImg}" class="room-thumb" alt="${room.name}" onerror="this.outerHTML='<div class=\\'room-thumb-placeholder\\'></div>'">`
              : `<div class="room-thumb-placeholder"></div>`}
          </td>
          <td>
            <strong>${room.name}</strong><br>
            <small style="color:var(--muted);font-size:0.72rem">${(room.description || '').slice(0, 55)}...</small>
          </td>
          <td style="color:var(--gold);font-weight:600">${price}</td>
          <td style="color:var(--muted);font-size:0.8rem">${amenities || '—'}</td>
          <td>
            <span class="badge ${room.is_available ? 'badge-avail' : 'badge-unavail'}">
              ${room.is_available ? 'Available' : 'Unavailable'}
            </span>
          </td>
          <td>
            <div class="action-btns">
              <button class="btn btn-outline btn-sm" onclick="openEditModal(${room.id})" title="Edit">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="confirmDelete(${room.id}, '${room.name.replace(/'/g, "\\'")}')" title="Delete">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // ── Modal ─────────────────────────────────────────────────────────
  function openAddModal() {
    editingRoomId = null;
    existingImages = [];
    pendingUploadFiles = [];
    document.getElementById('modal-title').textContent = 'Add New Room';
    document.getElementById('room-form').reset();
    renderImagePreviews();
    switchImgTab('url');
    openModal('room-modal');
  }

  function openEditModal(id) {
    const room = rooms.find(r => r.id === id);
    if (!room) return;
    editingRoomId = id;
    existingImages = (room.images || '').split(',').map(s => s.trim()).filter(Boolean);
    pendingUploadFiles = [];

    document.getElementById('modal-title').textContent = 'Edit Room';
    document.getElementById('room-name').value = room.name || '';
    document.getElementById('room-desc').value = room.description || '';
    document.getElementById('room-price').value = room.price_per_night || '';
    document.getElementById('room-amenities').value = room.amenities || '';
    document.getElementById('room-available').value = room.is_available?.toString() || '1';
    document.getElementById('room-img-url').value = '';
    renderImagePreviews();
    switchImgTab('url');
    openModal('room-modal');
  }

  function openModal(id) { document.getElementById(id)?.classList.add('open'); }
  function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // ── Image Tab Switching ───────────────────────────────────────────
  function switchImgTab(tab) {
    document.querySelectorAll('.img-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.img-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
  }

  document.querySelectorAll('.img-tab').forEach(tab => {
    tab.addEventListener('click', () => switchImgTab(tab.dataset.tab));
  });

  // ── URL Add ───────────────────────────────────────────────────────
  document.getElementById('add-url-btn')?.addEventListener('click', () => {
    const urlInput = document.getElementById('room-img-url');
    const url = urlInput.value.trim();
    if (!url) return showToast('Please enter an image URL', 'error');
    if (!url.startsWith('http')) return showToast('Please enter a valid URL starting with http', 'error');
    existingImages.push(url);
    urlInput.value = '';
    renderImagePreviews();
    showToast('Image URL added!');
  });

  // ── File Upload ───────────────────────────────────────────────────
  document.getElementById('file-input')?.addEventListener('change', (e) => {
    Array.from(e.target.files).forEach(f => {
      if (f.type.startsWith('image/')) pendingUploadFiles.push(f);
    });
    renderImagePreviews();
    e.target.value = '';
  });

  function renderImagePreviews() {
    const container = document.getElementById('img-preview-list');
    if (!container) return;
    const all = [
      ...existingImages.map(url => ({ type: 'url', src: url })),
      ...pendingUploadFiles.map(f => ({ type: 'file', src: URL.createObjectURL(f) })),
    ];
    if (!all.length) {
      container.innerHTML = '<p style="color:var(--muted);font-size:0.8rem;">No images added yet</p>';
      return;
    }
    container.innerHTML = all.map((img, i) => `
      <div class="img-preview-item" data-index="${i}" data-type="${img.type}">
        <img src="${img.src}" alt="Preview">
        <button class="remove-img" onclick="removeImage(${i}, '${img.type}')" title="Remove">✕</button>
      </div>`).join('');
  }

  function removeImage(index, type) {
    if (type === 'url') existingImages.splice(index, 1);
    else pendingUploadFiles.splice(index - existingImages.length, 1);
    renderImagePreviews();
  }

  // ── Save Room ─────────────────────────────────────────────────────
  document.getElementById('save-room-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-room-btn');
    const name = document.getElementById('room-name').value.trim();
    if (!name) return showToast('Room name is required', 'error');

    const payload = {
      name,
      description: document.getElementById('room-desc').value.trim(),
      price_per_night: parseFloat(document.getElementById('room-price').value) || 0,
      amenities: document.getElementById('room-amenities').value.trim(),
      images: existingImages.join(','),
      is_available: parseInt(document.getElementById('room-available').value),
    };

    btn.innerHTML = '<span class="spinner"></span> Saving...';
    btn.disabled = true;

    try {
      let roomId = editingRoomId;
      if (editingRoomId) {
        const res = await fetch(`${API}/rooms/${editingRoomId}`, {
          method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Update failed');
      } else {
        const res = await fetch(`${API}/rooms`, {
          method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Create failed');
        roomId = (await res.json()).id;
      }

      for (const file of pendingUploadFiles) {
        const fd = new FormData();
        fd.append('file', file);
        await fetch(`${API}/rooms/${roomId}/upload`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd,
        });
      }

      showToast(editingRoomId ? 'Room updated!' : 'Room added!');
      closeModal('room-modal');
      await loadRooms();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.textContent = 'Save Room';
      btn.disabled = false;
    }
  });

  // ── Delete Room ───────────────────────────────────────────────────
  let deletingRoomId = null;

  function confirmDelete(id, name) {
    deletingRoomId = id;
    document.getElementById('confirm-room-name').textContent = `"${name}"`;
    openModal('confirm-modal');
  }

  document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
    if (!deletingRoomId) return;
    const btn = document.getElementById('confirm-delete-btn');
    btn.innerHTML = '<span class="spinner"></span> Deleting...';
    btn.disabled = true;
    try {
      const res = await fetch(`${API}/rooms/${deletingRoomId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Room deleted');
      closeModal('confirm-modal');
      await loadRooms();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.textContent = 'Yes, Delete';
      btn.disabled = false;
      deletingRoomId = null;
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // GALLERY MANAGEMENT
  // ══════════════════════════════════════════════════════════════════
  let galleryImages = [];

  async function loadGallery() {
    try {
      const res = await fetch(`${API}/gallery`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      galleryImages = await res.json();
      document.getElementById('stat-gallery').textContent = galleryImages.length;
      renderGalleryGrid();
    } catch {
      showToast('Failed to load gallery', 'error');
    }
  }

  function renderGalleryGrid() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    if (!galleryImages.length) {
      grid.innerHTML = `<div class="gallery-empty-state"><p>No gallery photos yet</p><span>Upload photos to showcase in the public gallery section</span></div>`;
      return;
    }
    grid.innerHTML = galleryImages.map(img => `
      <div class="gal-admin-item">
        <img src="${img.image_url}" alt="${img.caption || ''}" loading="lazy">
        <div class="gal-admin-overlay">
          <button class="gal-del-btn" onclick="deleteGalleryImage(${img.id})" title="Delete">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
        ${img.caption ? `<div class="gal-admin-caption">${img.caption}</div>` : ''}
      </div>`).join('');
  }

  document.getElementById('gallery-file-input')?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    for (const file of files) {
      if (!file.type.startsWith('image/')) { showToast(`${file.name} is not an image`, 'error'); continue; }
      const fd = new FormData();
      fd.append('file', file);
      fd.append('caption', '');
      try {
        const res = await fetch(`${API}/gallery/upload`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, body: fd,
        });
        if (!res.ok) throw new Error('Upload failed');
        showToast(`${file.name} uploaded!`);
      } catch { showToast(`Failed to upload ${file.name}`, 'error'); }
    }
    e.target.value = '';
    await loadGallery();
  });

  async function deleteGalleryImage(id) {
    if (!confirm('Delete this gallery image?')) return;
    try {
      const res = await fetch(`${API}/gallery/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Gallery image deleted');
      await loadGallery();
    } catch (err) { showToast(err.message, 'error'); }
  }

  // ══════════════════════════════════════════════════════════════════
  // SETTINGS MANAGEMENT
  // ══════════════════════════════════════════════════════════════════
  async function loadSettings() {
    try {
      const settings = await fetch(`${API}/settings`).then(r => r.json());
      document.getElementById('setting-whatsapp').value = settings.whatsapp_number || '';
      document.getElementById('setting-instagram').value = settings.instagram_handle || '';
    } catch {
      showToast('Failed to load settings', 'error');
    }
  }

  document.getElementById('save-settings-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-settings-btn');
    const whatsapp = document.getElementById('setting-whatsapp').value.trim();
    const instagram = document.getElementById('setting-instagram').value.trim();

    if (!whatsapp) return showToast('WhatsApp number is required', 'error');

    btn.innerHTML = '<span class="spinner"></span> Saving...';
    btn.disabled = true;

    try {
      const res = await fetch(`${API}/settings`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ whatsapp_number: whatsapp, instagram_handle: instagram }),
      });
      if (!res.ok) throw new Error('Save failed');
      showToast('Settings saved!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.textContent = 'Save Settings';
      btn.disabled = false;
    }
  });

  // ── Expose globals ────────────────────────────────────────────────
  window.openAddModal = openAddModal;
  window.openEditModal = openEditModal;
  window.closeModal = closeModal;
  window.confirmDelete = confirmDelete;
  window.switchImgTab = switchImgTab;
  window.removeImage = removeImage;
  window.deleteGalleryImage = deleteGalleryImage;

  // ── Init ──────────────────────────────────────────────────────────
  loadRooms();
  fetch(`${API}/gallery`).then(r => r.json()).then(g => {
    document.getElementById('stat-gallery').textContent = g.length;
  }).catch(() => {});
}
