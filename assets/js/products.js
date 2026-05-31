// ── RN Sports Hub — Products
// Static product array removed — all products come from Firestore.
// window.PRODUCTS starts empty; Firebase loader overwrites it on each page.
// Skeleton cards show while Firebase loads so customers never see blank screens.

// ── Empty on start — Firebase fills this ──────────────────────────────────────
window.PRODUCTS = [];

// ── Skeleton loading cards ────────────────────────────────────────────────────
// Shows animated placeholder cards while Firebase fetches real products.
// Call renderSkeletons(containerId, count) before the Firebase load starts.
function renderSkeletons(containerId, count = 8) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const card = `
    <div class="skeleton-card" style="
      background:var(--bg-2,#111);border-radius:12px;overflow:hidden;
      animation:skeletonPulse 1.5s ease-in-out infinite alternate">
      <div style="height:220px;background:var(--bg-3,#1a1a1a)"></div>
      <div style="padding:12px;display:flex;flex-direction:column;gap:8px">
        <div style="height:10px;width:40%;background:var(--bg-3,#1a1a1a);border-radius:4px"></div>
        <div style="height:14px;width:80%;background:var(--bg-3,#1a1a1a);border-radius:4px"></div>
        <div style="height:14px;width:60%;background:var(--bg-3,#1a1a1a);border-radius:4px"></div>
        <div style="height:36px;background:var(--bg-3,#1a1a1a);border-radius:6px;margin-top:4px"></div>
      </div>
    </div>`;
  container.innerHTML = Array(count).fill(card).join('');
}
window.renderSkeletons = renderSkeletons;

// Inject skeleton keyframe animation once
(function() {
  const s = document.createElement('style');
  s.textContent = `@keyframes skeletonPulse{from{opacity:.6}to{opacity:1}}`;
  document.head.appendChild(s);
})();



// ── Helper functions ──────────────────────────────────────────────────────────
function getProductById(id) {
  return (window.PRODUCTS || []).find(p => String(p.id) === String(id)) || null;
}

function getFeaturedProducts() {
  return (window.PRODUCTS || []).filter(p => p.featured === true || ['HOT','BESTSELLER','NEW'].includes(p.badge)).slice(0, 8);
}

function getProductsByCategory(cat) {
  const src = window.PRODUCTS || [];
  return cat === 'all' ? src : src.filter(p => p.category === cat);
}

// ── Image optimisation ────────────────────────────────────────────────────────
// For Cloudinary URLs: injects f_auto,q_auto,w_{size} transformations.
// This tells Cloudinary to auto-pick format (WebP/AVIF) + compress + resize.
// Non-Cloudinary URLs (Unsplash, placeholder) are returned unchanged.
// Result: 60-80% smaller images, same visual quality, much faster load.
function optimiseImg(url, width = 400) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com')) return url;
  // Already has transformations — don't double-add
  if (url.includes('f_auto') || url.includes('q_auto')) return url;
  // Insert transform segment after /upload/
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}
window.optimiseImg = optimiseImg;

function renderProductCard(product) {
  const imgs = (product.images && product.images.length > 0) ? product.images : [product.image || ''];
  const src  = optimiseImg(imgs[0], 400);
  const discount = product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  return `
    <div class="product-card" onclick="window.location='product.html?id=${product.id}'" style="cursor:pointer">
      <div class="product-image-wrap">
        <img src="${src}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/400x400/111/00ff88?text=RN+Sports'">
        ${product.badge ? `<span class="product-badge badge-${(product.badge||'').toLowerCase().replace(/\s+/g,'')}">${product.badge}</span>` : ''}
        ${discount > 0 ? `<span class="product-discount">-${discount}%</span>` : ''}
        <div class="product-actions">
          <button class="btn-add-cart" onclick="event.stopPropagation();addToCart('${product.id}',null)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            Add to Cart
          </button>
        </div>
      </div>
      <div class="product-info">
        <p class="product-category">${(product.brand||'').toUpperCase()}${product.type ? ' · '+product.type.toUpperCase() : ''}</p>
        <a href="product.html?id=${product.id}" class="product-name" onclick="event.stopPropagation()">${product.name}</a>
        <div class="product-pricing">
          <span class="product-price">₹${(product.price||0).toLocaleString('en-IN')}</span>
          ${product.originalPrice > product.price ? `<span class="product-original">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
        </div>
      </div>
    </div>`;
}

function renderFeaturedProducts() {
  const container = document.getElementById('featured-products-grid');
  if (!container) return;
  container.innerHTML = getFeaturedProducts().map(renderProductCard).join('');
}

// ── Firebase live sync ────────────────────────────────────────────────────────
// Each HTML page (index, shop, product) includes an inline <script type="module">
// that loads all products from Firestore on page load.
//
// Flow:
//   1. This file sets window.PRODUCTS = [] immediately.
//   2. renderSkeletons() shows animated placeholder cards while Firebase loads.
//   3. The inline module script fetches Firestore, normalises fields, and
//      overwrites window.PRODUCTS with live data.
//   4. It fires: window.dispatchEvent(new CustomEvent('productsLoaded'))
//   5. shop.js, product.js, and renderFeaturedProducts() re-render with real data.
//
// Result: customers see skeleton loaders instantly, then real products appear.
// No wrong/placeholder images ever shown.