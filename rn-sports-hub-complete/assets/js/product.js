// ── RN Sports Hub — Product Detail Page v2
// Works with Firebase products (window.PRODUCTS) and static products array

let selectedSize = null;
let selectedQty  = 1;
let currentProduct = null;
let _lightboxImgs  = [];
let _lightboxIdx   = 0;

// ── Init ──────────────────────────────────────────────────────────────────────
function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');
  if (!id) { showNotFound(); return; }

  // Try Firebase products first (window.PRODUCTS), fall back to static array
  function tryLoad() {
    const source = window.PRODUCTS || (typeof products !== 'undefined' ? products : []);
    const product = source.find(p => String(p.id) === String(id));
    if (product) {
      currentProduct = product;
      renderProductDetail(product);
      renderRelatedProducts(product);
      updatePageMeta(product);
    } else if (window.PRODUCTS === undefined || (window.PRODUCTS && window.PRODUCTS.length === 0)) {
      setTimeout(tryLoad, 150); // wait for Firebase
    } else {
      showNotFound();
    }
  }
  tryLoad();
}

function updatePageMeta(product) {
  document.title = `${product.name} — RN Sports Hub`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', product.description || '');
  const bc = document.getElementById('breadcrumb-name');
  if (bc) bc.textContent = product.name;
}

// ── Render Detail ─────────────────────────────────────────────────────────────
function renderProductDetail(product) {
  const section = document.getElementById('product-detail-root');
  if (!section) return;

  // Resolve images array (Firebase uses images[], static uses image string)
  const imgs = (product.images && product.images.length > 0)
    ? product.images
    : [product.image || 'https://placehold.co/600x600/111/00ff88?text=RN+Sports'];
  _lightboxImgs = imgs;

  const discount = product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  const savings  = (product.originalPrice || 0) - (product.price || 0);
  const sizeLabel = (product.category === 'studs') ? 'UK Size' : 'Size';
  const isOOS = product.stock === 0;

  // Size chart logic — brand-aware
  const cat   = (product.category || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const isShoes  = cat === 'studs' || cat.includes('shoe');
  const isJersey = cat === 'jerseys' || cat.includes('jersey');

  let chartSrc = '', chartAlt = '';
  if (isShoes) {
    if (brand.includes('adidas'))      { chartSrc = 'assets/images/size_chart/adidas_shoes_size_chart.png';  chartAlt = 'Adidas Size Chart'; }
    else if (brand.includes('mizuno')) { chartSrc = 'assets/images/size_chart/mizuno_shoes_size_chart.png'; chartAlt = 'Mizuno Size Chart'; }
    else                               { chartSrc = 'assets/images/size_chart/nike_shoes_size_chart.png';   chartAlt = 'Nike Size Chart'; }
  } else if (isJersey) {
    chartSrc = 'assets/images/size_chart/jersey_size_chart.jpg';
    chartAlt = 'Jersey Size Chart';
  }

  const sizeChartHTML = chartSrc ? `
    <div class="size-chart-section">
      <div class="size-chart-label">📏 SIZE CHART</div>
      <div class="size-chart-wrap" onclick="openSizeChart('${chartSrc}','${chartAlt}')" title="Tap to zoom">
        <img src="${chartSrc}" alt="${chartAlt}" class="size-chart-img" loading="lazy"
          onerror="this.closest('.size-chart-wrap').style.display='none'"/>
        <div class="size-chart-hint">🔍 Tap to expand</div>
      </div>
    </div>` : '';

  section.innerHTML = `
    <div class="product-detail-grid">

      <!-- ── Gallery ─────────────────────────────────────── -->
      <div class="product-gallery">
        <div class="product-main-image" id="main-image-wrap" onclick="openLightbox(0)" title="Click to zoom">
          ${product.badge ? `<div class="product-main-badge"><span class="product-badge badge-${(product.badge||'').toLowerCase().replace(/\s+/g,'')}">${product.badge}</span></div>` : ''}
          ${discount > 0 ? `<div class="product-main-discount">-${discount}% OFF</div>` : ''}
          ${isOOS ? `<div class="product-oos-overlay">Out of Stock</div>` : ''}
          <img id="main-product-img" src="${imgs[0]}" alt="${product.name}"
            onerror="this.src='https://placehold.co/600x600/111/00ff88?text=RN+Sports'"/>
          <div class="zoom-hint-overlay">🔍 Click to zoom</div>
        </div>
        <div class="product-thumbnails" id="product-thumbs">
          ${imgs.map((img, i) => `
            <div class="product-thumb ${i===0?'active':''}" onclick="switchThumb(this,'${img}',${i})">
              <img src="${img}" alt="View ${i+1}" loading="lazy"
                onerror="this.src='https://placehold.co/200x200/111/00ff88?text=RN'"/>
            </div>`).join('')}
        </div>
      </div>

      <!-- ── Info ─────────────────────────────────────────── -->
      <div class="product-info-col">

        <span class="product-cat-tag">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
          ${(product.category||'').toUpperCase()}${product.type ? ' · '+product.type.toUpperCase() : ''}${product.team ? ' · '+product.team.toUpperCase() : ''}
        </span>

        <h1 class="product-detail-name">${product.name}</h1>

        <div class="product-rating-row">
          <div class="stars">★★★★★</div>
          <span class="rating-count">4.8 · ${product.reviews || 0} reviews</span>
        </div>

        <div class="product-detail-pricing">
          <span class="product-detail-price">₹${(product.price||0).toLocaleString('en-IN')}</span>
          ${product.originalPrice > product.price
            ? `<span class="product-detail-original">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
        </div>

        ${savings > 0 ? `<p class="product-detail-savings">✔ You save ₹${savings.toLocaleString('en-IN')} (${discount}% off)</p>` : ''}

        <hr class="info-divider"/>

        <!-- Size selector -->
        <div class="size-label-row">
          <span class="size-label">${sizeLabel}: <span id="selected-size-display" style="color:var(--accent)">— Select —</span></span>
          ${chartSrc ? `<button class="size-guide-btn" onclick="openSizeChart('${chartSrc}','${chartAlt}')">📏 Size Chart</button>` : ''}
        </div>
        <div class="size-options" id="size-options">
          ${(product.sizes||[]).map(s => `
            <button class="size-btn" onclick="selectSize('${s}',this)">${s}</button>
          `).join('')}
        </div>

        <!-- Size chart inline -->
        ${sizeChartHTML}

        <!-- Quantity -->
        <p class="qty-label">Quantity</p>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty(-1)">−</button>
          <div class="qty-value" id="qty-display">1</div>
          <button class="qty-btn" onclick="changeQty(1)">+</button>
        </div>

        <!-- CTAs -->
        <div class="product-cta-stack">
          ${isOOS ? `
          <button class="btn-add-to-cart-lg" disabled style="opacity:0.5;cursor:not-allowed">Out of Stock</button>
          <a href="https://wa.me/917439001021?text=Hi!%20Is%20${encodeURIComponent(product.name)}%20back%20in%20stock%3F" target="_blank" class="btn-buy-now" style="background:#25d366">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.949-1.413A9.944 9.944 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
            Notify Me on WhatsApp
          </a>` : `
          <button class="btn-add-to-cart-lg" onclick="handleAddToCart()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Add to Cart
          </button>
          <button class="btn-buy-now" onclick="handleBuyNow()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Buy Now — Place Order
          </button>`}
        </div>

        <!-- Trust Badges -->
        <div class="product-trust-badges">
          <div class="trust-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>100% Authentic</span>
          </div>
          <div class="trust-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            <span>Fast Delivery</span>
          </div>
          <div class="trust-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
            <span>UPI / COD</span>
          </div>
        </div>

        <!-- Accordion -->
        <div class="product-accordion">
          <div class="accordion-item open" id="accordion-desc">
            <div class="accordion-header" onclick="toggleAccordion('accordion-desc')">
              <span>Description</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="accordion-body">
              <p>${product.description || 'Premium quality sports product.'}</p>
              <ul style="margin-top:10px">
                <li>High-quality material built for performance</li>
                <li>Officially licensed design</li>
                <li>Machine washable</li>
                <li>Available in multiple sizes</li>
              </ul>
            </div>
          </div>

          <div class="accordion-item" id="accordion-size">
            <div class="accordion-header" onclick="toggleAccordion('accordion-size')">
              <span>Size Guide</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="accordion-body">
              ${isShoes ? `
                <ul>
                  <li>UK 6 → EU 39–40</li><li>UK 7 → EU 40–41</li>
                  <li>UK 8 → EU 41–42</li><li>UK 9 → EU 43</li>
                  <li>UK 10 → EU 44</li><li>UK 11 → EU 45–46</li>
                </ul>
                <p style="margin-top:8px">If unsure, go half a size up or <a href="https://wa.me/917439001021" target="_blank" style="color:var(--accent)">ask on WhatsApp</a>.</p>
              ` : `
                <ul>
                  <li>S → Chest 36–38"</li><li>M → Chest 38–40"</li>
                  <li>L → Chest 40–42"</li><li>XL → Chest 42–44"</li>
                  <li>XXL → Chest 44–46"</li>
                </ul>
                <p style="margin-top:8px">For a loose fit order one size up. <a href="https://wa.me/917439001021" target="_blank" style="color:var(--accent)">Ask on WhatsApp</a> if unsure.</p>
              `}
            </div>
          </div>

          <div class="accordion-item" id="accordion-shipping">
            <div class="accordion-header" onclick="toggleAccordion('accordion-shipping')">
              <span>Shipping & Delivery</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="accordion-body">
              <ul>
                <li>Standard delivery: 4–7 business days</li>
                <li>Express delivery available — ask on WhatsApp</li>
                <li>Pan-India delivery via trusted couriers</li>
                <li>Tracking link sent after dispatch</li>
              </ul>
            </div>
          </div>

          <div class="accordion-item" id="accordion-returns">
            <div class="accordion-header" onclick="toggleAccordion('accordion-returns')">
              <span>Returns & Exchange</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="accordion-body">
              <ul>
                <li>7-day exchange window from delivery</li>
                <li>Item must be unused and in original condition</li>
                <li>Size exchange supported</li>
                <li>Initiate via WhatsApp: +91 74390 01021</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>`;
}

// ── Related Products ──────────────────────────────────────────────────────────
function renderRelatedProducts(product) {
  const grid = document.getElementById('related-products-grid');
  if (!grid) return;
  const source  = window.PRODUCTS || (typeof products !== 'undefined' ? products : []);
  const related = source.filter(p => p.category === product.category && String(p.id) !== String(product.id)).slice(0, 4);
  if (!related.length) { const sec = document.getElementById('related-section'); if (sec) sec.style.display='none'; return; }

  // Use shop card renderer
  grid.innerHTML = related.map(p => {
    const imgs = (p.images && p.images.length > 0) ? p.images : [p.image || ''];
    const disc = p.originalPrice > p.price ? Math.round(((p.originalPrice-p.price)/p.originalPrice)*100) : 0;
    return `
      <div class="product-card" onclick="window.location='product.html?id=${p.id}'" style="cursor:pointer">
        <div class="product-image-wrap">
          <img src="${imgs[0]}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/400x400/111/00ff88?text=RN'">
          ${p.badge?`<span class="product-badge badge-${(p.badge||'').toLowerCase().replace(/\s+/g,'')}">${p.badge}</span>`:''}
          ${disc>0?`<span class="product-discount">-${disc}%</span>`:''}
        </div>
        <div class="product-info">
          <p class="product-category">${(p.brand||'').toUpperCase()}</p>
          <a href="product.html?id=${p.id}" class="product-name" onclick="event.stopPropagation()">${p.name}</a>
          <div class="product-pricing">
            <span class="product-price">₹${(p.price||0).toLocaleString('en-IN')}</span>
            ${p.originalPrice>p.price?`<span class="product-original">₹${p.originalPrice.toLocaleString('en-IN')}</span>`:''}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Interactions ──────────────────────────────────────────────────────────────
function switchThumb(el, imgSrc, idx) {
  document.querySelectorAll('.product-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const mainImg = document.getElementById('main-product-img');
  if (mainImg) mainImg.src = imgSrc;
  _lightboxIdx = idx;
}

function selectSize(size, btn) {
  selectedSize = size;
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const display = document.getElementById('selected-size-display');
  if (display) display.textContent = size;
}

function changeQty(delta) {
  selectedQty = Math.max(1, Math.min(10, selectedQty + delta));
  const display = document.getElementById('qty-display');
  if (display) display.textContent = selectedQty;
}

function handleAddToCart() {
  if (!selectedSize) { shakeSize(); showToast('Please select a size first!','error'); return; }
  for (let i = 0; i < selectedQty; i++) addToCart(currentProduct.id, selectedSize);
  showToast(`${currentProduct.name} (${selectedSize} × ${selectedQty}) added to cart!`);
}

function handleBuyNow() {
  if (!selectedSize) { shakeSize(); showToast('Please select a size first!','error'); return; }
  for (let i = 0; i < selectedQty; i++) addToCart(currentProduct.id, selectedSize);
  window.location.href = 'checkout.html';
}

function shakeSize() {
  const el = document.getElementById('size-options');
  if (!el) return;
  el.style.animation = 'none'; void el.offsetWidth;
  el.style.animation = 'shake 0.4s ease';
}

function toggleAccordion(id) {
  document.getElementById(id)?.classList.toggle('open');
}

function showNotFound() {
  const section = document.getElementById('product-detail-root');
  if (!section) return;
  section.innerHTML = `
    <div class="product-not-found">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <h2>Product Not Found</h2>
      <p>This product may have been removed or the link is incorrect.</p>
      <a href="shop.html" class="btn-primary" style="margin-top:16px;text-decoration:none;padding:12px 28px;display:inline-block;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Browse All Products</a>
    </div>`;
}

// ── IMAGE LIGHTBOX ────────────────────────────────────────────────────────────
function openLightbox(startIdx) {
  if (!_lightboxImgs.length) return;
  _lightboxIdx = startIdx || 0;
  const overlay = document.getElementById('img-lightbox-overlay');
  if (!overlay) return;
  updateLightboxImage();
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  document.getElementById('img-lightbox-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function lightboxPrev() {
  _lightboxIdx = (_lightboxIdx - 1 + _lightboxImgs.length) % _lightboxImgs.length;
  updateLightboxImage();
}

function lightboxNext() {
  _lightboxIdx = (_lightboxIdx + 1) % _lightboxImgs.length;
  updateLightboxImage();
}

function updateLightboxImage() {
  const img     = document.getElementById('lightbox-main-img');
  const counter = document.getElementById('lightbox-counter');
  const thumbs  = document.getElementById('lightbox-thumbstrip');
  if (img)     img.src = _lightboxImgs[_lightboxIdx];
  if (counter) counter.textContent = `${_lightboxIdx + 1} / ${_lightboxImgs.length}`;
  if (thumbs) {
    thumbs.innerHTML = _lightboxImgs.map((src, i) => `
      <div class="lb-thumb ${i===_lightboxIdx?'active':''}" onclick="lightboxGoTo(${i})">
        <img src="${src}" alt="view ${i+1}" onerror="this.style.display='none'"/>
      </div>`).join('');
  }
}

function lightboxGoTo(idx) {
  _lightboxIdx = idx;
  updateLightboxImage();
}

// ── SIZE CHART MODAL ──────────────────────────────────────────────────────────
function openSizeChart(src, alt) {
  const modal = document.getElementById('size-chart-modal');
  const img   = document.getElementById('size-chart-modal-img');
  if (!modal || !img) return;
  img.src = src;
  img.alt = alt || 'Size Chart';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSizeChart() {
  document.getElementById('size-chart-modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

// Keyboard + swipe support
document.addEventListener('keydown', e => {
  const lb = document.getElementById('img-lightbox-overlay');
  const sc = document.getElementById('size-chart-modal');
  if (lb?.classList.contains('open')) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft')  lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
  }
  if (sc?.classList.contains('open') && e.key === 'Escape') closeSizeChart();
});

// Touch swipe on lightbox
(function() {
  let startX = 0;
  document.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive:true});
  document.addEventListener('touchend', e => {
    const lb = document.getElementById('img-lightbox-overlay');
    if (!lb?.classList.contains('open')) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) { dx < 0 ? lightboxNext() : lightboxPrev(); }
  }, {passive:true});
})();

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initProductPage);
// Also re-init if Firebase loads after DOMContentLoaded
window.addEventListener('productsLoaded', () => {
  if (!currentProduct) initProductPage();
});

// Shake keyframe
const _style = document.createElement('style');
_style.textContent = `
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
`;
document.head.appendChild(_style);
