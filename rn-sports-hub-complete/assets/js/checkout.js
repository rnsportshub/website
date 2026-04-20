// ── RN Sports Hub — Checkout v2
// Flow: Address Form → Payment Screen (UPI deep link + QR + screenshot) → Success Screen
// Saves order to Firebase + Cloudinary screenshot upload

// ── CONFIG ────────────────────────────────────────────────────────────────────
const UPI_ID    = 'Q222702378@ybl';
const WA_NUMBER = '917439001021';
const STORE_NAME = 'RN Sports Hub';

// ── STATE ─────────────────────────────────────────────────────────────────────
let selectedPaymentMethod = 'upi';
let _pendingOrderData     = null;
let _pendingOrderMeta     = null;
let _appliedCoupon        = null;

function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

// ── ORDER ID ─────────────────────────────────────────────────────────────────
function generateOrderId() {
  return 'RN-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
}

// ── UPI DEEP LINK ─────────────────────────────────────────────────────────────
// iOS fix: <a href="upi://..."> is the ONLY reliable method on iOS.
// href must be set BEFORE the screen is shown, not inside a click handler.
function generateUpiLink(amount, orderId) {
  const pa = UPI_ID;                             // raw VPA — never encode @
  const pn = encodeURIComponent(STORE_NAME);
  const am = Number(amount).toFixed(2);
  const tn = encodeURIComponent('Order ' + orderId);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
}

// ── UPI BUTTON CLICK HANDLER ─────────────────────────────────────────────────
window.handleUpiClick = function(e) {
  const btn = document.getElementById('upi-pay-btn');
  const href = btn?.getAttribute('href') || '#';

  if (!href.startsWith('upi://')) {
    e.preventDefault();
    showToast('Please fill your details and place the order first.', 'error');
    return;
  }
  // Let <a href="upi://..."> open natively — no preventDefault

  let wasHidden = false, appOpened = false;

  const onVisibility = () => {
    if (document.hidden) {
      wasHidden = true;
    } else if (wasHidden) {
      wasHidden = false; appOpened = true;
      clearTimeout(noAppTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      showSwitchBackNudge();
      if (btn) {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg> Payment Done? Upload Screenshot ↓`;
        btn.style.background = 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)';
        btn.style.fontSize   = '14px';
      }
    }
  };

  const noAppTimer = setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    if (!appOpened && !document.hidden) {
      showUpiNotFound();
      if (btn) {
        btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> Pay Now via UPI <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
        btn.style.background = '';
        btn.style.fontSize   = '';
      }
    } else if (!appOpened && document.hidden) {
      document.addEventListener('visibilitychange', onVisibility);
    }
  }, 4000);

  document.addEventListener('visibilitychange', onVisibility);

  if (btn) btn.innerHTML = `<span style="display:inline-block;width:16px;height:16px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:co-spin 0.7s linear infinite;vertical-align:middle;margin-right:8px;"></span> Opening UPI App…`;
};

function showUpiNotFound() {
  const el = document.getElementById('upi-fallback-msg');
  if (el) { el.style.display = 'block'; el.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
}

function showSwitchBackNudge() {
  const fallback = document.getElementById('upi-fallback-msg');
  if (fallback) fallback.style.display = 'none';
  const nudge = document.getElementById('upi-switchback-nudge');
  if (nudge) { nudge.style.display = 'flex'; nudge.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
  setTimeout(() => {
    document.getElementById('screenshot-file-input')?.scrollIntoView({ behavior:'smooth', block:'center' });
  }, 900);
}

// ── COPY UPI ─────────────────────────────────────────────────────────────────
window.copyUPI = function() {
  navigator.clipboard.writeText(UPI_ID).then(() => {
    const btn = document.getElementById('copy-upi-btn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
    showToast('UPI ID copied! ✓');
  }).catch(() => showToast('UPI ID: ' + UPI_ID));
};

// ── ORDER SUMMARY ─────────────────────────────────────────────────────────────
function renderSummary() {
  const cart     = window.getCart ? getCart() : JSON.parse(localStorage.getItem('rn_cart_v2') || '[]');
  const listEl   = document.getElementById('summary-items-list');
  const countEl  = document.getElementById('summary-item-count');
  const subEl    = document.getElementById('summary-subtotal');
  const shipEl   = document.getElementById('summary-shipping');
  const totalEl  = document.getElementById('summary-grand');
  const discRow  = document.getElementById('co-discount-row');
  const discVal  = document.getElementById('co-discount');
  if (!listEl) return;

  if (!cart.length) {
    document.getElementById('checkout-form-area').style.display  = 'none';
    document.getElementById('checkout-empty-state').style.display = 'flex';
    listEl.innerHTML = '<p class="summary-empty">Your cart is empty.</p>';
    return;
  }

  listEl.innerHTML = cart.map(item => {
    const p = getProductById(item.id);
    if (!p) return '';
    const img = (p.images && p.images.length) ? p.images[0] : (p.image || '');
    return `<div class="summary-item">
      <img class="summary-item-img" src="${img}" alt="${p.name}" onerror="this.src='https://placehold.co/52x52/111/00ff88?text=RN'"/>
      <div class="summary-item-details">
        <div class="summary-item-name">${p.name}</div>
        <div class="summary-item-meta">${item.size ? 'Size: '+item.size+' · ' : ''}Qty: ${item.quantity}</div>
      </div>
      <div class="summary-item-price">${fmt(p.price * item.quantity)}</div>
    </div>`;
  }).join('');

  const subtotal = cart.reduce((s, item) => {
    const p = getProductById(item.id);
    return s + (p ? p.price * item.quantity : 0);
  }, 0);
  const discount = calcDiscount(subtotal);
  const total    = subtotal - discount;  // No shipping (included in price)

  if (countEl) countEl.textContent = `${cart.length} item${cart.length !== 1 ? 's' : ''}`;
  if (subEl)   subEl.textContent   = fmt(subtotal);
  if (shipEl)  shipEl.textContent  = 'Included';
  if (totalEl) totalEl.textContent = fmt(total);

  if (discRow && discVal) {
    if (discount > 0) { discRow.style.display = 'flex'; discVal.textContent = '-' + fmt(discount); }
    else                discRow.style.display = 'none';
  }

  return { subtotal, discount, total, cart };
}

// ── COUPON ────────────────────────────────────────────────────────────────────
function calcDiscount(subtotal) {
  if (!_appliedCoupon) return 0;
  return _appliedCoupon.discountType === 'percent'
    ? Math.round(subtotal * _appliedCoupon.value / 100)
    : Math.min(_appliedCoupon.value, subtotal);
}

window.applyCoupon = async function() {
  const input    = document.getElementById('coupon-input');
  const statusEl = document.getElementById('coupon-status');
  const applyBtn = document.getElementById('coupon-apply-btn');
  const code     = input?.value.trim().toUpperCase();
  if (!code) { showToast('Enter a coupon code.', 'error'); return; }
  applyBtn.disabled = true; applyBtn.textContent = 'Checking…';
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'coupon-status'; }
  try {
    const { db }  = await import('./firebase.js');
    const { getDocs, collection, query, where } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap    = await getDocs(query(collection(db, 'coupons'), where('code', '==', code), where('active', '==', true)));
    if (snap.empty) {
      if (statusEl) { statusEl.textContent = '✗ Invalid or expired coupon.'; statusEl.className = 'coupon-status coupon-error'; }
      applyBtn.disabled = false; applyBtn.textContent = 'Apply'; return;
    }
    _appliedCoupon = { id: snap.docs[0].id, ...snap.docs[0].data() };
    const label = _appliedCoupon.discountType === 'percent' ? `${_appliedCoupon.value}% off` : `₹${_appliedCoupon.value} off`;
    if (statusEl) { statusEl.textContent = `✓ Coupon applied! ${label}`; statusEl.className = 'coupon-status coupon-success'; }
    applyBtn.textContent = 'Remove'; applyBtn.disabled = false;
    applyBtn.onclick = removeCoupon;
    if (input) input.disabled = true;
    renderSummary(); showToast('Coupon applied! ✓');
  } catch (err) {
    console.error('[Coupon]', err);
    if (statusEl) { statusEl.textContent = '✗ Could not verify coupon.'; statusEl.className = 'coupon-status coupon-error'; }
    applyBtn.disabled = false; applyBtn.textContent = 'Apply';
  }
};

function removeCoupon() {
  _appliedCoupon = null;
  const input = document.getElementById('coupon-input');
  const statusEl = document.getElementById('coupon-status');
  const btn = document.getElementById('coupon-apply-btn');
  if (input)    { input.value = ''; input.disabled = false; }
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'coupon-status'; }
  if (btn)      { btn.textContent = 'Apply'; btn.onclick = window.applyCoupon; }
  renderSummary(); showToast('Coupon removed.');
}

// ── PAYMENT METHOD ────────────────────────────────────────────────────────────
window.selectPayment = function(method) {
  selectedPaymentMethod = method;
  document.querySelectorAll('.payment-method-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.method === method));
  document.querySelectorAll('.payment-detail-box').forEach(b =>
    b.classList.toggle('active', b.dataset.method === method));
};

// ── STEP 1 → 2: Validate address, show payment screen ────────────────────────
window.placeOrder = function(e) {
  if (e) e.preventDefault();

  const name    = document.getElementById('field-name')?.value.trim();
  const phone   = document.getElementById('field-phone')?.value.trim();
  const address = document.getElementById('field-address')?.value.trim();
  const city    = document.getElementById('field-city')?.value.trim();
  const state   = document.getElementById('field-state')?.value.trim();
  const pincode = document.getElementById('field-pincode')?.value.trim();
  const notes   = document.getElementById('field-notes')?.value.trim() || '';

  if (!name)                              { showToast('Please enter your full name.', 'error'); return; }
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) { showToast('Enter a valid 10-digit mobile number.', 'error'); return; }
  if (!address)                           { showToast('Please enter your address.', 'error'); return; }
  if (!city)                              { showToast('Please enter your city.', 'error'); return; }
  if (!state)                             { showToast('Please select your state.', 'error'); return; }
  if (!pincode || !/^\d{6}$/.test(pincode)) { showToast('Enter a valid 6-digit pincode.', 'error'); return; }

  const cart = window.getCart ? getCart() : [];
  if (!cart.length) { showToast('Your cart is empty!', 'error'); return; }

  const totals  = renderSummary();
  if (!totals)  return;

  const orderId = generateOrderId();

  _pendingOrderData = {
    orderId,
    name, phone,
    address: `${address}, ${city}, ${state} - ${pincode}`,
    notes,
    items: cart.map(item => {
      const p = getProductById(item.id);
      return { name: p?.name || '', size: item.size || '', qty: item.quantity, price: p?.price || 0 };
    }),
    coupon:   _appliedCoupon ? _appliedCoupon.code : null,
    discount: totals.discount,
    amount:   totals.total,
    payment:  selectedPaymentMethod,
    screenshot: null,
    status:   selectedPaymentMethod === 'cod' ? 'COD' : 'Paid',
  };
  _pendingOrderMeta = { orderId, name, total: totals.total };

  showPaymentScreen({ orderId, name, total: totals.total });
};

function showPaymentScreen({ orderId, name, total }) {
  const safeSet = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  safeSet('s-order-id',  orderId);
  safeSet('s-name',      name);
  safeSet('s-amount',    fmt(total));
  safeSet('pi-amount',   fmt(total));

  // Set UPI link href BEFORE showing screen (iOS fix)
  const upiBtn = document.getElementById('upi-pay-btn');
  if (upiBtn) upiBtn.href = generateUpiLink(total, orderId);

  // Hide fallback/nudge
  const fb = document.getElementById('upi-fallback-msg');
  if (fb) fb.style.display = 'none';
  const nudge = document.getElementById('upi-switchback-nudge');
  if (nudge) nudge.style.display = 'none';

  // Coupon row
  const couponRow = document.getElementById('s-coupon-row');
  const couponVal = document.getElementById('s-coupon');
  if (couponRow && couponVal) {
    if (_appliedCoupon) {
      const lbl = _appliedCoupon.discountType === 'percent'
        ? `${_appliedCoupon.code} (${_appliedCoupon.value}% off)`
        : `${_appliedCoupon.code} (-${fmt(_appliedCoupon.value)})`;
      couponVal.textContent = lbl; couponRow.style.display = 'flex';
    } else {
      couponRow.style.display = 'none';
    }
  }

  // Step indicators
  document.querySelectorAll('.csi-step').forEach(s => s.classList.remove('active'));
  document.getElementById('csi-1')?.classList.add('done');
  document.getElementById('csi-2')?.classList.add('active');

  // Switch screens
  updatePaymentScreenMode();
  document.getElementById('checkout-body-content').style.display = 'none';
  document.getElementById('payment-screen')?.classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  localStorage.setItem('rn_last_order', orderId);
}

// ── STEP 3: Upload screenshot → save order to Firebase ───────────────────────
window.uploadAndConfirmOrder = async function() {
  const fileInput = document.getElementById('screenshot-file-input');
  const statusEl  = document.getElementById('screenshot-status');
  const btn       = document.getElementById('screenshot-upload-btn');

  if (!_pendingOrderData) { showToast('Order data lost. Please refresh.', 'error'); return; }

  // For COD orders, skip screenshot
  if (_pendingOrderData.payment === 'cod') {
    await saveOrderToFirebase(null);
    return;
  }

  if (!fileInput?.files?.length) { showToast('Please select your payment screenshot first.', 'error'); return; }

  btn.disabled = true; btn.textContent = '⏳ Uploading…';
  if (statusEl) { statusEl.textContent = 'Uploading screenshot…'; statusEl.style.color = 'var(--text-muted)'; }

  try {
    const { uploadScreenshot } = await import('./cloudinary.js');
    const screenshotUrl = await uploadScreenshot(fileInput.files[0]);
    if (statusEl) statusEl.textContent = '✓ Screenshot uploaded. Saving order…';
    await saveOrderToFirebase(screenshotUrl);
  } catch (err) {
    console.error('[Checkout] Upload error:', err);
    if (statusEl) { statusEl.textContent = 'Upload failed. Try again or WhatsApp us.'; statusEl.style.color = '#ff4444'; }
    btn.disabled = false; btn.textContent = '☁️ Try Again';
  }
};

async function saveOrderToFirebase(screenshotUrl) {
  const btn      = document.getElementById('screenshot-upload-btn');
  const statusEl = document.getElementById('screenshot-status');
  try {
    const { db }         = await import('./firebase.js');
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const orderData = { ..._pendingOrderData, screenshot: screenshotUrl, createdAt: serverTimestamp() };
    const ref = await addDoc(collection(db, 'orders'), orderData);
    console.log('[Checkout] Order saved:', ref.id);
  } catch (err) {
    console.warn('[Checkout] Firebase save failed, saving to localStorage:', err.message);
    // Fallback: localStorage
    const orders = JSON.parse(localStorage.getItem('rn_orders') || '[]');
    orders.unshift({ ..._pendingOrderData, screenshot: screenshotUrl, date: new Date().toISOString() });
    localStorage.setItem('rn_orders', JSON.stringify(orders));
  }

  // Clear cart
  if (window.clearCart) clearCart();

  // Show success screen
  showSuccessScreen(_pendingOrderMeta);
  showToast('Order Placed Successfully! ✓');
}

function showSuccessScreen({ orderId, name, total }) {
  const safeSet = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  safeSet('success-order-id', orderId);
  safeSet('success-name',     name);
  safeSet('success-amount',   fmt(total));

  // Build WhatsApp notify message
  const d = _pendingOrderData;
  const itemLines = (d?.items || []).map(i =>
    `• ${i.name}${i.size ? ' ('+i.size+')' : ''} × ${i.qty} = ₹${(i.price * i.qty).toLocaleString('en-IN')}`
  ).join('\n');
  const waMsg = encodeURIComponent(
    `🛒 *NEW ORDER — RN Sports Hub*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Name:* ${d?.name}\n` +
    `📱 *Phone:* ${d?.phone}\n` +
    `📍 *Address:* ${d?.address}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🛒 *Items:*\n${itemLines}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total:* ₹${d?.amount?.toLocaleString('en-IN')}\n` +
    `💳 *Payment:* ${d?.payment?.toUpperCase()}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ Screenshot uploaded. Please confirm & process.`
  );
  const waBtn = document.getElementById('wa-notify-btn');
  if (waBtn) waBtn.href = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;

  // Step indicators — all done
  document.querySelectorAll('.csi-step').forEach(s => { s.classList.remove('active'); s.classList.add('done'); });

  document.getElementById('payment-screen')?.classList.remove('visible');
  document.getElementById('success-screen')?.classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── COD Place Order (direct to success, no screenshot) ───────────────────────
window.placeCodOrder = async function() {
  await saveOrderToFirebase(null);
};

// ── Screenshot file preview ───────────────────────────────────────────────────
function handleScreenshotChange(input) {
  const file = input.files[0];
  if (!file) return;
  const prevWrap = document.getElementById('screenshot-preview-wrap');
  const prevImg  = document.getElementById('screenshot-preview-img');
  if (prevWrap && prevImg) {
    prevImg.src = URL.createObjectURL(file);
    prevWrap.style.display = 'block';
  }
  const btn = document.getElementById('screenshot-upload-btn');
  if (btn) btn.textContent = '✅ Upload & Confirm Order';
}

// ── Drag & drop (address form screenshot) ────────────────────────────────────
function initDragDrop() {
  const area = document.getElementById('upload-area');
  if (!area) return;
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length) {
      const input = document.getElementById('payment-screenshot');
      if (input) {
        const dt = new DataTransfer(); dt.items.add(files[0]); input.files = dt.files;
        handleFileUploadOld(input);
      }
    }
  });
}

// Legacy file handler for form-step screenshot
window.handleFileUpload = function(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please upload an image file.', 'error'); return; }
  if (file.size > 5 * 1024 * 1024)    { showToast('File too large. Max 5MB.', 'error'); return; }
  const preview = document.getElementById('upload-preview');
  const thumb   = document.getElementById('upload-thumb');
  const name    = document.getElementById('upload-name');
  if (preview && thumb && name) {
    thumb.src = URL.createObjectURL(file); name.textContent = file.name; preview.classList.add('show');
  }
  const uploadContent = document.getElementById('upload-content');
  if (uploadContent) uploadContent.style.display = 'none';
};
function handleFileUploadOld(input) { window.handleFileUpload(input); }

window.removeUpload = function() {
  const preview = document.getElementById('upload-preview');
  const content = document.getElementById('upload-content');
  const input   = document.getElementById('payment-screenshot');
  if (preview) preview.classList.remove('show');
  if (content) content.style.display = 'block';
  if (input)   input.value = '';
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.style.cssText = `background:${type==='error'?'#2a1a1a':'#0a1a10'};border:1px solid ${type==='error'?'rgba(255,68,68,0.4)':'rgba(0,255,136,0.3)'};border-left:3px solid ${type==='error'?'#ff4444':'var(--accent)'};color:${type==='error'?'#ff8888':'#fff'};padding:12px 18px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.5);opacity:0;transform:translateY(8px);transition:.3s;`;
  t.textContent = msg; c.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 400); }, 3200);
}
window.showToast = showToast;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderSummary();
  selectPayment('upi');
  initDragDrop();

  // Wire screenshot input on payment screen
  document.getElementById('screenshot-file-input')?.addEventListener('change', function() {
    handleScreenshotChange(this);
  });

  // Reset border on focus
  document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
    el.addEventListener('focus', () => el.style.borderColor = '');
  });
});

// Spinner keyframe
const _s = document.createElement('style');
_s.textContent = '@keyframes co-spin{to{transform:rotate(360deg)}}';
document.head.appendChild(_s);

// ── Show/hide COD confirm vs screenshot upload based on payment method ────────
function updatePaymentScreenMode() {
  const method    = _pendingOrderData?.payment || selectedPaymentMethod;
  const ssBox     = document.querySelector('.co-screenshot-box');
  const codBox    = document.getElementById('cod-confirm-box');
  const upiOption = document.querySelector('.co-upi-recommended');
  const divider   = document.querySelector('.co-divider');
  const upiOpt2   = document.querySelectorAll('.co-upi-option')[1];
  const piSection = document.querySelector('.co-pay-instructions');
  if (method === 'cod') {
    if (ssBox)     ssBox.style.display     = 'none';
    if (codBox)    codBox.style.display    = 'block';
    if (upiOption) upiOption.style.display = 'none';
    if (divider)   divider.style.display   = 'none';
    if (upiOpt2)   upiOpt2.style.display   = 'none';
    if (piSection) piSection.style.display = 'none';
  } else {
    if (ssBox)     ssBox.style.display     = 'block';
    if (codBox)    codBox.style.display    = 'none';
    if (upiOption) upiOption.style.display = 'block';
    if (divider)   divider.style.display   = 'flex';
    if (upiOpt2)   upiOpt2.style.display   = 'block';
    if (piSection) piSection.style.display = 'block';
  }
}
