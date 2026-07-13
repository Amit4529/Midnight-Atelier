const API = 'http://localhost:8000/api';

/* ═══════════════════════════════════════════════════════════════════════
   AUTH HELPERS
   ═══════════════════════════════════════════════════════════════════════ */
function getToken() { return localStorage.getItem('ma_token'); }
function setToken(t) { localStorage.setItem('ma_token', t); }
function clearToken() { localStorage.removeItem('ma_token'); }

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

function requireAuth() {
  if (!getToken()) { window.location.href = '/admin/'; }
}

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
  // If already logged in, go to dashboard
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
      btn.innerHTML = '🔐 Sign In';
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

  // ── Load Rooms ────────────────────────────────────────────────────
  async function loadRooms() {
    try {
      const res = await fetch(`${API}/rooms`, { headers: { 'Authorization': `Bearer ${getToken()}` } });
      rooms = await res.json();
      renderStats();
      renderTable();
    } catch (err) {
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
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <span class="empty-icon">🛏️</span>
              <p>No rooms yet. Add your first room!</p>
              <button class="btn btn-gold" onclick="openAddModal()">+ Add Room</button>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rooms.map(room => {
      const imgs = (room.images || '').split(',').map(s => s.trim()).filter(Boolean);
      const firstImg = imgs[0] ? (imgs[0].startsWith('http') ? imgs[0] : `http://localhost:8000${imgs[0]}`) : null;
      const amenities = (room.amenities || '').split(',').slice(0, 3).join(', ');
      const price = room.price_per_night ? `₹${Number(room.price_per_night).toLocaleString('en-IN')}` : '—';

      return `
        <tr>
          <td>
            ${firstImg
              ? `<img src="${firstImg}" class="room-thumb" alt="${room.name}" onerror="this.outerHTML='<div class=\\'room-thumb-placeholder\\'>🛏️</div>'">`
              : `<div class="room-thumb-placeholder">🛏️</div>`}
          </td>
          <td>
            <strong>${room.name}</strong><br>
            <small style="color:var(--muted);font-size:0.75rem">${(room.description || '').slice(0, 60)}...</small>
          </td>
          <td style="color:var(--gold);font-weight:600">${price}</td>
          <td style="color:var(--muted);font-size:0.8rem">${amenities || '—'}</td>
          <td>
            <span class="badge ${room.is_available ? 'badge-avail' : 'badge-unavail'}">
              ${room.is_available ? '● Available' : '● Unavailable'}
            </span>
          </td>
          <td>
            <div class="action-btns">
              <button class="btn btn-outline btn-sm" onclick="openEditModal(${room.id})" title="Edit">✏️ Edit</button>
              <button class="btn btn-danger btn-sm" onclick="confirmDelete(${room.id}, '${room.name.replace(/'/g, "\\'")}')" title="Delete">🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // ── Modal ─────────────────────────────────────────────────────────
  const modal = document.getElementById('room-modal');
  const modalTitle = document.getElementById('modal-title');
  const roomForm = document.getElementById('room-form');

  function openAddModal() {
    editingRoomId = null;
    existingImages = [];
    pendingUploadFiles = [];
    modalTitle.textContent = 'Add New Room';
    roomForm.reset();
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

    modalTitle.textContent = 'Edit Room';
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

  function openModal(id) {
    document.getElementById(id)?.classList.add('open');
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
  }

  // Close modal on overlay click
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
    if (!url.startsWith('http')) return showToast('Please enter a valid URL (starting with http)', 'error');
    existingImages.push(url);
    urlInput.value = '';
    renderImagePreviews();
    showToast('Image URL added!');
  });

  // ── File Upload ───────────────────────────────────────────────────
  document.getElementById('file-input')?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      if (!f.type.startsWith('image/')) return showToast(`${f.name} is not an image`, 'error');
      pendingUploadFiles.push(f);
    });
    renderImagePreviews();
    e.target.value = '';
  });

  function renderImagePreviews() {
    const container = document.getElementById('img-preview-list');
    if (!container) return;

    const allPreviews = [
      ...existingImages.map(url => ({ type: 'url', src: url.startsWith('http') ? url : `http://localhost:8000${url}`, val: url })),
      ...pendingUploadFiles.map(f => ({ type: 'file', src: URL.createObjectURL(f), file: f })),
    ];

    if (allPreviews.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);font-size:0.8rem;">No images added yet</p>';
      return;
    }

    container.innerHTML = allPreviews.map((img, i) => `
      <div class="img-preview-item" data-index="${i}" data-type="${img.type}">
        <img src="${img.src}" alt="Preview" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\'/>'">
        <button class="remove-img" onclick="removeImage(${i}, '${img.type}')" title="Remove">✕</button>
      </div>`).join('');
  }

  function removeImage(index, type) {
    const urlCount = existingImages.length;
    if (type === 'url') {
      existingImages.splice(index, 1);
    } else {
      pendingUploadFiles.splice(index - urlCount, 1);
    }
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
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Update failed');
      } else {
        const res = await fetch(`${API}/rooms`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).detail || 'Create failed');
        const newRoom = await res.json();
        roomId = newRoom.id;
      }

      // Upload pending files
      for (const file of pendingUploadFiles) {
        const fd = new FormData();
        fd.append('file', file);
        await fetch(`${API}/rooms/${roomId}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getToken()}` },
          body: fd,
        });
      }

      showToast(editingRoomId ? 'Room updated successfully!' : 'Room added successfully!');
      closeModal('room-modal');
      await loadRooms();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.innerHTML = '💾 Save Room';
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
      const res = await fetch(`${API}/rooms/${deletingRoomId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Delete failed');
      showToast('Room deleted successfully');
      closeModal('confirm-modal');
      await loadRooms();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.innerHTML = '🗑️ Yes, Delete';
      btn.disabled = false;
      deletingRoomId = null;
    }
  });

  // ── Expose globals ────────────────────────────────────────────────
  window.openAddModal = openAddModal;
  window.openEditModal = openEditModal;
  window.closeModal = closeModal;
  window.confirmDelete = confirmDelete;
  window.switchImgTab = switchImgTab;
  window.removeImage = removeImage;

  // ── Init ──────────────────────────────────────────────────────────
  loadRooms();
}
