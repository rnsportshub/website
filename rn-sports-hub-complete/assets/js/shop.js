// ── RN Sports Hub — Shop Page v2 (Firebase + Filters + Pagination)
// Products come from window.PRODUCTS (loaded by products.js from Firebase)

const ITEMS_PER_PAGE = 12;

let activeCategory  = 'all';
let activeBrand     = 'all';
let activeSortBy    = 'default';
let activeSearch    = '';
let activePriceMax  = 99999;
let currentPage     = 1;

// ── Filter ───────────────────────────────────────────────────────────────────
function getFilteredProducts() {
  const source = window.PRODUCTS || [];
  let filtered = [...source];

  if (activeCategory !== 'all')
    filtered = filtered.filter(p => (p.category || '').toLowerCase() === activeCategory);

  if (activeBrand !== 'all')
    filtered = filtered.filter(p => (p.brand || '').toLowerCase() === activeBrand.toLowerCase());

  if (activeSearch.trim()) {
    const q = activeSearch.toLowerCase();
    filtered = filtered.filter(p =>
      (p.name  || '').toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.team  || '').toLowerCase().includes(q)
    );
  }

  filtered = filtered.filter(p => (p.price || 0) <= activePriceMax);

  switch (activeSortBy) {
    case 'price-asc':  filtered.sort((a,b) => a.price - b.price); break;
    case 'price-desc': filtered.sort((a,b) => b.price - a.price); break;
    case 'name-asc':   filtered.sort((a,b) => (a.name||'').localeCompare(b.name||'')); break;
    case 'discount':
      filtered.sort((a,b) => {
        const dA = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
        const dB = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
        return dB - dA;
      });
      break;
    default: break;
  }
  return filtered;
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderShopProducts() {
  const grid     = document.getElementById('shop-products-grid');
  const countEl  = document.getElementById('results-count');
  if (!grid) return;

  const filtered  = getFilteredProducts();
  const total     = filtered.length;
  const totalPages= Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  currentPage     = Math.min(currentPage, totalPages);
  const start     = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE);

  if (countEl) countEl.textContent = `${total} product${total !== 1 ? 's' : ''} found`;

  if (total === 0) {
    grid.innerHTML = `
      <div class="shop-empty" style="grid-column:1/-1;">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <h3>No products found</h3>
        <p>Try adjusting your filters or search term.</p>
        <button onclick="resetFilters()" class="btn-primary" style="margin-top:16px;border:none;cursor:pointer;padding:12px 24px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Clear Filters</button>
      </div>`;
    renderPagination(0, 0, 0);
    return;
  }

  grid.innerHTML = pageItems.map(p => renderProductCard(p)).join('');
  renderPagination(total, currentPage, totalPages);
  updateActiveFilters();
}

// ── Product Card ─────────────────────────────────────────────────────────────
function renderProductCard(product) {
  const discount = product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  const imgSrc = (product.images && product.images.length > 0)
    ? product.images[0]
    : (product.image || 'https://placehold.co/400x400/111/00ff88?text=RN+Sports');
  const isOOS = product.stock === 0;
  return `
    <div class="product-card${isOOS ? ' out-of-stock' : ''}" ${!isOOS ? `onclick="window.location='product.html?id=${product.id}'"` : ''} style="cursor:${isOOS?'default':'pointer'}">
      <div class="product-image-wrap">
        <img src="${imgSrc}" alt="${product.name}" loading="lazy"
          onerror="this.src='https://placehold.co/400x400/111/00ff88?text=RN+Sports'">
        ${product.badge ? `<span class="product-badge badge-${(product.badge||'').toLowerCase().replace(/\s+/g,'')}">${product.badge}</span>` : ''}
        ${discount > 0 ? `<span class="product-discount">-${discount}%</span>` : ''}
        ${isOOS ? `<span class="product-badge" style="background:#333;color:#888;top:44px">Out of Stock</span>` : ''}
        ${!isOOS ? `
        <div class="product-actions">
          <button class="btn-add-cart" onclick="event.stopPropagation();addToCart(${JSON.stringify(product.id)},null)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Add to Cart
          </button>
        </div>` : ''}
      </div>
      <div class="product-info">
        <p class="product-category">${(product.brand||'').toUpperCase()}${product.type?' · '+product.type.toUpperCase():''}</p>
        <a href="product.html?id=${product.id}" class="product-name" onclick="event.stopPropagation()">${product.name}</a>
        <div class="product-pricing">
          <span class="product-price">₹${(product.price||0).toLocaleString('en-IN')}</span>
          ${product.originalPrice > product.price ? `<span class="product-original">₹${product.originalPrice.toLocaleString('en-IN')}</span>` : ''}
        </div>
      </div>
    </div>`;
}

// ── Pagination ────────────────────────────────────────────────────────────────
function renderPagination(total, page, totalPages) {
  let el = document.getElementById('shop-pagination');
  if (!el) {
    el = document.createElement('div');
    el.id = 'shop-pagination';
    const main = document.querySelector('.shop-main .container');
    if (main) main.appendChild(el);
  }

  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages = [1];
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page-1); i <= Math.min(totalPages-1, page+1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  el.innerHTML = `
    <div class="pagination">
      <button class="pg-btn pg-prev" onclick="goToPage(${page-1})" ${page===1?'disabled':''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      ${pages.map(p => p === '…'
        ? `<span class="pg-ellipsis">…</span>`
        : `<button class="pg-btn ${p===page?'active':''}" onclick="goToPage(${p})">${p}</button>`
      ).join('')}
      <button class="pg-btn pg-next" onclick="goToPage(${page+1})" ${page===totalPages?'disabled':''}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>`;
}

function goToPage(p) {
  const filtered   = getFilteredProducts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderShopProducts();
  window.scrollTo({ top: document.querySelector('.shop-filter-bar')?.offsetTop - 10 || 0, behavior: 'smooth' });
}

// ── Filter Setters ────────────────────────────────────────────────────────────
function setCategory(cat, el) {
  activeCategory = cat;
  currentPage = 1;
  document.querySelectorAll('.shop-cat-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderShopProducts();
}

function setSort(val) {
  activeSortBy = val;
  currentPage  = 1;
  renderShopProducts();
}

function setSearch(val) {
  activeSearch = val;
  currentPage  = 1;
  renderShopProducts();
}

function resetFilters() {
  activeCategory = 'all';
  activeBrand    = 'all';
  activeSortBy   = 'default';
  activeSearch   = '';
  activePriceMax = 99999;
  currentPage    = 1;
  document.querySelectorAll('.shop-cat-btn').forEach(b => b.classList.remove('active'));
  const allBtn = document.querySelector('.shop-cat-btn[data-cat="all"]');
  if (allBtn) allBtn.classList.add('active');
  const sortEl   = document.getElementById('sort-select');
  if (sortEl) sortEl.value = 'default';
  const searchEl = document.getElementById('shop-search-input');
  if (searchEl) searchEl.value = '';
  renderShopProducts();
}

function clearSearch() {
  activeSearch = '';
  currentPage  = 1;
  const searchEl = document.getElementById('shop-search-input');
  if (searchEl) searchEl.value = '';
  renderShopProducts();
}

// ── Active filter tags ────────────────────────────────────────────────────────
function updateActiveFilters() {
  const bar = document.getElementById('active-filters');
  if (!bar) return;
  const tags = [];
  if (activeCategory !== 'all')
    tags.push(`<span class="filter-tag">${activeCategory} <button onclick="setCategory('all',document.querySelector('[data-cat=all]'))">×</button></span>`);
  if (activeSearch)
    tags.push(`<span class="filter-tag">Search: "${activeSearch}" <button onclick="clearSearch()">×</button></span>`);
  bar.innerHTML = tags.length
    ? tags.join('') + `<button class="filter-tag-clear" onclick="resetFilters()">Clear All</button>`
    : '';
  bar.style.display = tags.length ? 'flex' : 'none';
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);

  const catParam = params.get('category');
  if (catParam) {
    activeCategory = catParam;
    const btn = document.querySelector(`.shop-cat-btn[data-cat="${catParam}"]`);
    if (btn) { document.querySelectorAll('.shop-cat-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); }
  }

  const brandParam = params.get('brand');
  if (brandParam) activeBrand = brandParam;

  const qParam = params.get('q');
  if (qParam) {
    activeSearch = qParam;
    const si = document.getElementById('shop-search-input');
    if (si) si.value = qParam;
  }

  // Render immediately with static products, re-render when Firebase loads
  renderShopProducts();  // shows static products instantly

  // When Firebase upgrades window.PRODUCTS, re-render
  window.addEventListener('productsLoaded', () => {
    currentPage = 1;
    renderShopProducts();
    console.log('[Shop] Re-rendered with Firebase products');
  });

  // Search debounce
  const searchInput = document.getElementById('shop-search-input');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { activeSearch = searchInput.value; currentPage = 1; renderShopProducts(); }, 300);
    });
  }

  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.addEventListener('change', () => setSort(sortSelect.value));
});
