// ── RN Sports Hub — Product Detail Page
// Features: image gallery + lightbox, size chart modal, reviews (Firebase + local),
//           star rating picker, share button, related products

let selectedSize  = null;
let selectedQty   = 1;
let currentProduct = null;
let _lightboxImgs  = [];
let _lightboxIdx   = 0;
let _currentRating = 0;

// ── Init ─────────────────────────────────────────────────────────────────────
function initProductPage() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { showNotFound(); return; }

  function tryLoad() {
    const src = window.PRODUCTS || (typeof products !== 'undefined' ? products : []);
    const p   = src.find(x => String(x.id) === String(id));
    if (p) {
      currentProduct = p;
      renderProductDetail(p);
      renderRelatedProducts(p);
      renderReviews(p);
      updateMeta(p);
    } else if (!window.PRODUCTS || window.PRODUCTS.length === 0) {
      setTimeout(tryLoad, 150);
    } else {
      showNotFound();
    }
  }
  tryLoad();
}

function updateMeta(p) {
  document.title = `${p.name} — RN Sports Hub`;
  const m = document.querySelector('meta[name="description"]');
  if (m) m.setAttribute('content', p.description || '');
  const bc = document.getElementById('breadcrumb-name');
  if (bc) bc.textContent = p.name;
}

// ── Product Detail ────────────────────────────────────────────────────────────
function renderProductDetail(p) {
  const root = document.getElementById('product-detail-root');
  if (!root) return;

  const imgs = (p.images && p.images.length) ? p.images : [p.image || 'https://placehold.co/600x600/111/00ff88?text=RN'];
  _lightboxImgs = imgs;

  const discount = p.originalPrice > p.price
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
  const savings  = (p.originalPrice || 0) - (p.price || 0);
  const cat      = (p.category || '').toLowerCase();
  const brand    = (p.brand    || '').toLowerCase();
  const isShoes  = cat === 'studs' || cat.includes('shoe');
  const isJersey = cat === 'jerseys' || cat.includes('jersey');

  // Size chart source
  let chartSrc = '', chartAlt = '';
  if (isShoes) {
    if (brand.includes('adidas'))      { chartSrc = 'assets/images/adidas_size_chart.png';  chartAlt = 'Adidas Size Chart'; }
    else if (brand.includes('mizuno')) { chartSrc = 'assets/images/Mizuno-puma_size_chart.png'; chartAlt = 'Mizuno Size Chart'; }
    else if (brand.includes('puma')) { chartSrc = 'assets/images/Mizuno-puma_size_chart.png'; chartAlt = 'Puma Size Chart'; }
    else                               { chartSrc = 'assets/images/nike_size_chart.png';   chartAlt = 'Nike Size Chart'; }
  } else if (isJersey) {
    chartSrc = 'assets/images/jersey_size_chart.jpg'; chartAlt = 'Jersey Size Chart';
  }

  const sizeLabel = isShoes ? 'UK Size' : 'Size';
  const isOOS = p.stock === 0;

  // Build share URL
  const shareUrl = window.location.href;
  const shareText = encodeURIComponent(`Check out ${p.name} on RN Sports Hub!\n${shareUrl}`);
  const waShareUrl = `https://wa.me/?text=${shareText}`;

  root.innerHTML = `
    <div class="product-detail-grid">

      <!-- ── Gallery ── -->
      <div class="product-gallery">
        <div class="product-main-image" onclick="openLightbox(0)" title="Click to zoom">
          ${p.badge ? `<div class="product-main-badge"><span class="product-badge badge-${(p.badge||'').toLowerCase().replace(/\s+/g,'')}">${p.badge}</span></div>` : ''}
          ${discount > 0 ? `<div class="product-main-discount">-${discount}% OFF</div>` : ''}
          ${isOOS ? `<div class="product-oos-overlay">Out of Stock</div>` : ''}
          <img id="main-product-img" src="${imgs[0]}" alt="${p.name}"
            onerror="this.src='https://placehold.co/600x600/111/00ff88?text=RN'"/>
          <div class="zoom-hint-overlay">🔍 Click to zoom</div>
        </div>
        <div class="product-thumbnails" id="product-thumbs">
          ${imgs.map((src, i) => `
            <div class="product-thumb ${i===0?'active':''}" onclick="switchThumb(this,'${src}',${i})">
              <img src="${src}" alt="" loading="lazy" onerror="this.src='https://placehold.co/100x100/111/00ff88?text=RN'"/>
            </div>`).join('')}
        </div>
      </div>

      <!-- ── Info ── -->
      <div class="product-info-col">

        <span class="product-cat-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          ${(p.category||'').toUpperCase()}${p.type?' · '+p.type.toUpperCase():''}${p.team?' · '+p.team.toUpperCase():''}
        </span>

        <h1 class="product-detail-name">${p.name}</h1>

        <div class="product-rating-row">
          <span class="stars">★★★★★</span>
          <span class="rating-count">4.8 · ${p.reviews || 0} reviews</span>
        </div>

        <div class="product-detail-pricing">
          <span class="product-detail-price">₹${(p.price||0).toLocaleString('en-IN')}</span>
          ${p.originalPrice > p.price ? `<span class="product-detail-original">₹${p.originalPrice.toLocaleString('en-IN')}</span>` : ''}
        </div>
        ${savings > 0 ? `<p class="product-detail-savings">✔ You save ₹${savings.toLocaleString('en-IN')} (${discount}% off)</p>` : ''}

        <hr class="info-divider"/>

        <!-- Sizes -->
        <div class="size-label-row">
          <span class="size-label">${sizeLabel}: <span id="selected-size-display" style="color:var(--accent)">— Select —</span></span>
          ${chartSrc ? `<button class="size-guide-btn" onclick="openSizeChart('${chartSrc}','${chartAlt}')">📏 Size Chart</button>` : ''}
        </div>
        <div class="size-options" id="size-options">
          ${(p.sizes||[]).map(s => `<button class="size-btn" onclick="selectSize('${s}',this)">${s}</button>`).join('')}
        </div>

        <!-- Inline size chart thumbnail -->
        ${chartSrc ? `
        <div class="size-chart-section">
          <div class="size-chart-label">📏 SIZE CHART</div>
          <div class="size-chart-wrap" onclick="openSizeChart('${chartSrc}','${chartAlt}')" title="Tap to zoom">
            <img src="${chartSrc}" alt="${chartAlt}" class="size-chart-img" loading="lazy"
              onerror="this.closest('.size-chart-section').style.display='none'"/>
            <div class="size-chart-hint">🔍 Tap to expand</div>
          </div>
        </div>` : ''}

        <!-- Qty -->
        <p class="qty-label">Quantity</p>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty(-1)">−</button>
          <div class="qty-value" id="qty-display">1</div>
          <button class="qty-btn" onclick="changeQty(1)">+</button>
        </div>

        <!-- CTAs -->
        <div class="product-cta-stack">
          ${isOOS ? `
          <button class="btn-add-to-cart-lg" disabled style="opacity:.5;cursor:not-allowed">Out of Stock</button>
          <a href="https://wa.me/917439001021?text=Hi!%20Is%20${encodeURIComponent(p.name)}%20back%20in%20stock%3F" target="_blank" class="btn-buy-now" style="background:#25d366">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.949-1.413A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
            Notify Me on WhatsApp
          </a>` : `
          <button class="btn-add-to-cart-lg" onclick="handleAddToCart()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            Add to Cart
          </button>
          <button class="btn-buy-now" onclick="handleBuyNow()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Buy Now
          </button>`}
        </div>

        <!-- Share button -->
        <div class="product-share-row">
          <span class="share-label">Share:</span>
          <a href="${waShareUrl}" target="_blank" class="share-btn share-wa" title="Share on WhatsApp">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.949-1.413A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
            WhatsApp
          </a>
          <button class="share-btn share-copy" onclick="copyProductLink()" title="Copy link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy Link
          </button>
          ${navigator.share ? `<button class="share-btn share-native" onclick="nativeShare('${p.name.replace(/'/g,"\\'")}','${shareUrl}')" title="Share">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>` : ''}
        </div>

        <!-- Trust badges -->
        <div class="product-trust-badges">
          <div class="trust-badge"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>100% Authentic</span></div>
          <div class="trust-badge"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg><span>Fast Delivery</span></div>
          <div class="trust-badge"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg><span>UPI / COD</span></div>
        </div>

        <!-- Accordion -->
        <div class="product-accordion">
          ${buildAccordion('acc-desc','Description','open',`<p>${p.description || 'Premium quality sports product.'}</p><ul style="margin-top:10px"><li>High-quality material built for performance</li><li>Machine washable</li><li>Available in multiple sizes</li></ul>`)}
          ${buildAccordion('acc-ship','Shipping','',`<ul><li>Standard: 4–7 business days</li><li>Express available — ask on WhatsApp</li><li>Pan-India delivery via trusted couriers</li><li>Tracking link sent after dispatch</li></ul>`)}
          ${buildAccordion('acc-ret','Returns & Exchange','',`<ul><li>7-day exchange window from delivery</li><li>Item must be unused, original condition</li><li>Initiate via WhatsApp: +91 74390 01021</li></ul>`)}
        </div>

      </div>
    </div>`;
}

function buildAccordion(id, title, openClass, body) {
  return `<div class="accordion-item ${openClass}" id="${id}">
    <div class="accordion-header" onclick="this.parentElement.classList.toggle('open')">
      <span>${title}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="accordion-body">${body}</div>
  </div>`;
}

// ── Interactions ──────────────────────────────────────────────────────────────
function switchThumb(el, src, idx) {
  document.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const main = document.getElementById('main-product-img');
  if (main) main.src = src;
  _lightboxIdx = idx;
}

function selectSize(size, btn) {
  selectedSize = size;
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const d = document.getElementById('selected-size-display');
  if (d) d.textContent = size;
}

function changeQty(delta) {
  selectedQty = Math.max(1, Math.min(10, selectedQty + delta));
  const d = document.getElementById('qty-display');
  if (d) d.textContent = selectedQty;
}

function handleAddToCart() {
  if (!selectedSize) { shakeSize(); showToast('⚠️ Please select a size first!', 'error'); return; }
  for (let i = 0; i < selectedQty; i++) addToCart(currentProduct.id, selectedSize);
  showToast(`${currentProduct.name} (${selectedSize} × ${selectedQty}) added!`);
}

function handleBuyNow() {
  if (!selectedSize) { shakeSize(); showToast('⚠️ Please select a size first!', 'error'); return; }
  for (let i = 0; i < selectedQty; i++) addToCart(currentProduct.id, selectedSize);
  window.location.href = 'checkout.html';
}

function shakeSize() {
  const el = document.getElementById('size-options');
  if (!el) return;
  el.style.animation = 'none'; void el.offsetWidth;
  el.style.animation = 'pdpShake .4s ease';
}

function showToast(msg, type) {
  if (typeof window.showToast === 'function') { window.showToast(msg, type); return; }
  const isErr = type === 'error';
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:${isErr?'#2a1010':'#081a0f'};border:1px solid ${isErr?'rgba(255,68,68,.4)':'rgba(0,255,136,.3)'};border-left:3px solid ${isErr?'#ff4444':'var(--accent)'};color:${isErr?'#ff8888':'#f0f0f0'};padding:12px 18px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.5);animation:toastIn .3s ease;`;
  t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateY(8px)'; t.style.transition='.3s'; setTimeout(()=>t.remove(),350); }, 2800);
}

// ── Share ─────────────────────────────────────────────────────────────────────
function copyProductLink() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => {
      showToast('Link copied! ✓');
      const btn = document.querySelector('.share-copy');
      if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Link`; }, 2000); }
    })
    .catch(() => showToast('Link: ' + window.location.href));
}

async function nativeShare(name, url) {
  try { await navigator.share({ title: name, url }); }
  catch(e) { if (e.name !== 'AbortError') copyProductLink(); }
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(idx) {
  if (!_lightboxImgs.length) return;
  _lightboxIdx = idx || 0;
  updateLightboxImage();
  const ov = document.getElementById('img-lightbox-overlay');
  if (ov) { ov.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeLightbox() {
  document.getElementById('img-lightbox-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}
function lightboxPrev() { _lightboxIdx = (_lightboxIdx - 1 + _lightboxImgs.length) % _lightboxImgs.length; updateLightboxImage(); }
function lightboxNext() { _lightboxIdx = (_lightboxIdx + 1) % _lightboxImgs.length; updateLightboxImage(); }
function lightboxGoTo(idx) { _lightboxIdx = idx; updateLightboxImage(); }
function updateLightboxImage() {
  const img    = document.getElementById('lightbox-main-img');
  const ctr    = document.getElementById('lightbox-counter');
  const thumbs = document.getElementById('lightbox-thumbstrip');
  if (img) img.src = _lightboxImgs[_lightboxIdx];
  if (ctr) ctr.textContent = `${_lightboxIdx+1} / ${_lightboxImgs.length}`;
  if (thumbs) thumbs.innerHTML = _lightboxImgs.map((src,i) =>
    `<div class="lb-thumb${i===_lightboxIdx?' active':''}" onclick="lightboxGoTo(${i})"><img src="${src}" loading="lazy"/></div>`
  ).join('');
}

// ── Size chart modal ──────────────────────────────────────────────────────────
function openSizeChart(src, alt) {
  const modal = document.getElementById('size-chart-modal');
  const img   = document.getElementById('size-chart-modal-img');
  if (!modal || !img) return;
  img.src = src; img.alt = alt || 'Size Chart';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSizeChart() {
  document.getElementById('size-chart-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Keyboard + swipe ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (document.getElementById('img-lightbox-overlay')?.classList.contains('open')) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft')  lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
  }
  if (document.getElementById('size-chart-modal')?.classList.contains('open') && e.key === 'Escape') closeSizeChart();
});
;(function() {
  let sx = 0;
  document.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive:true});
  document.addEventListener('touchend', e => {
    if (!document.getElementById('img-lightbox-overlay')?.classList.contains('open')) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) { dx < 0 ? lightboxNext() : lightboxPrev(); }
  }, {passive:true});
})();

// ── Reviews ───────────────────────────────────────────────────────────────────
async function renderReviews(product) {
  const section = document.getElementById('reviews-section');
  const grid    = document.getElementById('reviews-grid');
  if (!section || !grid) return;
  section.style.display = 'block';

  grid.innerHTML = `<div class="reviews-loading"><div class="review-spinner"></div>Loading reviews…</div>`;

  let reviews = [];

  // Try Firebase
  try {
    const { db } = await import('./firebase.js');
    const { collection, getDocs, orderBy, query } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDocs(query(collection(db, 'products', String(product.id), 'reviews'), orderBy('createdAt', 'desc')));
    reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    console.warn('[Reviews] Firebase unavailable:', e.message);
  }

  // Merge localStorage reviews (submitted offline)
  try {
    const local = JSON.parse(localStorage.getItem(`rn_reviews_${product.id}`) || '[]');
    local.forEach(lr => {
      if (!reviews.find(r => r.name === lr.name && r.comment === lr.comment)) reviews.push(lr);
    });
  } catch(e) {}

  const total = reviews.length + (product.reviews || 0);
  const avg   = reviews.length
    ? (reviews.reduce((s,r) => s + (r.rating||5), 0) / reviews.length).toFixed(1)
    : '4.8';

  // Rating summary
  const summaryEl = document.getElementById('reviews-summary');
  if (summaryEl) summaryEl.innerHTML = `
    <div style="font-family:var(--font-head);font-size:2.5rem;color:var(--accent);line-height:1">${avg}</div>
    <div style="color:#f59e0b;font-size:1rem;letter-spacing:2px">★★★★★</div>
    <div style="color:var(--text-muted);font-size:12px;margin-top:2px">${total} reviews</div>`;

  if (!reviews.length) {
    grid.innerHTML = `<div style="color:var(--text-muted);font-size:14px;grid-column:1/-1">No reviews yet — be the first!</div>`;
    return;
  }

  const avatarColors = ['#00ff88','#38bdf8','#a78bfa','#fb923c'];
  grid.innerHTML = reviews.map(r => {
    const nm  = r.author || r.name || 'Customer';
    const txt = r.comment || r.text || '';
    const rt  = Math.min(5, Math.max(1, r.rating || 5));
    const dt  = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('en-IN') : (r.date || '');
    const col = avatarColors[nm.charCodeAt(0) % 4];
    return `<div class="review-card">
      <div class="review-header">
        <div class="review-avatar" style="background:${col};color:#000">${nm.charAt(0).toUpperCase()}</div>
        <div>
          <div class="review-name">${nm}</div>
          ${dt ? `<div class="review-date">${dt}</div>` : ''}
        </div>
      </div>
      <div class="review-stars">${'★'.repeat(rt)}${'☆'.repeat(5-rt)}</div>
      <div class="review-text">"${txt}"</div>
    </div>`;
  }).join('');
}

// ── Star rating picker ────────────────────────────────────────────────────────
window.setRating = function(val) {
  _currentRating = val;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i < val);
  });
  const hint = document.getElementById('rating-hint');
  if (hint) hint.textContent = ['','Poor','Fair','Good','Very Good','Excellent'][val] || '';
};

window.submitReview = async function() {
  const name   = document.getElementById('review-name')?.value.trim();
  const text   = document.getElementById('review-text')?.value.trim();
  const rating = _currentRating;

  if (!name)   { showToast('Please enter your name.'); return; }
  if (!rating) { showToast('Please select a rating.'); return; }
  if (!text)   { showToast('Please write a review.'); return; }
  if (!currentProduct) { showToast('Product not loaded — please refresh.'); return; }

  const btn = document.querySelector('.review-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  const review = { name, comment: text, rating, date: new Date().toLocaleDateString('en-IN'), author: name };

  // Try Firebase
  let savedToFirebase = false;
  try {
    const { db } = await import('./firebase.js');
    const { collection, addDoc, serverTimestamp } =
      await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await addDoc(collection(db, 'products', String(currentProduct.id), 'reviews'), {
      ...review, createdAt: serverTimestamp()
    });
    savedToFirebase = true;
  } catch(e) {
    console.warn('[Reviews] Firebase save failed, saving locally:', e.message);
  }

  // Always save locally too
  try {
    const key    = `rn_reviews_${currentProduct.id}`;
    const local  = JSON.parse(localStorage.getItem(key) || '[]');
    local.unshift(review);
    localStorage.setItem(key, JSON.stringify(local));
  } catch(e) {}

  // Reset form
  const nameEl = document.getElementById('review-name');
  const textEl = document.getElementById('review-text');
  if (nameEl) nameEl.value = '';
  if (textEl) textEl.value = '';
  _currentRating = 0;
  window.setRating(0);
  if (btn) { btn.disabled = false; btn.textContent = 'Submit Review →'; }

  showToast('Review submitted! Thank you ✓');
  renderReviews(currentProduct);
};

// ── Related products ──────────────────────────────────────────────────────────
function renderRelatedProducts(p) {
  const grid = document.getElementById('related-products-grid');
  if (!grid) return;
  const src     = window.PRODUCTS || (typeof products !== 'undefined' ? products : []);
  const related = src.filter(x => x.category === p.category && String(x.id) !== String(p.id)).slice(0,4);
  if (!related.length) { document.getElementById('related-section')?.style && (document.getElementById('related-section').style.display='none'); return; }
  grid.innerHTML = related.map(x => {
    const imgs = (x.images && x.images.length) ? x.images : [x.image || ''];
    const disc = x.originalPrice > x.price ? Math.round(((x.originalPrice-x.price)/x.originalPrice)*100) : 0;
    return `<div class="product-card" onclick="window.location='product.html?id=${x.id}'" style="cursor:pointer">
      <div class="product-image-wrap">
        <img src="${imgs[0]}" alt="${x.name}" loading="lazy" onerror="this.src='https://placehold.co/400x400/111/00ff88?text=RN'">
        ${x.badge?`<span class="product-badge badge-${(x.badge||'').toLowerCase().replace(/\s+/g,'')}">${x.badge}</span>`:''}
        ${disc>0?`<span class="product-discount">-${disc}%</span>`:''}
      </div>
      <div class="product-info">
        <p class="product-category">${(x.brand||'').toUpperCase()}</p>
        <span class="product-name">${x.name}</span>
        <div class="product-pricing">
          <span class="product-price">₹${(x.price||0).toLocaleString('en-IN')}</span>
          ${x.originalPrice>x.price?`<span class="product-original">₹${x.originalPrice.toLocaleString('en-IN')}</span>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Not found ─────────────────────────────────────────────────────────────────
function showNotFound() {
  const root = document.getElementById('product-detail-root');
  if (!root) return;
  root.innerHTML = `<div class="product-not-found">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <h2>Product Not Found</h2>
    <p>This product may have been removed.</p>
    <a href="shop.html" class="btn-primary" style="margin-top:16px;text-decoration:none;padding:12px 28px;display:inline-block;font-size:13px;letter-spacing:1.5px;font-weight:700">Browse Shop</a>
  </div>`;
}

// ── Init keyframes ────────────────────────────────────────────────────────────
const _s = document.createElement('style');
_s.textContent = `
  @keyframes pdpShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .review-spinner{width:22px;height:22px;border:2.5px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 8px}
  .reviews-loading{display:flex;flex-direction:column;align-items:center;padding:40px 0;color:var(--text-muted);font-size:13px;grid-column:1/-1}
`;
document.head.appendChild(_s);

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initProductPage);
window.addEventListener('productsLoaded', () => { if (!currentProduct) initProductPage(); });
