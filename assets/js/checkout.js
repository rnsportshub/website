function getCartWithDetails() {
  const CART_KEY_LOCAL = 'rn_sports_hub_cart';
  const raw = localStorage.getItem(CART_KEY_LOCAL);
  const cart = raw ? JSON.parse(raw) : [];
  return cart.map(item => {
    const source = window.PRODUCTS || [];
    const p = source.find(pr => String(pr.id) === String(item.id));
    if (p) {
      return { ...item, name: p.name||item.name||'Product', price: Number(p.price)||Number(item.price)||0, image: (p.images&&p.images[0])||p.image||item.image||'' };
    }
    return { ...item, name: item.name||'Product', price: Number(item.price)||0, image: item.image||'' };
  });
}

// ── RN Sports Hub — Checkout (PSJH-replica 3-screen flow)
// Screen 1: Address + payment method selection
// Screen 2: Pay (4 UPI app buttons + QR + copy UPI) → WA notify → upload screenshot
// Screen 3: Success + WA notify again

const UPI_ID     = 'Q222702378@ybl';
const WA_NUMBER  = '917439001021';
const STORE_NAME = 'RN Sports Hub';

let selectedPaymentMethod = 'upi';
let _pendingOrderData     = null;
let _pendingOrderMeta     = null;
let _appliedCoupon        = null;

function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

function generateOrderId() {
  return 'RN-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random()*9000);
}

// ── UPI deep link (iOS-safe: href set before screen shown) ──────────────────
function generateUpiLink(amount, orderId, appScheme) {
  const am = Number(amount).toFixed(2);
  const pn = encodeURIComponent(STORE_NAME);
  const tn = encodeURIComponent('Order ' + orderId);
  const pa = UPI_ID; // never encode @
  // App-specific schemes
  const schemes = {
    gpay:    `tez://upi/pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`,
    phonepe: `phonepe://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`,
    paytm:   `paytmmp://upi/pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`,
    any:     `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`,
  };
  return schemes[appScheme] || schemes.any;
}

// ── Set all 4 UPI button hrefs before screen is shown ───────────────────────
function setUpiButtonHrefs(amount, orderId) {
  const btns = { gpay:'gpay-btn', phonepe:'phonepe-btn', paytm:'paytm-btn', any:'upi-pay-btn' };
  Object.entries(btns).forEach(([app, id]) => {
    const el = document.getElementById(id);
    if (el) el.href = generateUpiLink(amount, orderId, app);
  });
}

// ── Generic UPI app click handler (handles visibility detection) ─────────────
function handleUpiAppOpen(e, btnEl) {
  const href = btnEl?.getAttribute('href') || '#';
  if (!href || href === '#' || !href.includes('upi/pay') && !href.includes('upi://')) {
    e.preventDefault();
    showToast('Please fill your details and place the order first.', 'error');
    return;
  }
  // Let the <a href> open natively — iOS opens registered UPI handler
  let wasHidden = false, appOpened = false;

  const onVisibility = () => {
    if (document.hidden) {
      wasHidden = true;
    } else if (wasHidden) {
      wasHidden = false; appOpened = true;
      clearTimeout(noAppTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      showSwitchBackNudge();
    }
  };

  const noAppTimer = setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    if (!appOpened && !document.hidden) showUpiNotFound();
    else if (!appOpened && document.hidden) document.addEventListener('visibilitychange', onVisibility);
  }, 4000);

  document.addEventListener('visibilitychange', onVisibility);
}

// Exposed to onclick attrs in HTML
window.handleUpiAppClick = function(e, app) {
  const ids = { gpay:'gpay-btn', phonepe:'phonepe-btn', paytm:'paytm-btn' };
  const btn = document.getElementById(ids[app]);
  handleUpiAppOpen(e, btn);
};
window.handleUpiClick = function(e) {
  const btn = document.getElementById('upi-pay-btn');
  handleUpiAppOpen(e, btn);
};

function showUpiNotFound() {
  const el = document.getElementById('upi-fallback-msg');
  if (el) { el.style.display = 'block'; el.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
}

function showSwitchBackNudge() {
  const fb = document.getElementById('upi-fallback-msg');
  if (fb) fb.style.display = 'none';
  const nudge = document.getElementById('upi-switchback-nudge');
  if (nudge) { nudge.style.display = 'flex'; nudge.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
  setTimeout(() => {
    document.getElementById('screenshot-file-input')?.scrollIntoView({ behavior:'smooth', block:'center' });
  }, 900);
}

window.copyUPI = function() {
  navigator.clipboard.writeText(UPI_ID)
    .then(() => {
      const btn = document.getElementById('copy-upi-btn');
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      }
      showToast('UPI ID copied!');
    })
    .catch(() => showToast('UPI ID: ' + UPI_ID));
};

// ── Order summary (uses cart.js getCart — key: rn_sports_hub_cart) ───────────
function renderSummary() {
  const cart    = (typeof getCart === 'function') ? getCart() : [];
  const listEl  = document.getElementById('summary-items-list');
  const countEl = document.getElementById('summary-item-count');
  const subEl   = document.getElementById('summary-subtotal');
  const shipEl  = document.getElementById('summary-shipping');
  const totalEl = document.getElementById('summary-grand');
  const discRow = document.getElementById('co-discount-row');
  const discVal = document.getElementById('co-discount');
  if (!listEl) return;

  if (!cart.length) {
    const formArea   = document.getElementById('checkout-form-area');
    const emptyState = document.getElementById('checkout-empty-state');
    if (formArea)   formArea.style.display   = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    listEl.innerHTML = '<p class="summary-empty">Your cart is empty.</p>';
    return;
  }

  listEl.innerHTML = cart.map(item => {
    // Use fresh product for image, fall back to what cart stored
    const p     = (typeof getProductById === 'function') ? getProductById(item.id) : null;
    const img   = p ? ((p.images && p.images.length) ? p.images[0] : (p.image||'')) : (item.image||'');
    const name  = p ? p.name  : (item.name  || 'Product');
    const price = p ? p.price : (item.price || 0);
    return `<div class="summary-item">
      <img class="summary-item-img" src="${img}" alt="${name}"
        onerror="this.src='https://placehold.co/52x52/111/00ff88?text=RN'"/>
      <div class="summary-item-details">
        <div class="summary-item-name">${name}</div>
        <div class="summary-item-meta">${item.size ? 'Size: '+item.size+' &nbsp;·&nbsp; ' : ''}Qty: ${item.quantity}</div>
      </div>
      <div class="summary-item-price">${fmt(price * item.quantity)}</div>
    </div>`;
  }).join('');

  const subtotal = cart.reduce((s, item) => {
    const p = (typeof getProductById === 'function') ? getProductById(item.id) : null;
    return s + ((p ? p.price : item.price || 0) * item.quantity);
  }, 0);
  const discount = calcDiscount(subtotal);
  const total    = subtotal - discount + SHIPPING_FEE;

  if (countEl) countEl.textContent = `${cart.length} item${cart.length !== 1 ? 's' : ''}`;
  if (subEl)   subEl.textContent   = fmt(subtotal);
  if (shipEl)  shipEl.textContent  = fmt(SHIPPING_FEE);
  if (totalEl) totalEl.textContent = fmt(total);
  if (discRow && discVal) {
    discRow.style.display = discount > 0 ? 'flex' : 'none';
    if (discount > 0) discVal.textContent = '-' + fmt(discount);
  }
  return { subtotal, discount, total, cart };
}

// ── Summary variant: COD selected — grand total shows ADVANCE only ───────────
// The customer pays the advance now; remainder on delivery.
function renderSummaryWithCod(advance) {
  const result = renderSummary();                  // renders subtotal / discount normally
  if (!result) return;
  const totalEl  = document.getElementById('summary-grand');
  const grandLbl = document.getElementById('summary-grand-label'); // optional label el
  if (totalEl) totalEl.textContent = fmt(advance);
  if (grandLbl) grandLbl.textContent = 'Advance to Pay Now';
}

// ── Coupon ───────────────────────────────────────────────────────────────────
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
    const { db } = await import('./firebase.js');
    const { getDocs, collection, query, where } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDocs(query(collection(db,'coupons'), where('code','==',code), where('active','==',true)));
    if (snap.empty) {
      if (statusEl) { statusEl.textContent = '✗ Invalid or expired coupon.'; statusEl.className = 'coupon-status coupon-error'; }
      applyBtn.disabled = false; applyBtn.textContent = 'Apply'; return;
    }
    _appliedCoupon = { id: snap.docs[0].id, ...snap.docs[0].data() };
    const label = _appliedCoupon.discountType === 'percent' ? `${_appliedCoupon.value}% off` : `₹${_appliedCoupon.value} off`;
    if (statusEl) { statusEl.textContent = `✓ ${label} applied!`; statusEl.className = 'coupon-status coupon-success'; }
    applyBtn.textContent = 'Remove'; applyBtn.disabled = false;
    applyBtn.onclick = removeCoupon;
    if (input) input.disabled = true;
    renderSummary(); showToast('Coupon applied! ✓');
  } catch (err) {
    if (statusEl) { statusEl.textContent = '✗ Could not verify coupon.'; statusEl.className = 'coupon-status coupon-error'; }
    applyBtn.disabled = false; applyBtn.textContent = 'Apply';
  }
};

function removeCoupon() {
  _appliedCoupon = null;
  const input    = document.getElementById('coupon-input');
  const statusEl = document.getElementById('coupon-status');
  const btn      = document.getElementById('coupon-apply-btn');
  if (input)    { input.value = ''; input.disabled = false; }
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'coupon-status'; }
  if (btn)      { btn.textContent = 'Apply'; btn.onclick = window.applyCoupon; }
  renderSummary(); showToast('Coupon removed.');
}

// ── Payment method selector (screen 1) ──────────────────────────────────────
window.selectPayment = function(method) {
  selectedPaymentMethod = method;
  document.querySelectorAll('.payment-method-card').forEach(c =>
    c.classList.toggle('selected', c.dataset.method === method));

  // Show COD advance fee row in order summary
  const codFeeRow   = document.getElementById('cod-fee-row');
  const codFeeAmt   = document.getElementById('cod-fee-val');
  const isCod       = method === 'cod';

  if (codFeeRow) codFeeRow.style.display = isCod ? 'flex' : 'none';

  if (isCod) {
    const advance = calcCodAdvance();
    // Update the fee label in the row
    if (codFeeAmt) codFeeAmt.textContent = fmt(advance);
    // Refresh full summary so grand total reflects advance
    renderSummaryWithCod(advance);
  } else {
    // Back to UPI — restore normal total
    renderSummary();
  }
};

// ── Step indicator helper ────────────────────────────────────────────────────
function setStep(active) {
  // active = 1, 2, or 3
  [1,2,3].forEach(n => {
    const el = document.getElementById('csi-' + n);
    if (!el) return;
    el.classList.remove('active','done');
    if (n < active)  el.classList.add('done');
    if (n === active) el.classList.add('active');
    // also update line
    const line = document.getElementById('csi-line-' + n);
    if (line) line.classList.toggle('done', n < active);
  });
}

// ── Screen switcher ──────────────────────────────────────────────────────────
function showScreen(name) {
  ['screen-address','screen-payment','screen-success'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById('screen-' + name);
  if (target) { target.style.display = 'block'; }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SCREEN 1 → 2: validate + build pending order ────────────────────────────
window.placeOrder = function() {
  const get = id => document.getElementById(id)?.value.trim() || '';
  const name    = get('field-name');
  const phone   = get('field-phone');
  const address = get('field-address');
  const city    = get('field-city');
  const pincode = get('field-pincode');
  const state   = get('field-state');
  const notes   = get('field-notes');

  if (!name)                               { showToast('Please enter your full name.', 'error'); return; }
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) { showToast('Enter a valid 10-digit mobile number.', 'error'); return; }
  if (!address)                            { showToast('Please enter your address.', 'error'); return; }
  if (!city)                               { showToast('Please enter your city.', 'error'); return; }
  if (!state)                              { showToast('Please select your state.', 'error'); return; }
  if (!pincode || !/^\d{6}$/.test(pincode))   { showToast('Enter a valid 6-digit pincode.', 'error'); return; }

  const cart = (typeof getCart === 'function') ? getCart() : [];
  if (!cart.length) { showToast('Your cart is empty!', 'error'); return; }

  const totals = renderSummary();
  if (!totals) return;

  const orderId = generateOrderId();

  _pendingOrderData = {
    orderId, name, phone,
    address: `${address}, ${city}, ${state} - ${pincode}`,
    notes,
    items: cart.map(item => {
      const p = (typeof getProductById === 'function') ? getProductById(item.id) : null;
      return { name: p?.name || item.name || '', size: item.size || '', qty: item.quantity, price: p?.price || item.price || 0 };
    }),
    coupon:           _appliedCoupon?.code || null,
    discount:         totals.discount,
    amount:           totals.total,
    payment:          selectedPaymentMethod,
    codAdvanceAmount: selectedPaymentMethod === 'cod' ? calcCodAdvance() : 0,
    status:           selectedPaymentMethod === 'cod' ? 'COD_ADVANCE_PENDING' : 'Paid',
    codAdvancePaid:   false,
    screenshot:       null,
  };
  _pendingOrderMeta = { orderId, name, total: totals.total };

  // Set UPI hrefs BEFORE showing screen (iOS fix — href must exist before tap)
  setUpiButtonHrefs(totals.total, orderId);

  // Populate payment screen order box
  const safeSet = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  safeSet('s-name',   name);
  safeSet('pi-amount', fmt(totals.total));

  // For COD: show advance amount in the "Amount to Pay" box, not full total
  const isCodPayment = selectedPaymentMethod === 'cod';
  if (isCodPayment) {
    const advance = calcCodAdvance();
    safeSet('s-amount', fmt(advance));
    // Also add a label clarifying it's the advance
    const amtLabel = document.querySelector('#screen-payment .sol');
    const rows = document.querySelectorAll('#screen-payment .success-order-row');
    rows.forEach(row => {
      if (row.querySelector('#s-amount')) {
        const label = row.querySelector('.sol');
        if (label) label.textContent = 'Advance to Pay Now';
      }
    });
  } else {
    safeSet('s-amount', fmt(totals.total));
    // Reset label for UPI
    const rows = document.querySelectorAll('#screen-payment .success-order-row');
    rows.forEach(row => {
      if (row.querySelector('#s-amount')) {
        const label = row.querySelector('.sol');
        if (label) label.textContent = 'Amount to Pay';
      }
    });
  }

  // Coupon row on payment screen
  const couponRow = document.getElementById('s-coupon-row');
  const couponVal = document.getElementById('s-coupon');
  if (couponRow && couponVal) {
    if (_appliedCoupon) {
      const lbl = _appliedCoupon.discountType === 'percent'
        ? `${_appliedCoupon.code} (${_appliedCoupon.value}% off)`
        : `${_appliedCoupon.code} (-${fmt(_appliedCoupon.value)})`;
      couponVal.textContent = lbl;
      couponRow.style.display = 'flex';
    } else {
      couponRow.style.display = 'none';
    }
  }

  // Build WA notify URL (payment screen button)
  const waMsg = buildWAMessage(_pendingOrderData);
  const waBtnPayment = document.getElementById('wa-notify-btn-payment');
  if (waBtnPayment) waBtnPayment.href = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;

  // Reset fallback/nudge
  ['upi-fallback-msg','upi-switchback-nudge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  // COD mode: hide UPI block, show COD confirm
  toggleCodMode(selectedPaymentMethod === 'cod');

  // Reset screenshot
  const ssInput = document.getElementById('screenshot-file-input');
  if (ssInput) ssInput.value = '';
  const ssPrev = document.getElementById('screenshot-preview-wrap');
  if (ssPrev) ssPrev.style.display = 'none';
  const ssStatus = document.getElementById('screenshot-status');
  if (ssStatus) ssStatus.textContent = '';
  const ssBtn = document.getElementById('screenshot-upload-btn');
  if (ssBtn) { ssBtn.disabled = false; ssBtn.textContent = '☁️ Upload Screenshot & Confirm Order'; }

  setStep(2);
  showScreen('payment');
  localStorage.setItem('rn_pending_order', orderId);
};

function toggleCodMode(isCod) {
  // Use IDs to target precisely — avoids querySelector matching the COD-internal duplicates
  const upiBlock = document.querySelector('#screen-payment .upi-block');
  const codBox   = document.getElementById('cod-confirm-box');
  const ssBox    = document.getElementById('upi-screenshot-box');
  const waBox    = document.getElementById('upi-wa-box');
  // Also hide/show payment instructions and OR dividers
  const piBox    = document.querySelector('#screen-payment .payment-instructions');
  const dividers = document.querySelectorAll('#screen-payment > .psjh-payment-wrap > .upi-or-divider, #screen-payment .upi-block ~ .upi-or-divider');

  if (isCod) {
    if (upiBlock) upiBlock.style.display = 'none';
    if (codBox)   codBox.style.display   = 'block';
    if (ssBox)    ssBox.style.display    = 'none';
    if (waBox)    waBox.style.display    = 'none';
    if (piBox)    piBox.style.display    = 'none';
  } else {
    if (upiBlock) upiBlock.style.display = 'block';
    if (codBox)   codBox.style.display   = 'none';
    if (ssBox)    ssBox.style.display    = 'block';
    if (waBox)    waBox.style.display    = 'block';
    if (piBox)    piBox.style.display    = 'block';
  }
}

// ── Screenshot preview ───────────────────────────────────────────────────────
function handleScreenshotChange(input) {
  const file = input.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please upload an image file.', 'error'); input.value = ''; return; }
  if (file.size > 10 * 1024 * 1024)    { showToast('File too large — max 10MB.', 'error'); input.value = ''; return; }
  const wrap = document.getElementById('screenshot-preview-wrap');
  const img  = document.getElementById('screenshot-preview-img');
  if (wrap && img) { img.src = URL.createObjectURL(file); wrap.style.display = 'block'; }
  const btn = document.getElementById('screenshot-upload-btn');
  if (btn) btn.textContent = '✅ Upload & Confirm Order';
}

// ── SCREEN 2 → 3: Upload screenshot + save order ────────────────────────────
window.uploadAndConfirmOrder = async function() {
  if (!_pendingOrderData) { showToast('Order data lost — please refresh.', 'error'); return; }

  const fileInput = document.getElementById('screenshot-file-input');
  const statusEl  = document.getElementById('screenshot-status');
  const btn       = document.getElementById('screenshot-upload-btn');

  if (!fileInput?.files?.length) { showToast('Please select your payment screenshot first.', 'error'); return; }

  btn.disabled = true; btn.textContent = '⏳ Uploading…';
  if (statusEl) { statusEl.textContent = 'Uploading screenshot…'; statusEl.style.color = 'var(--text-muted)'; }

  let screenshotUrl = null;
  try {
    const { uploadScreenshot } = await import('./cloudinary.js');
    screenshotUrl = await uploadScreenshot(fileInput.files[0]);
    if (statusEl) statusEl.textContent = '✓ Uploaded. Saving order…';
  } catch (err) {
    console.warn('[Checkout] Screenshot upload failed:', err.message);
    // Continue without screenshot — order still saves
    if (statusEl) statusEl.textContent = 'Screenshot upload failed — order will save without image.';
  }

  await saveOrderToFirebase(screenshotUrl);
};


window.copyCodUPI = function() {
  navigator.clipboard.writeText(UPI_ID).then(() => {
    showToast('UPI ID copied! ✓');
  }).catch(() => showToast('UPI ID: ' + UPI_ID));
};

window.uploadCodAdvanceAndConfirm = async function() {
  const fileInput  = document.getElementById('cod-screenshot-input');
  const statusEl   = document.getElementById('cod-upload-status');
  const btn        = document.getElementById('cod-confirm-btn');
  if (!_pendingOrderData) { showToast('Order data lost. Please refresh.', 'error'); return; }
  const advance = _pendingOrderData.codAdvanceAmount || calcCodAdvance();
  if (!fileInput?.files?.length) { showToast(`Please upload your ${fmt(advance)} advance payment screenshot.`, 'error'); return; }
  btn.disabled = true; btn.textContent = '⏳ Uploading…';
  if (statusEl) { statusEl.textContent = 'Uploading advance screenshot…'; }
  try {
    const { uploadScreenshot } = await import('./cloudinary.js');
    const url = await uploadScreenshot(fileInput.files[0]);
    _pendingOrderData.codAdvanceScreenshot = url;
    _pendingOrderData.codAdvancePaid = true;
    if (statusEl) statusEl.textContent = '✓ Advance screenshot uploaded. Saving order…';
    await saveOrderToFirebase(url);
  } catch (err) {
    console.error('[COD Advance upload]', err);
    if (statusEl) { statusEl.textContent = 'Upload failed. Try again or contact us.'; }
    btn.disabled = false; btn.textContent = '☁️ Try Again';
  }
};

window.placeCodOrder = async function() {
  if (!_pendingOrderData) { showToast('Order data lost — please refresh.', 'error'); return; }
  await saveOrderToFirebase(null);
};

async function saveOrderToFirebase(screenshotUrl) {
  const btn      = document.getElementById('screenshot-upload-btn');
  const statusEl = document.getElementById('screenshot-status');
  try {
    const { db } = await import('./firebase.js');
    const { collection, addDoc, serverTimestamp } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await addDoc(collection(db, 'orders'), {
      ..._pendingOrderData, screenshot: screenshotUrl, createdAt: serverTimestamp()
    });
    console.log('[Checkout] Order saved to Firebase ✓');
  } catch (err) {
    console.warn('[Checkout] Firebase unavailable — saving to localStorage:', err.message);
    const orders = JSON.parse(localStorage.getItem('rn_orders') || '[]');
    orders.unshift({ ..._pendingOrderData, screenshot: screenshotUrl, date: new Date().toISOString() });
    localStorage.setItem('rn_orders', JSON.stringify(orders));
  }

  // Clear cart
  if (typeof clearCart === 'function') clearCart();

  showSuccessScreen(_pendingOrderMeta);
  showToast('Order placed! ✓');
}

function buildWAMessage(d) {
  const itemLines = (d?.items || []).map(i =>
    `• ${i.name}${i.size ? ' ('+i.size+')' : ''} × ${i.qty} = ₹${(i.price * i.qty).toLocaleString('en-IN')}`
  ).join('\n');
  return encodeURIComponent(
    `🛒 *NEW ORDER — RN Sports Hub*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Name:* ${d?.name}\n` +
    `📱 *Phone:* ${d?.phone}\n` +
    `📍 *Address:* ${d?.address}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🛒 *Items:*\n${itemLines}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total:* ₹${d?.amount?.toLocaleString('en-IN')}\n` +
    `💳 *Payment:* ${(d?.payment||'').toUpperCase()}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ Please confirm & process this order.`
  );
}

// ── Success screen ───────────────────────────────────────────────────────────
function showSuccessScreen({ orderId, name, total }) {
  const safeSet = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  safeSet('success-name', name);

  // For COD show advance paid, not full total
  const isCod = _pendingOrderData?.payment === 'cod';
  const advance = _pendingOrderData?.codAdvanceAmount || 0;
  const successAmtLabel = document.querySelector('#screen-success .sol');
  const successRows = document.querySelectorAll('#screen-success .success-order-row');
  successRows.forEach(row => {
    if (row.querySelector('#success-amount')) {
      const label = row.querySelector('.sol');
      if (label) label.textContent = isCod ? 'Advance Paid' : 'Amount Paid';
    }
  });
  safeSet('success-amount', isCod ? fmt(advance) : fmt(total));

  // WA notify URL on success screen
  const waMsg = buildWAMessage(_pendingOrderData);
  const waBtn = document.getElementById('wa-notify-btn');
  if (waBtn) waBtn.href = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;

  setStep(3);
  showScreen('success');
}

// ── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(c);
  }
  const t = document.createElement('div');
  const isErr = type === 'error';
  t.style.cssText = `background:${isErr?'#2a1010':'#081a0f'};border:1px solid ${isErr?'rgba(255,68,68,.4)':'rgba(0,255,136,.3)'};border-left:3px solid ${isErr?'#ff4444':'var(--accent)'};color:${isErr?'#ff8888':'#f0f0f0'};padding:12px 18px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.5);opacity:0;transform:translateY(8px);transition:.3s;pointer-events:all;`;
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; setTimeout(() => t.remove(), 400); }, 3200);
}
window.showToast = showToast;

// ── Spinner CSS ──────────────────────────────────────────────────────────────
const _spinStyle = document.createElement('style');
_spinStyle.textContent = '@keyframes co-spin{to{transform:rotate(360deg)}}';
document.head.appendChild(_spinStyle);

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderSummary();

  document.getElementById('screenshot-file-input')?.addEventListener('change', function() {
    handleScreenshotChange(this);
  });
});

window.addEventListener('productsLoaded', () => { renderSummary && renderSummary(); });

// ── Shipping fee ─────────────────────────────────────────────────────────────
const SHIPPING_FEE = 100; // ₹100 flat shipping on every order
// Jerseys: ₹100 · Studs: ₹500 · Everything else: ₹200
// Rule: take the HIGHEST advance from all items in cart
const COD_ADVANCE_MAP = { jerseys: 100, studs: 500 };
const COD_ADVANCE_DEFAULT = 200;

function calcCodAdvance() {
  const cart = (typeof getCart === 'function') ? getCart() : [];
  if (!cart.length) return COD_ADVANCE_DEFAULT;
  let highest = 0;
  cart.forEach(item => {
    const p        = (typeof getProductById === 'function') ? getProductById(item.id) : null;
    const category = (p?.category || item.category || '').toLowerCase();
    const advance  = COD_ADVANCE_MAP[category] ?? COD_ADVANCE_DEFAULT;
    if (advance > highest) highest = advance;
  });
  return highest || COD_ADVANCE_DEFAULT;
}

function setCodUpiButtonHrefs(orderId) {
  const advance = calcCodAdvance();
  const links = {
    'cod-gpay-btn':    generateUpiLink(advance, orderId + '-ADVANCE', 'gpay'),
    'cod-phonepe-btn': generateUpiLink(advance, orderId + '-ADVANCE', 'phonepe'),
    'cod-paytm-btn':   generateUpiLink(advance, orderId + '-ADVANCE', 'paytm'),
    'cod-any-btn':     generateUpiLink(advance, orderId + '-ADVANCE', 'any'),
  };
  Object.entries(links).forEach(([id, href]) => {
    const el = document.getElementById(id);
    if (el) el.href = href;
  });
}

function handleCodUpiVisibility(btnEl) {
  let wasHidden = false, appOpened = false;
  const onVis = () => {
    if (document.hidden) { wasHidden = true; }
    else if (wasHidden) {
      wasHidden = false; appOpened = true;
      clearTimeout(noAppTimer);
      document.removeEventListener('visibilitychange', onVis);
      // Show switchback nudge
      const fb = document.getElementById('cod-upi-fallback');
      if (fb) fb.style.display = 'none';
      const nudge = document.getElementById('cod-switchback-nudge');
      if (nudge) { nudge.style.display = 'flex'; nudge.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      setTimeout(() => {
        document.getElementById('cod-screenshot-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 900);
      if (btnEl) btnEl.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
    }
  };
  const noAppTimer = setTimeout(() => {
    document.removeEventListener('visibilitychange', onVis);
    if (!appOpened && !document.hidden) {
      const fb = document.getElementById('cod-upi-fallback');
      if (fb) { fb.style.display = 'block'; fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    } else if (!appOpened && document.hidden) {
      document.addEventListener('visibilitychange', onVis);
    }
  }, 4000);
  document.addEventListener('visibilitychange', onVis);
}

window.handleCodUpiAppClick = function(e, app) {
  const ids = { gpay: 'cod-gpay-btn', phonepe: 'cod-phonepe-btn', paytm: 'cod-paytm-btn' };
  const btn = document.getElementById(ids[app]);
  const href = btn?.getAttribute('href') || '#';
  if (!href || href === '#' || (!href.includes('upi/pay') && !href.includes('upi://'))) {
    e.preventDefault();
    showToast('Please fill your details and place the order first.', 'error');
    return;
  }
  handleCodUpiVisibility(btn);
};

window.handleCodUpiClick = function(e) {
  const btn = document.getElementById('cod-any-btn');
  const href = btn?.getAttribute('href') || '#';
  if (!href || href === '#' || (!href.includes('upi/pay') && !href.includes('upi://'))) {
    e.preventDefault();
    showToast('Please fill your details and place the order first.', 'error');
    return;
  }
  handleCodUpiVisibility(btn);
};

window.copyCodUPI = function() {
  navigator.clipboard.writeText(UPI_ID).then(() => {
    const btn = document.getElementById('cod-copy-upi-btn');
    if (btn) { const orig = btn.innerHTML; btn.innerHTML = '✓ Copied!'; setTimeout(() => btn.innerHTML = orig, 2000); }
    showToast('UPI ID copied! ✓');
  }).catch(() => showToast('UPI ID: ' + UPI_ID));
};

window.handleCodScreenshotChange = function(input) {
  const file = input.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please upload an image file.', 'error'); input.value = ''; return; }
  const wrap = document.getElementById('cod-preview-wrap');
  const img  = document.getElementById('cod-preview-img');
  if (wrap && img) { img.src = URL.createObjectURL(file); wrap.style.display = 'block'; }
  const btn = document.getElementById('cod-confirm-btn');
  if (btn) btn.textContent = '✅ Upload & Confirm COD Order';
};

// ── Patch toggleCodMode to also set COD UPI hrefs and remaining amount ────────
const _origToggleCodMode = toggleCodMode;
toggleCodMode = function(isCod) {
  _origToggleCodMode(isCod);
  if (isCod && _pendingOrderData) {
    const advance = calcCodAdvance();
    // Store advance on order data so it saves correctly
    _pendingOrderData.codAdvanceAmount = advance;
    // Set COD UPI button hrefs
    setCodUpiButtonHrefs(_pendingOrderData.orderId);
    // Update remaining amount display
    const remaining = (_pendingOrderData.amount || 0) - advance;
    const remEl = document.getElementById('cod-remaining-amount');
    if (remEl) remEl.textContent = '₹' + Math.max(0, remaining).toLocaleString('en-IN');
    // Update advance amount in all display elements inside cod-confirm-box
    const advEl        = document.getElementById('cod-advance-amount');
    const advBoxVal    = document.getElementById('cod-amount-box-value');
    const advQrAmt     = document.getElementById('cod-qr-amount');
    if (advEl)     advEl.textContent     = fmt(advance);
    if (advBoxVal) advBoxVal.textContent = fmt(advance);
    if (advQrAmt)  advQrAmt.textContent  = fmt(advance);
    // Set WhatsApp link for COD
    const waMsg = buildWAMessage(_pendingOrderData);
    const waBtn = document.getElementById('cod-wa-btn');
    if (waBtn) waBtn.href = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;
    // Reset fallback/nudge
    const fb = document.getElementById('cod-upi-fallback');
    if (fb) fb.style.display = 'none';
    const nudge = document.getElementById('cod-switchback-nudge');
    if (nudge) nudge.style.display = 'none';
    // Attach cod screenshot change handler once
    const codInput = document.getElementById('cod-screenshot-input');
    if (codInput && !codInput._handlerAttached) {
      codInput.addEventListener('change', function() { window.handleCodScreenshotChange(this); });
      codInput._handlerAttached = true;
    }
  }
};