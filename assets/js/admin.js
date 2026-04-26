// ============================================================
// RN SPORTS HUB — Admin Panel v2 (PSJH Replica)
// ============================================================
// Sections: Login, Sidebar, Toast, Nav, Loaders, Dashboard,
//           Orders, Products, Images, Save/Edit/Delete,
//           Reviews, Bulk Upload, Coupons, Enquiries, Init

import { db } from './firebase.js';
import { uploadMultipleToCloudinary } from './cloudinary.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, getDoc, setDoc, serverTimestamp, query, orderBy, where
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ============================================================
// SECTION 1: AUTH
// ============================================================
const ADMIN_CREDS = { username: 'user', password: 'admin_01' };
const STORAGE_KEY = 'rn_admin_logged_in';

function checkLogin()    { return localStorage.getItem(STORAGE_KEY) === 'true'; }
function showLoginScreen() { document.getElementById('admin-login-screen').style.display = 'flex'; document.getElementById('admin-app').style.display = 'none'; }
function showAdminApp()    { document.getElementById('admin-login-screen').style.display = 'none'; document.getElementById('admin-app').style.display = 'flex'; }

window.adminLogin = function() {
  const u = document.getElementById('login-username')?.value.trim();
  const p = document.getElementById('login-password')?.value;
  const err = document.getElementById('login-error');
  if (u === ADMIN_CREDS.username && p === ADMIN_CREDS.password) {
    localStorage.setItem(STORAGE_KEY, 'true');
    if (err) err.style.display = 'none';
    showAdminApp(); initAdminApp();
  } else {
    if (err) { err.textContent = 'Invalid username or password.'; err.style.display = 'block'; }
    const box = document.getElementById('login-box');
    if (box) { box.style.animation = 'none'; void box.offsetWidth; box.style.animation = 'loginShake .4s ease'; }
  }
};
window.adminLogout = function() { localStorage.removeItem(STORAGE_KEY); showLoginScreen(); const pw = document.getElementById('login-password'); if (pw) pw.value = ''; };
function initLoginKeys() {
  document.getElementById('login-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.adminLogin(); });
  document.getElementById('login-username')?.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('login-password')?.focus(); });
}

// ============================================================
// SECTION 2: TOAST & MODAL
// ============================================================
function showToast(msg, type = 'success') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div'); t.className = `toast toast-${type}`; t.textContent = msg; c.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3200);
}
window.showToast = showToast;
window.closeModal = function(id) { document.getElementById(id)?.classList.remove('open'); };

// ============================================================
// SECTION 3: MOBILE SIDEBAR
// ============================================================
function initMobileSidebar() {
  const ham = document.getElementById('admin-hamburger');
  const sb  = document.getElementById('admin-sidebar');
  const ov  = document.getElementById('sidebar-overlay');
  if (!ham || !sb) return;
  if (window.innerWidth <= 900) sb.classList.remove('open');
  function toggle() { const open = sb.classList.toggle('open'); ov?.classList.toggle('visible', open); ham.classList.toggle('active', open); }
  function close()  { sb.classList.remove('open'); ov?.classList.remove('visible'); ham.classList.remove('active'); }
  ham.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  ham.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); toggle(); });
  ov?.addEventListener('click', close);
  sb.querySelectorAll('.admin-nav-item').forEach(i => i.addEventListener('click', () => { if (window.innerWidth <= 900) close(); }));
  window.addEventListener('resize', () => { if (window.innerWidth > 900) close(); });
}

// ============================================================
// SECTION 4: NAVIGATION
// ============================================================
window.showSection = function(name, btn) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'orders')      renderOrders();
  if (name === 'products')    renderAdminProducts();
  if (name === 'coupons')     renderCoupons();
  if (name === 'enquiries')   renderEnquiriesSection();
  if (name === 'reviews')     renderReviewsSection();
  if (name === 'bulk-upload') renderBulkUpload();
};

// ============================================================
// SECTION 5: STATE
// ============================================================
let allProducts   = [];
let allOrders     = [];
let allCoupons    = [];
let allEnquiries  = [];
let allReviews    = {};
let currentOrderId    = null;
let editingProductId  = null;
let uploadedImageUrls = [];

// ============================================================
// SECTION 6: FIRESTORE LOADERS
// ============================================================
async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('[Admin] Products:', allProducts.length);
  } catch (err) { console.error('[Admin] loadProducts:', err.message); }
}

async function loadOrders() {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const badge = document.getElementById('orders-badge');
    if (badge) { badge.textContent = allOrders.length; badge.style.display = allOrders.length ? 'inline-block' : 'none'; }
    console.log('[Admin] Orders:', allOrders.length);
  } catch (err) { console.error('[Admin] loadOrders:', err.message); }
}

async function loadCoupons() {
  try {
    const snap = await getDocs(collection(db, 'coupons'));
    allCoupons = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log('[Admin] Coupons:', allCoupons.length);
  } catch (err) { console.error('[Admin] loadCoupons:', err.message); }
}

async function loadEnquiries() {
  try {
    const q = query(collection(db, 'enquiries'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    allEnquiries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const unread = allEnquiries.filter(e => !e.read).length;
    const badge  = document.getElementById('enquiries-badge');
    if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? 'inline-block' : 'none'; }
    console.log('[Admin] Enquiries:', allEnquiries.length);
  } catch (err) { console.error('[Admin] loadEnquiries:', err.message); }
}

// ============================================================
// SECTION 7: DASHBOARD
// ============================================================
function renderDashboard() {
  const revenue  = allOrders.reduce((s, o) => s + Number(o.amount || 0), 0);
  const pending  = allOrders.filter(o => ['Paid','COD','Processing'].includes(o.status)).length;
  const delivered= allOrders.filter(o => o.status === 'Delivered').length;
  const safeSet  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  safeSet('d-orders',   allOrders.length);
  safeSet('d-revenue',  '₹' + revenue.toLocaleString('en-IN'));
  safeSet('d-pending',  pending);
  safeSet('d-delivered',delivered);
  safeSet('d-products', allProducts.length);
  const dateEl = document.getElementById('dash-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  ['d-chart-orders','d-chart-rev'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = Array.from({length:7},(_,i) =>
      `<div class="mini-bar${i===6?' hi':''}" style="height:${20+Math.floor(Math.random()*80)}%"></div>`).join('');
  });
  const container = document.getElementById('dash-recent');
  if (container) container.innerHTML = allOrders.length ? buildOrdersTable(allOrders.slice(0,5), true) : `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-label">No orders yet</div></div>`;
}

// ============================================================
// SECTION 8: ORDERS
// ============================================================
function renderOrders() {
  const q  = (document.getElementById('order-search')?.value || '').toLowerCase();
  const sf = document.getElementById('order-status-filter')?.value || 'all';
  let filtered = [...allOrders];
  if (q) filtered = filtered.filter(o => (o.name||'').toLowerCase().includes(q) || (o.phone||'').includes(q) || (o.orderId||o.id||'').toLowerCase().includes(q));
  if (sf !== 'all') filtered = filtered.filter(o => (o.status||'').toLowerCase() === sf.toLowerCase());
  const counter = document.getElementById('orders-count');
  if (counter) counter.textContent = `${filtered.length} of ${allOrders.length}`;
  const container = document.getElementById('orders-table-container');
  if (!container) return;
  container.innerHTML = filtered.length ? buildOrdersTable(filtered, false)
    : `<div class="empty-state"><div class="empty-icon">${allOrders.length===0?'📭':'🔍'}</div><div class="empty-label">${allOrders.length===0?'No orders yet':'Nothing found'}</div></div>`;
}
window.renderOrders = renderOrders;

function buildOrdersTable(orders, mini) {
  return `<div style="overflow-x:auto"><table class="admin-table"><thead><tr>
    <th>Customer</th>${!mini?'<th>Items</th>':''}
    <th>Amount</th><th>Screenshot</th><th>Status</th><th>Date</th><th></th>
  </tr></thead><tbody>
  ${orders.map(o => {
    const dateVal = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('en-IN') : (o.date||'—');
    const ssHtml  = o.screenshot ? `<a href="${o.screenshot}" target="_blank" style="color:var(--blue);font-size:11px;font-weight:700">View 🖼</a>` : `<span style="color:var(--dim)">—</span>`;
    const statusCls = 'status-' + (o.status||'Paid').toLowerCase().replace(/\s+/g,'_');
    return `<tr>
      <td><div style="font-weight:600;font-size:13px">${o.name||'—'}</div><div style="font-size:11px;color:var(--silver)">${o.phone||''}</div></td>
      ${!mini?`<td><div style="font-size:11px;color:var(--silver);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Array.isArray(o.items)?o.items.map(i=>`${i.name}(${i.size})`).join(', '):(o.items||'—')}</div></td>`:''}
      <td><span style="font-family:var(--font-head);font-size:1rem;color:var(--accent)">₹${Number(o.amount||0).toLocaleString('en-IN')}</span></td>
      <td>${ssHtml}</td>
      <td><span class="status-badge ${statusCls}">${o.status||'Paid'}</span></td>
      <td style="font-size:11px;color:var(--silver)">${dateVal}</td>
      <td><div class="action-btns"><button class="action-btn" onclick="openOrderModal('${o.id}')" title="View">👁</button></div></td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
}

const ORDER_STAGES  = ['Paid','Processing','Shipped','Delivered'];
const ORDER_LABELS  = ['Paid','Processing','Shipped','Delivered'];

window.openOrderModal = function(id) {
  const order = allOrders.find(o => o.id === id); if (!order) return;
  currentOrderId = id;
  const titleEl = document.getElementById('modal-order-title');
  if (titleEl) titleEl.textContent = `Order — ${order.name||'—'}`;

  const isCancelled = (order.status||'').toLowerCase() === 'cancelled';
  const stage = ORDER_STAGES.findIndex(s => s.toLowerCase() === (order.status||'Paid').toLowerCase());
  const timelineEl = document.getElementById('modal-timeline');
  if (timelineEl) timelineEl.innerHTML = ORDER_STAGES.map((s,i) => {
    const done   = !isCancelled && i < stage;
    const active = !isCancelled && i === stage;
    return `<div class="mt-step ${done?'done':active?'active':''}"><div class="mt-dot">${done?'✓':i+1}</div><div class="mt-label">${ORDER_LABELS[i]}</div></div>`;
  }).join('');

  const sel = document.getElementById('modal-status-select'); if (sel) sel.value = order.status||'Paid';
  const dateVal = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('en-IN') : (order.date||'—');
  const itemsDisplay = Array.isArray(order.items) ? order.items.map(i=>`${i.name} (${i.size} × ${i.qty})`).join(', ') : (order.items||'—');
  const detailsEl = document.getElementById('modal-order-details');
  if (detailsEl) detailsEl.innerHTML = `
    <div class="od-row"><span class="od-label">Customer</span><span class="od-val">${order.name||'—'}</span></div>
    <div class="od-row"><span class="od-label">Phone</span><span class="od-val">${order.phone||'—'}</span></div>
    <div class="od-row"><span class="od-label">Address</span><span class="od-val" style="font-size:12px">${order.address||'—'}</span></div>
    <div class="od-row"><span class="od-label">Items</span><span class="od-val" style="font-size:11px;color:var(--silver)">${itemsDisplay}</span></div>
    <div class="od-row"><span class="od-label">Amount</span><span class="od-val" style="color:var(--accent);font-family:var(--font-head);font-size:1.2rem">₹${Number(order.amount||0).toLocaleString('en-IN')}</span></div>
    <div class="od-row"><span class="od-label">Payment</span><span class="od-val">${order.payment||order.status||'—'}</span></div>
    ${order.screenshot?`<div class="od-row"><span class="od-label">Screenshot</span><span class="od-val"><a href="${order.screenshot}" target="_blank" style="color:var(--blue)">View Proof 🖼</a></span></div>`:''}
    <div class="od-row"><span class="od-label">Date</span><span class="od-val" style="color:var(--silver);font-size:12px">${dateVal}</span></div>`;
  document.getElementById('order-modal')?.classList.add('open');
};

window.updateOrderStatus = async function() {
  if (!currentOrderId) return;
  const newStatus = document.getElementById('modal-status-select')?.value;
  if (!newStatus) return;
  try {
    await updateDoc(doc(db, 'orders', currentOrderId), { status: newStatus });
    const idx = allOrders.findIndex(o => o.id === currentOrderId);
    if (idx !== -1) allOrders[idx].status = newStatus;
    closeModal('order-modal'); renderOrders(); renderDashboard();
    showToast(`Status updated: ${newStatus} ✓`);
  } catch (err) { showToast('Failed to update status.', 'error'); console.error(err); }
};

window.deleteOrder = async function() {
  if (!currentOrderId || !confirm('Delete this order? Cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'orders', currentOrderId));
    allOrders = allOrders.filter(o => o.id !== currentOrderId);
    closeModal('order-modal'); renderOrders(); renderDashboard();
    showToast('Order deleted.', 'error');
  } catch (err) { showToast('Failed to delete order.', 'error'); }
};

// ============================================================
// SECTION 9: PRODUCTS
// ============================================================
window.renderAdminProducts = function() {
  const q  = (document.getElementById('prod-search')?.value || '').toLowerCase();
  const cf = document.getElementById('prod-cat-filter')?.value || 'all';
  let prods = [...allProducts];
  if (q) prods = prods.filter(p => (p.name||'').toLowerCase().includes(q) || (p.brand||'').toLowerCase().includes(q));
  if (cf !== 'all') prods = prods.filter(p => p.category === cf);
  const grid = document.getElementById('admin-products-grid'); if (!grid) return;
  if (!prods.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><div class="empty-label">No products found</div></div>`; return;
  }
  grid.innerHTML = prods.map(p => {
    const disc = p.originalPrice ? Math.round(((p.originalPrice-p.price)/p.originalPrice)*100) : 0;
    const stockCls  = p.stock===0?'no-stock':p.stock<=5?'low-stock':'in-stock';
    const stockText = p.stock===0?'Out of Stock':p.stock<=5?`Only ${p.stock} left`:`In Stock (${p.stock})`;
    const imgSrc    = (p.images&&p.images.length>0&&p.images[0])?p.images[0]:(p.image||'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=60');
    return `<div class="prod-admin-card">
      <img src="${imgSrc}" alt="${p.name}" class="prod-admin-img" loading="lazy"
        onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=60'"
        onload="this.style.opacity='1'"/>
      <div class="prod-admin-body">
        <div class="prod-admin-cat">${p.brand||'—'} · ${p.category||'—'}</div>
        <div class="prod-admin-name">${p.name||'Unnamed'}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-family:var(--font-head);font-size:1rem;color:var(--accent)">₹${Number(p.price||0).toLocaleString('en-IN')}</span>
          <span style="font-family:var(--font-cond);font-size:11px;color:var(--silver);text-decoration:line-through">₹${Number(p.originalPrice||0).toLocaleString('en-IN')}</span>
          <span style="font-family:var(--font-cond);font-size:9px;font-weight:700;background:var(--accent-glow);color:var(--accent);padding:1px 5px;border-radius:3px">-${disc}%</span>
        </div>
        <div class="${stockCls}" style="font-family:var(--font-cond);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">${stockText}</div>
        <div class="action-btns">
          <button class="action-btn" onclick="editProduct('${p.id}')" title="Edit">✏️</button>
          <button class="action-btn del" onclick="deleteProduct('${p.id}')" title="Delete">🗑</button>
        </div>
      </div>
    </div>`;
  }).join('');
};

// ============================================================
// SECTION 10: IMAGE UPLOAD
// ============================================================
window.handleImageFileSelect = function(input) {
  const files  = Array.from(input.files).slice(0,5);
  const strip  = document.getElementById('pf-img-preview-strip');
  const status = document.getElementById('pf-img-upload-status');
  if (!strip||!status) return;
  strip.innerHTML = ''; uploadedImageUrls = [];
  if (!files.length) { status.textContent = ''; return; }
  status.textContent = `${files.length} file(s) selected — uploads when you save.`; status.style.color = 'var(--silver)';
  files.forEach(file => { const url = URL.createObjectURL(file); strip.insertAdjacentHTML('beforeend', `<img src="${url}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--border)"/>`); });
  input._selectedFiles = files;
  const urlField = document.getElementById('pf-img'); if (urlField) urlField.value = '';
  updatePreview();
};

// ============================================================
// SECTION 11: SAVE PRODUCT (THE KEY FIX — writes to Firebase)
// ============================================================
window.saveProduct = async function() {
  const name  = document.getElementById('pf-name')?.value.trim();
  const cat   = document.getElementById('pf-cat')?.value;
  const brand = document.getElementById('pf-brand')?.value.trim();
  const type  = document.getElementById('pf-type')?.value || '';
  const team  = document.getElementById('pf-team')?.value.trim() || '';
  const price = parseInt(document.getElementById('pf-price')?.value);
  const orig  = parseInt(document.getElementById('pf-original')?.value);
  const stock = parseInt(document.getElementById('pf-stock')?.value) || 10;
  const badge = document.getElementById('pf-badge')?.value || '';
  const feat  = document.getElementById('pf-featured')?.value === 'true';
  const sizesRaw = document.getElementById('pf-sizes')?.value || '';
  const desc  = document.getElementById('pf-desc')?.value.trim() || '';

  if (!name||!cat||!brand||isNaN(price)||isNaN(orig)) { showToast('Please fill all required fields!', 'error'); return; }
  if (price > orig) { showToast('Sale price cannot exceed original price!', 'error'); return; }

  const saveBtn = document.getElementById('pf-save-text');
  if (saveBtn) saveBtn.textContent = '⏳ Uploading images…';

  try {
    const fileInput = document.getElementById('pf-img-files');
    let imageUrls = [...uploadedImageUrls];

    if (fileInput?._selectedFiles?.length) {
      const statusEl = document.getElementById('pf-img-upload-status');
      if (statusEl) { statusEl.textContent = 'Uploading to Cloudinary…'; statusEl.style.color = 'var(--accent)'; }
      imageUrls = await uploadMultipleToCloudinary(fileInput._selectedFiles, 'rn_products',
        (done, total) => { if (statusEl) statusEl.textContent = `Uploaded ${done}/${total}…`; });
      uploadedImageUrls = imageUrls;
    }

    if (!imageUrls.length) {
      const urlField = document.getElementById('pf-img');
      if (urlField?.value.trim()) {
        imageUrls = [urlField.value.trim()];
      } else if (editingProductId) {
        const ex = allProducts.find(p => p.id === editingProductId);
        imageUrls = ex?.images || ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'];
      } else {
        imageUrls = ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'];
      }
    }

    if (saveBtn) saveBtn.textContent = '⏳ Saving to Firestore…';

    const sizes = sizesRaw.split(',').map(s => s.trim()).filter(Boolean);
    const productData = {
      name, category: cat, brand, type: type||null, team: team||null,
      price, originalPrice: orig, stock,
      badge: badge||null, featured: feat, images: imageUrls,
      sizes: sizes.length ? sizes : ['S','M','L','XL'],
      description: desc || 'Premium sports product.',
      features:[], specs:{}, rating:4.5, reviews:0,
      updatedAt: serverTimestamp()
    };

    if (editingProductId) {
      await updateDoc(doc(db, 'products', editingProductId), productData);
      showToast(`"${name}" updated ✓`);
    } else {
      productData.createdAt = serverTimestamp();
      const ref = await addDoc(collection(db, 'products'), productData);
      console.log('[Admin] Product added to Firebase:', ref.id);
      showToast(`"${name}" added ✓`);
    }

    await loadProducts();
    resetProductForm();
    showSection('products', document.querySelector('.admin-nav-item[onclick*="products"]'));
  } catch (err) {
    console.error('[Admin] saveProduct error:', err.message);
    showToast(`Error saving: ${err.message}`, 'error');
  } finally {
    if (saveBtn) saveBtn.textContent = '💾 Save Product';
  }
};

// ============================================================
// SECTION 12: EDIT / DELETE / RESET PRODUCT
// ============================================================
window.editProduct = function(id) {
  const p = allProducts.find(x => x.id === id); if (!p) return;
  editingProductId = id; uploadedImageUrls = [];
  const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val??''; };
  setVal('pf-name', p.name); setVal('pf-cat', p.category); setVal('pf-brand', p.brand);
  setVal('pf-type', p.type||''); setVal('pf-team', p.team||'');
  setVal('pf-price', p.price); setVal('pf-original', p.originalPrice); setVal('pf-stock', p.stock);
  setVal('pf-badge', p.badge||''); setVal('pf-featured', p.featured?'true':'false');
  setVal('pf-img', (p.images||[])[0]||'');
  setVal('pf-sizes', (p.sizes||[]).join(', ')); setVal('pf-desc', p.description||'');
  document.getElementById('pf-section-label').textContent = 'Editing';
  document.getElementById('pf-section-title').textContent = 'EDIT PRODUCT';
  document.getElementById('pf-save-text').textContent    = '💾 Update Product';
  const strip = document.getElementById('pf-img-preview-strip');
  if (strip) strip.innerHTML = (p.images||[]).map(src => `<img src="${src}" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid var(--border)"/>`).join('');
  const statusEl = document.getElementById('pf-img-upload-status');
  if (statusEl) { statusEl.textContent = `${(p.images||[]).length} existing image(s). Upload new files to replace.`; statusEl.style.color='var(--silver)'; }
  const fileInput = document.getElementById('pf-img-files'); if (fileInput) { fileInput.value=''; fileInput._selectedFiles=[]; }
  showSection('add-product', document.querySelector('.admin-nav-item[onclick*="add-product"]'));
  updatePreview();
};

window.deleteProduct = async function(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p || !confirm(`Delete "${p.name}"? Cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, 'products', id));
    allProducts = allProducts.filter(x => x.id !== id);
    renderAdminProducts(); renderDashboard();
    showToast(`"${p.name}" deleted.`, 'error');
  } catch (err) { showToast('Failed to delete.', 'error'); console.error(err); }
};

window.resetProductForm = function() {
  editingProductId = null; uploadedImageUrls = [];
  ['pf-name','pf-price','pf-original','pf-stock','pf-img','pf-sizes','pf-desc','pf-brand','pf-team'].forEach(id => { const el=document.getElementById(id); if(el)el.value=''; });
  ['pf-cat','pf-type','pf-badge'].forEach(id => { const el=document.getElementById(id); if(el)el.value=''; });
  const featEl = document.getElementById('pf-featured'); if(featEl)featEl.value='false';
  const strip  = document.getElementById('pf-img-preview-strip'); if(strip)strip.innerHTML='';
  const status = document.getElementById('pf-img-upload-status'); if(status){status.textContent='';status.style.color='var(--silver)';}
  const fileInput = document.getElementById('pf-img-files'); if(fileInput){fileInput.value='';fileInput._selectedFiles=[];}
  document.getElementById('pf-section-label').textContent = 'New Product';
  document.getElementById('pf-section-title').textContent = 'ADD PRODUCT';
  document.getElementById('pf-save-text').textContent     = '💾 Save Product';
  updatePreview();
};

window.updatePreview = function() {
  const previewCard = document.getElementById('product-preview-card'); if(!previewCard)return;
  const name  = document.getElementById('pf-name')?.value||'';
  const price = document.getElementById('pf-price')?.value||'';
  const brand = document.getElementById('pf-brand')?.value||'';
  const strip = document.getElementById('pf-img-preview-strip');
  let imgSrc = document.getElementById('pf-img')?.value||'';
  if (!imgSrc && strip) { const fi=strip.querySelector('img'); if(fi)imgSrc=fi.src; }
  if (!name&&!price) { previewCard.innerHTML=`<div style="aspect-ratio:1;background:var(--bg-3);display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:2.5rem">🖼️</div><div style="padding:12px"><div style="font-family:var(--font-cond);font-size:11px;color:var(--silver)">Fill form to preview</div></div>`; return; }
  previewCard.innerHTML = `
    <div style="aspect-ratio:1;background:var(--bg-3);overflow:hidden">
      ${imgSrc?`<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"/>`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:2.5rem">🖼️</div>`}
    </div>
    <div style="padding:12px">
      <div style="font-family:var(--font-cond);font-size:10px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.1em">${brand}</div>
      <div style="font-family:var(--font-cond);font-size:13px;font-weight:700;margin:4px 0">${name||'Product Name'}</div>
      ${price?`<div style="font-family:var(--font-head);font-size:1.1rem;color:var(--accent)">₹${Number(price).toLocaleString('en-IN')}</div>`:''}
    </div>`;
};

// ============================================================
// SECTION 13: REVIEWS
// ============================================================
async function loadAllReviews() {
  allReviews = {};
  if (!allProducts.length) return;
  await Promise.all(allProducts.map(async product => {
    try {
      const snap = await getDocs(collection(db, 'products', product.id, 'reviews'));
      if (!snap.empty) {
        const revs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        revs.sort((a,b) => { const ta=a.createdAt?.toDate?a.createdAt.toDate().getTime():0; const tb=b.createdAt?.toDate?b.createdAt.toDate().getTime():0; return tb-ta; });
        allReviews[product.id] = revs;
      }
    } catch (e) { /* no reviews for this product — that's fine */ }
  }));
}

async function renderReviewsSection() {
  const container = document.getElementById('reviews-container'); if (!container) return;
  container.innerHTML = `<div class="loading-state"><div class="admin-spinner"></div><p>Loading reviews…</p></div>`;
  await loadAllReviews();
  const total = Object.values(allReviews).reduce((s,arr)=>s+arr.length,0);
  if (total === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-label">No reviews yet</div></div>`; return; }
  let html = '';
  for (const product of allProducts) {
    const revs = allReviews[product.id]; if (!revs||!revs.length) continue;
    const imgSrc = (product.images||[])[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&q=60';
    html += `<div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-lg);margin-bottom:20px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid var(--border);background:var(--bg-3)">
        <img src="${imgSrc}" style="width:44px;height:44px;object-fit:cover;border-radius:var(--radius);border:1px solid var(--border)" loading="lazy" onerror="this.style.display='none'"/>
        <div><div style="font-family:var(--font-cond);font-weight:700;font-size:14px">${product.name}</div><div style="font-size:11px;color:var(--silver)">${product.brand||''} · <span style="color:var(--accent)">${revs.length} review${revs.length!==1?'s':''}</span></div></div>
      </div>
      <div style="padding:0 18px">${revs.map(r => buildReviewRow(product.id, r)).join('')}</div>
    </div>`;
  }
  container.innerHTML = html || `<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-label">No reviews yet</div></div>`;
}
window.renderReviewsSection = renderReviewsSection;

function buildReviewRow(productId, review) {
  const stars = '★'.repeat(Math.min(5,review.rating||5)) + '☆'.repeat(5-Math.min(5,review.rating||5));
  const dateStr = review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString('en-IN') : (review.date||'');
  return `<div id="review-row-${review.id}" style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);transition:opacity .3s,transform .3s">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
        <span style="font-weight:600;font-size:13px">${review.author||review.name||'Anonymous'}</span>
        <span style="color:var(--orange);font-size:13px;letter-spacing:1px">${stars}</span>
        ${dateStr?`<span style="font-size:11px;color:var(--silver)">${dateStr}</span>`:''}
      </div>
      <div style="font-size:13px;color:rgba(240,240,240,.75);line-height:1.6">${review.comment||review.text||'—'}</div>
    </div>
    <button onclick="deleteReview('${productId}','${review.id}')" class="action-btn del" title="Delete">🗑</button>
  </div>`;
}

window.deleteReview = async function(productId, reviewId) {
  if (!confirm('Delete this review?')) return;
  try {
    await deleteDoc(doc(db, 'products', productId, 'reviews', reviewId));
    if (allReviews[productId]) allReviews[productId] = allReviews[productId].filter(r => r.id !== reviewId);
    const row = document.getElementById(`review-row-${reviewId}`);
    if (row) { row.style.opacity='0'; row.style.transform='translateX(20px)'; setTimeout(()=>row.remove(),320); }
    showToast('Review deleted ✓');
  } catch (err) { showToast('Failed to delete review.', 'error'); console.error(err); }
};

// ============================================================
// SECTION 14: COUPONS
// ============================================================
function renderCoupons() {
  const container = document.getElementById('coupons-container'); if (!container) return;
  if (!allCoupons.length) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">🎟️</div><div class="empty-label">No coupons yet</div></div>`; return; }
  container.innerHTML = `<div style="overflow-x:auto"><table class="admin-table"><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Status</th><th></th></tr></thead><tbody>
  ${allCoupons.map(c => `<tr>
    <td><span class="coupon-code">${c.code}</span></td>
    <td>${c.discountType==='percent'?'Percentage':'Fixed (₹)'}</td>
    <td>${c.discountType==='percent'?`${c.value}%`:`₹${c.value}`}</td>
    <td><span class="status-badge ${c.active?'status-delivered':'status-cancelled'}">${c.active?'Active':'Inactive'}</span></td>
    <td><div class="action-btns">
      <button class="action-btn" onclick="toggleCoupon('${c.id}',${c.active})" title="${c.active?'Deactivate':'Activate'}">${c.active?'⏸':'▶'}</button>
      <button class="action-btn del" onclick="deleteCoupon('${c.id}')" title="Delete">🗑</button>
    </div></td>
  </tr>`).join('')}</tbody></table></div>`;
}

window.saveCoupon = async function() {
  const code  = document.getElementById('cp-code')?.value.trim().toUpperCase();
  const type  = document.getElementById('cp-type')?.value;
  const value = parseFloat(document.getElementById('cp-value')?.value);
  if (!code||!type||isNaN(value)||value<=0) { showToast('Please fill all coupon fields.', 'error'); return; }
  try {
    await addDoc(collection(db,'coupons'), { code, discountType:type, value, active:true, createdAt:serverTimestamp() });
    showToast(`Coupon "${code}" created ✓`);
    ['cp-code','cp-value'].forEach(id => { const el=document.getElementById(id); if(el)el.value=''; });
    await loadCoupons(); renderCoupons();
  } catch (err) { showToast('Failed to create coupon.', 'error'); console.error(err); }
};

window.toggleCoupon = async function(id, currentActive) {
  try {
    await updateDoc(doc(db,'coupons',id), { active: !currentActive });
    const idx = allCoupons.findIndex(c => c.id===id); if(idx!==-1) allCoupons[idx].active=!currentActive;
    renderCoupons(); showToast(`Coupon ${!currentActive?'activated':'deactivated'} ✓`);
  } catch (err) { showToast('Failed to update coupon.', 'error'); }
};

window.deleteCoupon = async function(id) {
  if (!confirm('Delete this coupon?')) return;
  try {
    await deleteDoc(doc(db,'coupons',id));
    allCoupons = allCoupons.filter(c=>c.id!==id);
    renderCoupons(); showToast('Coupon deleted.','error');
  } catch (err) { showToast('Failed to delete.','error'); }
};

// ============================================================
// SECTION 15: ENQUIRIES
// ============================================================
async function renderEnquiriesSection() {
  const container = document.getElementById('enquiries-container'); if (!container) return;
  container.innerHTML = `<div class="loading-state"><div class="admin-spinner"></div><p>Loading…</p></div>`;
  await loadEnquiries();
  if (!allEnquiries.length) { container.innerHTML=`<div class="empty-state"><div class="empty-icon">📩</div><div class="empty-label">No enquiries yet</div></div>`; return; }
  container.innerHTML = allEnquiries.map(e => {
    const dateStr = e.timestamp?.toDate ? e.timestamp.toDate().toLocaleString('en-IN') : '—';
    const isUnread = !e.read;
    return `<div id="enquiry-${e.id}" class="enquiry-card ${isUnread?'unread':''}">
      <div class="enquiry-header">
        <div>
          <div class="enquiry-meta" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
            <span class="enquiry-name">${e.name||'—'}</span>
            ${isUnread?`<span class="badge-new-tag">NEW</span>`:''}
            <span class="enquiry-date">${dateStr}</span>
          </div>
          <div class="enquiry-contact">📱 ${e.phone||'—'} &nbsp;·&nbsp; 📧 ${e.email||'—'}${e.subject?` &nbsp;·&nbsp; 📋 ${e.subject}`:''}</div>
        </div>
        <div class="action-btns" style="flex-wrap:wrap">
          ${isUnread?`<button onclick="markEnquiryRead('${e.id}')" class="action-btn" title="Mark read" style="width:auto;padding:0 10px;font-size:11px;font-family:var(--font-cond);font-weight:700">✓ Read</button>`:`<button class="action-btn" disabled style="opacity:.4;cursor:default;width:auto;padding:0 10px;font-size:11px">✓ Read</button>`}
          <button onclick="deleteEnquiry('${e.id}')" class="action-btn del">🗑</button>
          <a href="https://wa.me/917439001021?text=Hi+${encodeURIComponent(e.name||'')}%2C+thanks+for+contacting+RN+Sports+Hub!" target="_blank" class="action-btn wa" title="WhatsApp" style="width:auto;padding:0 10px;font-size:11px;text-decoration:none;font-family:var(--font-cond);font-weight:700">💬 WA</a>
        </div>
      </div>
      <div class="enquiry-message">${e.message||'—'}</div>
    </div>`;
  }).join('');
}
window.renderEnquiriesSection = renderEnquiriesSection;

window.markEnquiryRead = async function(id) {
  try { await updateDoc(doc(db,'enquiries',id),{read:true}); const e=allEnquiries.find(x=>x.id===id); if(e)e.read=true; await renderEnquiriesSection(); showToast('Marked as read ✓'); }
  catch(err) { showToast('Failed.','error'); }
};
window.deleteEnquiry = async function(id) {
  if (!confirm('Delete this enquiry?')) return;
  try {
    await deleteDoc(doc(db,'enquiries',id)); allEnquiries=allEnquiries.filter(e=>e.id!==id);
    const row=document.getElementById(`enquiry-${id}`); if(row){row.style.opacity='0';row.style.transform='translateX(20px)';setTimeout(()=>row.remove(),320);}
    showToast('Enquiry deleted.');
  } catch(err) { showToast('Failed.','error'); }
};

// ============================================================
// SECTION 16: BULK UPLOAD (exact PSJH logic, RN categories)
// ============================================================
let bulkRows = [];

function renderBulkUpload() {
  const container = document.getElementById('section-bulk-upload'); if (!container) return;
  container.innerHTML = `
    <div class="admin-page-header">
      <div><div class="section-label">Import</div><div class="admin-page-title">BULK UPLOAD</div></div>
      <a href="#" onclick="downloadCSVTemplate();return false" class="btn btn-ghost btn-sm">⬇ Download CSV Template</a>
    </div>

    <div class="bulk-step-card" style="margin-bottom:14px">
      <div class="bulk-step-header"><div class="bulk-step-num">1</div><div><div class="bulk-step-title">Upload images to Cloudinary first</div><div class="bulk-step-sub">Go to cloudinary.com → Media Library → Upload → Copy URL into CSV image1 column</div></div></div>
    </div>

    <div class="bulk-step-card" style="margin-bottom:14px">
      <div class="bulk-step-header"><div class="bulk-step-num">2</div><div style="flex:1"><div class="bulk-step-title">Fill the CSV template</div><div class="bulk-step-sub">Download template above, fill in Excel/Sheets, save as .csv</div></div></div>
      <div style="margin-top:14px;overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:var(--bg-3)">${['name','category','brand','price','originalPrice','stock','badge','featured','sizes','description','image1','image2'].map(h=>`<th style="padding:7px 10px;text-align:left;font-family:var(--font-cond);font-weight:700;letter-spacing:.05em;color:var(--accent);border-bottom:1px solid var(--border)">${h}</th>`).join('')}</tr></thead>
          <tbody><tr style="background:var(--bg-2)">${['Real Madrid Jersey','jerseys','Adidas','699','999','15','HOT','true','S,M,L,XL','Fan version jersey','https://...',''].map(v=>`<td style="padding:7px 10px;color:var(--silver);border-bottom:1px solid var(--border);white-space:nowrap">${v}</td>`).join('')}</tr></tbody>
        </table>
      </div>
      <div style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;font-size:11px">
        ${[['category','jerseys · studs · gear'],['badge','HOT · NEW · SALE · BESTSELLER'],['featured','true or false'],['sizes','comma-separated'],['price/originalPrice','numbers only, no ₹'],['image1-2','full Cloudinary URL']].map(([k,v])=>`<div style="background:var(--bg-3);border-radius:var(--radius);padding:8px 10px;border:1px solid var(--border)"><div style="font-family:var(--font-cond);font-weight:700;color:var(--accent);font-size:10px;margin-bottom:2px">${k}</div><div style="color:var(--silver)">${v}</div></div>`).join('')}
      </div>
    </div>

    <div class="bulk-step-card" style="margin-bottom:14px">
      <div class="bulk-step-header"><div class="bulk-step-num">3</div><div><div class="bulk-step-title">Upload your CSV</div><div class="bulk-step-sub">Select your filled CSV — products will be previewed before import</div></div></div>
      <div style="margin-top:14px">
        <label style="display:flex;align-items:center;justify-content:center;gap:10px;border:2px dashed rgba(0,255,136,.25);border-radius:var(--radius-lg);padding:28px 20px;cursor:pointer;background:rgba(0,255,136,.03);transition:.2s" id="csv-drop-zone" onmouseenter="this.style.borderColor='rgba(0,255,136,.5)'" onmouseleave="this.style.borderColor='rgba(0,255,136,.25)'">
          <input type="file" id="csv-file-input" accept=".csv" style="display:none" onchange="handleCSVUpload(this)"/>
          <div style="text-align:center"><div style="font-size:2.5rem;margin-bottom:8px">📄</div><div style="font-family:var(--font-cond);font-weight:700;font-size:13px">Click to select CSV file</div><div style="font-size:11px;color:var(--silver);margin-top:4px">Only .csv · Max 500 rows</div></div>
        </label>
      </div>
    </div>

    <div id="bulk-preview-section" style="display:none">
      <div class="bulk-step-card">
        <div class="bulk-step-header">
          <div class="bulk-step-num">4</div>
          <div style="flex:1"><div class="bulk-step-title">Preview &amp; Import</div><div class="bulk-step-sub" id="bulk-preview-subtitle">Review products before importing.</div></div>
          <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('csv-file-input').value='';document.getElementById('bulk-preview-section').style.display='none';bulkRows=[]">✕ Clear</button>
            <button class="btn btn-accent btn-sm" id="bulk-import-btn" onclick="runBulkImport()"><span id="bulk-import-label">⬆ Import All</span></button>
          </div>
        </div>
        <div id="bulk-import-progress" style="display:none;margin-top:14px">
          <div style="height:6px;background:var(--bg-3);border-radius:3px;overflow:hidden"><div id="bulk-progress-bar" style="height:100%;background:var(--accent);width:0%;transition:width .3s;border-radius:3px"></div></div>
          <div id="bulk-progress-label" style="font-size:11px;color:var(--silver);margin-top:6px;font-family:var(--font-cond)"></div>
        </div>
        <div id="bulk-import-results" style="display:none;margin-top:12px"></div>
        <div style="margin-top:16px;overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px" id="bulk-preview-table">
            <thead><tr style="background:var(--bg-3)">${['#','Name','Brand·Cat','Price','Stock','Image','Status'].map(h=>`<th style="padding:8px 10px;text-align:left;font-family:var(--font-cond);font-size:10px;font-weight:700;letter-spacing:.06em;color:var(--accent);border-bottom:1px solid var(--border)">${h}</th>`).join('')}</tr></thead>
            <tbody id="bulk-preview-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>`;
}
window.renderBulkUpload = renderBulkUpload;

window.downloadCSVTemplate = function() {
  const headers = ['name','category','brand','price','originalPrice','stock','badge','featured','sizes','description','image1','image2'];
  const rows = [
    ['Real Madrid Home Jersey 24/25','jerseys','Adidas','699','999','15','HOT','true','S,M,L,XL,XXL','Fan version jersey for 2024/25 season.','https://res.cloudinary.com/your-cloud/image/upload/example.jpg',''],
    ['Nike Mercurial Vapor 15','studs','Nike','2499','3499','10','BESTSELLER','false','6,7,8,9,10','Speed boot for fast attackers.','https://res.cloudinary.com/your-cloud/image/upload/example2.jpg',''],
  ];
  const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'rn_sports_bulk_template.csv'; a.click();
};

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/); if (lines.length < 2) return [];
  function parseLine(line) {
    const vals = []; let inQ = false, cur = '';
    for (let i=0; i<line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i+1]==='"') { cur+='"'; i++; } else inQ=!inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur=''; }
      else cur += ch;
    }
    vals.push(cur.trim()); return vals;
  }
  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows = [];
  for (let i=1; i<lines.length; i++) {
    if (!lines[i].trim()) continue; if (rows.length>=500) { showToast('CSV truncated at 500 rows.','error'); break; }
    const vals = parseLine(lines[i]); const obj = {};
    headers.forEach((h,idx) => { obj[h] = (vals[idx]||'').trim(); });
    rows.push(obj);
  }
  return rows;
}

function validateRow(row) {
  const errors = [];
  if (!row.name) errors.push('name missing');
  const cat = (row.category||'').toLowerCase().trim();
  if (!['jerseys','studs','gear'].includes(cat)) errors.push('category must be: jerseys / studs / gear');
  if (!(row.brand||'').trim()) errors.push('brand missing');
  if (!row.price||isNaN(Number(row.price))) errors.push('price invalid');
  const orig = Number(row.originalprice||row.originalPrice||0);
  if (isNaN(orig)||orig<=0) errors.push('originalPrice invalid');
  if (Number(row.price)>orig) errors.push('price > originalPrice');
  if (!row.image1) errors.push('image1 URL missing');
  return errors;
}

window.handleCSVUpload = function(input) {
  const file = input.files[0]; if (!file) return;
  if (!file.name.toLowerCase().endsWith('.csv')) { showToast('Please select a valid .csv file.','error'); input.value=''; return; }
  const reader = new FileReader();
  reader.onerror = () => showToast('Failed to read file.','error');
  reader.onload = e => {
    try {
      const rows = parseCSV(e.target.result); if (!rows.length) { showToast('CSV appears empty.','error'); return; }
      bulkRows = rows; renderBulkPreview(rows);
      ['bulk-import-progress','bulk-import-results'].forEach(id => { const el=document.getElementById(id); if(el)el.style.display='none'; });
      const bar=document.getElementById('bulk-progress-bar'); if(bar)bar.style.width='0%';
      document.getElementById('bulk-preview-section').style.display='block';
      document.getElementById('bulk-preview-section').scrollIntoView({behavior:'smooth',block:'start'});
    } catch(err) { showToast('Error parsing CSV: '+err.message,'error'); }
  };
  reader.readAsText(file);
};

function renderBulkPreview(rows) {
  const tbody    = document.getElementById('bulk-preview-tbody'); if (!tbody) return;
  const subtitle = document.getElementById('bulk-preview-subtitle');
  let validCount = 0, html = '';
  rows.forEach((row,idx) => {
    const errors = validateRow(row); const isValid = errors.length===0; if (isValid) validCount++;
    const imgUrl = row.image1||''; const hasImg = imgUrl.startsWith('http');
    const rowBg = idx%2===0?'var(--bg-2)':'var(--bg-3)';
    html += `<tr id="bulk-row-${idx}" style="background:${rowBg}">
      <td style="padding:8px 10px;font-family:var(--font-cond);font-size:11px;color:var(--silver);border-bottom:1px solid var(--border)">${idx+1}</td>
      <td style="padding:8px 10px;font-weight:600;font-size:12px;border-bottom:1px solid var(--border);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${row.name||'—'}</td>
      <td style="padding:8px 10px;font-size:11px;color:var(--silver);border-bottom:1px solid var(--border)">${row.brand||'—'} · ${row.category||'—'}</td>
      <td style="padding:8px 10px;font-size:12px;color:var(--accent);font-family:var(--font-head);border-bottom:1px solid var(--border)">₹${row.price||'—'}<span style="color:var(--silver);font-size:10px;text-decoration:line-through;margin-left:4px">₹${row.originalprice||row.originalPrice||''}</span></td>
      <td style="padding:8px 10px;font-size:12px;border-bottom:1px solid var(--border)">${row.stock||'10'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border)">${hasImg?`<img src="${imgUrl}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid var(--border)" onerror="this.style.display='none'"/>`:`<span style="font-size:10px;color:var(--silver)">No image</span>`}</td>
      <td style="padding:8px 10px;border-bottom:1px solid var(--border)" id="bulk-row-status-${idx}">${isValid?`<span style="color:var(--green);font-family:var(--font-cond);font-size:10px;font-weight:700">✓ READY</span>`:`<span style="color:var(--red);font-family:var(--font-cond);font-size:10px;font-weight:700" title="${errors.join(', ')}">✕ ${errors[0]}${errors.length>1?` +${errors.length-1}`:''}</span>`}</td>
    </tr>`;
  });
  tbody.innerHTML = html;
  const errorCount = rows.length - validCount;
  if (subtitle) subtitle.innerHTML = `<span style="color:var(--green)">✓ ${validCount} ready</span>${errorCount>0?` · <span style="color:var(--red)">✕ ${errorCount} with errors (will be skipped)</span>`:''} · ${rows.length} total rows`;
  const btn=document.getElementById('bulk-import-btn'); const lbl=document.getElementById('bulk-import-label');
  if(btn)btn.disabled=false; if(lbl)lbl.textContent='⬆ Import All';
}

window.runBulkImport = async function() {
  const validRows = bulkRows.filter(r => validateRow(r).length===0); if (!validRows.length) { showToast('No valid rows to import.','error'); return; }
  const btn=document.getElementById('bulk-import-btn'); const lbl=document.getElementById('bulk-import-label');
  const progressWrap=document.getElementById('bulk-import-progress'); const bar=document.getElementById('bulk-progress-bar');
  const progressLabel=document.getElementById('bulk-progress-label'); const resultsEl=document.getElementById('bulk-import-results');
  if(btn)btn.disabled=true; if(lbl)lbl.textContent='⏳ Importing…';
  if(progressWrap)progressWrap.style.display='block'; if(bar)bar.style.width='0%'; if(resultsEl)resultsEl.style.display='none';
  let imported=0, failed=0; const failedNames=[];
  try {
    for (let i=0; i<validRows.length; i++) {
      const row = validRows[i]; const pct = Math.round((i/validRows.length)*100);
      if(bar)bar.style.width=pct+'%'; if(progressLabel)progressLabel.textContent=`Importing ${i+1} of ${validRows.length}: "${row.name}"`;
      try {
        const images = [row.image1,row.image2].filter(u=>u&&u.startsWith('http'));
        const sizes  = (row.sizes||'').split(',').map(s=>s.trim()).filter(Boolean);
        const orig   = Number(row.originalprice||row.originalPrice||0);
        await addDoc(collection(db,'products'), {
          name: row.name, category:(row.category||'').toLowerCase().trim(),
          brand: (row.brand||'').trim(), price:Number(row.price), originalPrice:orig,
          stock:Number(row.stock)||10, badge:row.badge||null,
          featured:(row.featured||'').toLowerCase()==='true',
          sizes:sizes.length?sizes:['S','M','L','XL'],
          description:row.description||'Premium sports product.',
          images:images.length?images:['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'],
          features:[],specs:{},rating:4.5,reviews:0,
          createdAt:serverTimestamp(),updatedAt:serverTimestamp()
        });
        imported++;
        const originalIdx = bulkRows.findIndex(r=>r===row);
        const statusCell  = document.getElementById(`bulk-row-status-${originalIdx}`);
        if(statusCell)statusCell.innerHTML=`<span style="color:var(--green);font-family:var(--font-cond);font-size:10px;font-weight:700">✓ IMPORTED</span>`;
      } catch(rowErr) {
        failed++; failedNames.push(row.name); console.error('[Bulk] Failed row:', row.name, rowErr.message);
        const originalIdx = bulkRows.findIndex(r=>r===row);
        const statusCell  = document.getElementById(`bulk-row-status-${originalIdx}`);
        if(statusCell)statusCell.innerHTML=`<span style="color:var(--red);font-family:var(--font-cond);font-size:10px;font-weight:700">✕ FAILED</span>`;
      }
    }
  } finally {
    if(bar)bar.style.width='100%'; if(progressLabel)progressLabel.textContent=imported>0?'Complete!':'No products imported.';
    if(btn)btn.disabled=false; if(lbl)lbl.textContent='⬆ Import All';
    setTimeout(()=>{ if(progressWrap)progressWrap.style.display='none'; if(bar)bar.style.width='0%'; },1500);
  }
  await loadProducts();
  if(resultsEl) {
    resultsEl.style.display='block';
    resultsEl.innerHTML=`<div style="background:${failed===0?'rgba(34,197,94,.08)':'rgba(255,68,68,.08)'};border:1px solid ${failed===0?'rgba(34,197,94,.25)':'rgba(255,68,68,.25)'};border-radius:var(--radius);padding:14px 16px">
      <div style="font-family:var(--font-cond);font-weight:700;font-size:14px;color:${failed===0?'var(--green)':'var(--orange)'}">
        ${failed===0?'✓ All products imported successfully!':` ⚠ ${imported} imported, ${failed} failed`}
      </div>
      ${failed>0?`<div style="font-size:11px;color:var(--silver);margin-top:6px">Failed: ${failedNames.join(', ')}</div>`:''}
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="showSection('products',document.querySelector('.admin-nav-item[onclick*=products]'))">View Products →</button>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('csv-file-input').value='';document.getElementById('bulk-preview-section').style.display='none';bulkRows=[];renderBulkUpload()">Upload Another CSV</button>
      </div>
    </div>`;
  }
  showToast(`${imported} product${imported!==1?'s':''} imported ✓`);
};

// ============================================================
// SECTION 17: INIT
// ============================================================
function initModalBackdrop() {
  document.getElementById('order-modal')?.addEventListener('click', function(e) { if(e.target===this) closeModal('order-modal'); });
}

async function initAdminApp() {
  console.log('[Admin] Initialising RN Sports Hub admin…');
  await Promise.all([loadProducts(), loadOrders(), loadCoupons(), loadEnquiries()]);
  renderDashboard();
  initModalBackdrop();
  initMobileSidebar();
  console.log('[Admin] Ready ✓');
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginKeys();
  if (checkLogin()) { showAdminApp(); initAdminApp(); }
  else showLoginScreen();
});
