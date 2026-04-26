// ── RN Sports Hub — Shop Page (PSJH-style: sidebar + chips + pagination)

// ── State ─────────────────────────────────────────────────────────────────────
const _state = {
  cat:      'all',
  brands:   [],       // array of lowercase brand strings
  priceMin: 0,
  priceMax: 999999,
  stock:    'all',    // 'all' | 'instock'
  sort:     'featured',
  search:   '',
  page:     1,
  perPage:  12,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDiscountPct(p) {
  if (!p.originalPrice || p.originalPrice <= p.price) return 0;
  return (p.originalPrice - p.price) / p.originalPrice;
}

function _getFiltered() {
  let r = [...(window.PRODUCTS || [])];

  // Category (map RN category values to filter values)
  if (_state.cat !== 'all') {
    r = r.filter(p => (p.category || '').toLowerCase() === _state.cat);
  }

  // Brands (checkbox — multi-select)
  if (_state.brands.length) {
    r = r.filter(p => _state.brands.includes((p.brand || '').toLowerCase()));
  }

  // Price
  r = r.filter(p => {
    const price = Number(p.price) || 0;
    return price >= _state.priceMin && price <= _state.priceMax;
  });

  // Stock
  if (_state.stock === 'instock') {
    r = r.filter(p => Number(p.stock) > 0);
  }

  // Search
  if (_state.search) {
    const q = _state.search.toLowerCase();
    r = r.filter(p =>
      (p.name     || '').toLowerCase().includes(q) ||
      (p.brand    || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.team     || '').toLowerCase().includes(q)
    );
  }

  // Sort
  switch (_state.sort) {
    case 'price-asc':  r.sort((a, b) => a.price - b.price); break;
    case 'price-desc': r.sort((a, b) => b.price - a.price); break;
    case 'discount':   r.sort((a, b) => getDiscountPct(b) - getDiscountPct(a)); break;
    default:           r.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); break;
  }

  return r;
}

// ── Product Card ──────────────────────────────────────────────────────────────
function buildShopCard(p) {
  const imgs = (p.images && p.images.length) ? p.images : [p.image || 'https://placehold.co/400x400/111/00ff88?text=RN'];
  const disc = p.originalPrice > p.price
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
  const isOOS = p.stock === 0;
  const pid   = String(p.id);

  return `<div class="product-card${isOOS ? ' out-of-stock' : ''}">
    <a href="product.html?id=${pid}" class="product-card-link" style="display:block;text-decoration:none;color:inherit">
      <div class="product-image-wrap">
        <img src="${imgs[0]}" alt="${p.name}" loading="lazy"
          onerror="this.src='https://placehold.co/400x400/111/00ff88?text=RN'">
        ${p.badge ? `<span class="product-badge badge-${(p.badge||'').toLowerCase().replace(/\s+/g,'')}">${p.badge}</span>` : ''}
        ${disc > 0 ? `<span class="product-discount">-${disc}%</span>` : ''}
        ${isOOS ? `<span class="product-badge" style="background:#1e1e1e;color:#666;top:42px;left:12px">Out of Stock</span>` : ''}
      </div>
      <div class="product-info">
        <p class="product-category">${(p.brand||'').toUpperCase()}${p.type ? ' · '+p.type.toUpperCase() : ''}</p>
        <span class="product-name">${p.name}</span>
        <div class="product-pricing">
          <span class="product-price">₹${(p.price||0).toLocaleString('en-IN')}</span>
          ${p.originalPrice > p.price ? `<span class="product-original">₹${p.originalPrice.toLocaleString('en-IN')}</span>` : ''}
        </div>
      </div>
    </a>
    <div class="product-card-bottom">
      <button class="btn-add-cart"
        ${isOOS ? 'disabled style="opacity:.45;cursor:not-allowed"' : `onclick="handleAddToCartShop('${pid}',this)"`}>
        ${isOOS ? 'Out of Stock' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Add to Cart'}
      </button>
    </div>
  </div>`;
}

// Add-to-cart from shop card (size auto-selected to first available)
function handleAddToCartShop(pid, btn) {
  const p = (window.PRODUCTS || []).find(x => String(x.id) === String(pid));
  if (!p) return;
  const size = (p.sizes && p.sizes.length) ? p.sizes[0] : 'Free Size';
  addToCart(pid, size);
  const orig = btn.innerHTML;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Added!';
  btn.style.background = '#22c55e';
  btn.style.color      = '#000';
  setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; btn.style.color = ''; }, 1800);
}
window.handleAddToCartShop = handleAddToCartShop;

// ── Render page of products ───────────────────────────────────────────────────
function _renderPagination(total) {
  if (window.__paginationOverride) { window.__paginationOverride(total); return; }
  const el = document.getElementById('shop-pagination');
  if (!el) return;
  const totalPages = Math.ceil(total / _state.perPage);
  if (totalPages <= 1) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const cur = _state.page;
  let pages = [];
  if (totalPages <= 7) { pages = Array.from({length:totalPages},(_,i)=>i+1); }
  else if (cur<=4) { pages=[1,2,3,4,5,'…',totalPages]; }
  else if (cur>=totalPages-3) { pages=[1,'…',totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages]; }
  else { pages=[1,'…',cur-1,cur,cur+1,'…',totalPages]; }
  const pgBtn = p => p==='…'?`<span class="pg-ellipsis">…</span>`:`<button class="pg-num${p===cur?' active':''}" onclick="window._goToPage(${p})">${p}</button>`;
  el.innerHTML = `<div class="pagination-wrap"><button class="pg-nav" onclick="window._goToPage(1)" ${cur===1?'disabled':''}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>Page 1</button><button class="pg-nav" onclick="window._goToPage(${cur-1})" ${cur===1?'disabled':''}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>Previous</button><div class="pg-numbers">${pages.map(pgBtn).join('')}</div><button class="pg-nav" onclick="window._goToPage(${cur+1})" ${cur===totalPages?'disabled':''}>Next<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button><button class="pg-nav" onclick="window._goToPage(${totalPages})" ${cur===totalPages?'disabled':''}>Page ${totalPages}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg></button></div><div class="pg-label">Page ${cur} of ${totalPages}</div>`;
}

function _renderPage(filtered) {
  const grid  = document.getElementById('shop-products-grid');
  const noRes = document.getElementById('no-results');
  if (!grid) return;

  if (!filtered.length) {
    grid.innerHTML = '';
    if (noRes) noRes.style.display = 'block';
    _renderPagination(0);
    return;
  }
  if (noRes) noRes.style.display = 'none';

  const start   = (_state.page - 1) * _state.perPage;
  const pageItems = filtered.slice(start, start + _state.perPage);
  grid.innerHTML  = pageItems.map(buildShopCard).join('');
  _renderPagination(filtered.length);
}


window._goToPage = function(page) {
  const filtered   = _getFiltered();
  const totalPages = Math.ceil(filtered.length / _state.perPage);
  if (page < 1 || page > totalPages) return;
  _state.page = page;
  _renderPage(filtered);
  document.getElementById('shop-products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ── Active filter tags (Myntra-style pill row) ────────────────────────────────
function _renderActiveTags() {
  const wrap = document.getElementById('active-filter-tags');
  if (!wrap) return;
  const tags = [];

  if (_state.cat !== 'all') {
    const label = { jerseys:'Jerseys', studs:'Studs & Boots', gear:'Gear' }[_state.cat] || _state.cat;
    tags.push({ label, clear: () => { _state.cat = 'all'; _state.page = 1; _render(); }});
  }
  _state.brands.forEach(b => tags.push({
    label: b.charAt(0).toUpperCase() + b.slice(1),
    clear: () => { _state.brands = _state.brands.filter(x => x !== b); _state.page = 1; _render(); }
  }));
  if (_state.priceMin > 0 || _state.priceMax < 999999) {
    const lbl = _state.priceMax < 999999
      ? `₹${_state.priceMin.toLocaleString('en-IN')} – ₹${_state.priceMax.toLocaleString('en-IN')}`
      : `From ₹${_state.priceMin.toLocaleString('en-IN')}`;
    tags.push({ label: lbl, clear: () => { _state.priceMin = 0; _state.priceMax = 999999; _state.page = 1; _render(); }});
  }
  if (_state.stock === 'instock') tags.push({ label: 'In Stock Only', clear: () => { _state.stock = 'all'; _state.page = 1; _render(); }});
  if (_state.search) tags.push({ label: `"${_state.search}"`, clear: () => { _state.search = ''; _state.page = 1; _render(); }});

  if (!tags.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  window._tagClearFns = tags.map(t => t.clear);
  wrap.innerHTML = tags.map((t, i) => `
    <button class="active-tag-pill" onclick="window._tagClearFns[${i}]()">
      ${t.label}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>`).join('')
    + `<button class="active-tag-clear" onclick="clearFilters()">Clear All</button>`;
}

// ── Sidebar counts ────────────────────────────────────────────────────────────
function _updateCounts() {
  const all = window.PRODUCTS || [];
  const cnt = (cat) => all.filter(p => (p.category||'').toLowerCase() === cat).length;
  const s   = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  s('fc-all',     all.length);
  s('fc-jerseys', cnt('jerseys'));
  s('fc-studs',   cnt('studs'));
  s('fc-gear',    cnt('gear'));
}

// ── Sync sidebar UI → _state ──────────────────────────────────────────────────
function _readSidebar() {
  const cat = document.querySelector('input[name="cat"]:checked');
  if (cat) _state.cat = cat.value;

  _state.brands = [...document.querySelectorAll('input[type="checkbox"]:checked')]
    .map(c => c.value.toLowerCase());

  _state.priceMin = parseInt(document.getElementById('price-min')?.value) || 0;
  const rawMax = parseInt(document.getElementById('price-max')?.value);
  _state.priceMax = (rawMax > 0) ? rawMax : 999999;

  const stock = document.querySelector('input[name="stock"]:checked');
  if (stock) _state.stock = stock.value;

  const sort = document.getElementById('sort-select');
  if (sort) _state.sort = sort.value;
}

// ── Sync _state → sidebar UI ─────────────────────────────────────────────────
function _writeSidebar() {
  const catEl = document.querySelector(`input[name="cat"][value="${_state.cat}"]`);
  if (catEl) catEl.checked = true;

  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = _state.brands.includes(cb.value.toLowerCase());
  });

  const minEl = document.getElementById('price-min');
  const maxEl = document.getElementById('price-max');
  if (minEl) minEl.value = _state.priceMin || '';
  if (maxEl) maxEl.value = _state.priceMax >= 999999 ? '' : _state.priceMax;

  const stockEl = document.querySelector(`input[name="stock"][value="${_state.stock}"]`);
  if (stockEl) stockEl.checked = true;

  const sortEl = document.getElementById('sort-select');
  if (sortEl) sortEl.value = _state.sort;
}

// ── Sync _state → chip strip ─────────────────────────────────────────────────
function _writeChips() {
  document.querySelectorAll('.filter-chip').forEach(c => {
    const f = c.dataset.filter;
    let active = false;
    if (f === 'all') {
      active = _state.cat === 'all' && !_state.brands.length && !_state.search;
    } else if (['jerseys','studs','gear'].includes(f)) {
      active = _state.cat === f && !_state.brands.length;
    } else {
      // brand chip
      active = _state.brands.length === 1 && _state.brands[0] === f && _state.cat === 'all';
    }
    c.classList.toggle('active', active);
  });
}

// ── Main render ───────────────────────────────────────────────────────────────
function _render() {
  _updateCounts();
  _writeSidebar();
  _writeChips();
  _renderActiveTags();

  const filtered = _getFiltered();
  const total    = (window.PRODUCTS || []).length;
  const countEl  = document.getElementById('product-result-count');
  if (countEl) {
    countEl.textContent = filtered.length === total
      ? `${total} Product${total !== 1 ? 's' : ''}`
      : `${filtered.length} of ${total} Product${total !== 1 ? 's' : ''}`;
  }
  _renderPage(filtered);
}

// ── Public API ────────────────────────────────────────────────────────────────
window.applyFilter = function(val, btn) {
  const brandValues = ['adidas','nike','mizuno','puma'];
  if (val === 'all') {
    _state.cat = 'all'; _state.brands = []; _state.search = '';
  } else if (brandValues.includes(val)) {
    _state.cat = 'all'; _state.brands = [val];
  } else {
    _state.cat = val; _state.brands = [];
  }
  _state.page = 1;
  _render();
};

window.applyFromSidebar = function() {
  _readSidebar();
  _state.page = 1;
  _render();
};

window.clearFilters = function() {
  _state.cat = 'all'; _state.brands = []; _state.priceMin = 0;
  _state.priceMax = 999999; _state.stock = 'all'; _state.sort = 'featured';
  _state.search = ''; _state.page = 1;
  const searchInput = document.getElementById('shop-search-input');
  if (searchInput) searchInput.value = '';
  _render();
};

// Called after Firebase upgrades window.PRODUCTS
window.renderShop = function() { _render(); };

// ── URL param bootstrap ───────────────────────────────────────────────────────
(function() {
  const params = new URLSearchParams(window.location.search);
  const cat    = params.get('category');
  const brand  = params.get('brand');
  const q      = params.get('q');
  if (cat)   _state.cat    = cat;
  if (brand) _state.brands = [brand.toLowerCase()];
  if (q)     _state.search = q;
})();

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Show filter toggle on mobile
  if (window.innerWidth < 1024) {
    const btn = document.getElementById('filter-toggle-btn');
    if (btn) btn.style.display = 'inline-flex';
  }

  // Search input debounce
  const searchInput = document.getElementById('shop-search-input');
  if (searchInput) {
    if (_state.search) searchInput.value = _state.search;
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { _state.search = searchInput.value.trim(); _state.page = 1; _render(); }, 280);
    });
  }

  // Close mobile sidebar when clicking outside
  document.addEventListener('click', e => {
    const sb  = document.getElementById('filter-sidebar');
    const btn = document.getElementById('filter-toggle-btn');
    if (sb?.classList.contains('mobile-open') && !sb.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
      sb.classList.remove('mobile-open');
    }
  });

  // Render with static products immediately
  _render();
});

// Firebase re-render (fired by inline module script in shop.html)
window.addEventListener('productsLoaded', () => { _state.page = 1; _render(); });

// ── Mobile filter open/close (with backdrop) ──────────────────────────────────
window.openMobileFilter = function() {
  document.getElementById('filter-sidebar')?.classList.add('mobile-open');
  document.getElementById('filter-backdrop')?.classList.add('active');
  document.body.style.overflow = 'hidden';
};
window.closeMobileFilter = function() {
  document.getElementById('filter-sidebar')?.classList.remove('mobile-open');
  document.getElementById('filter-backdrop')?.classList.remove('active');
  document.body.style.overflow = '';
};

// ── Override _renderPagination for image-matched style ───────────────────────
// (with First / << Previous / page numbers / Next >> / Last, plus "Page X of Y" label)
window._goToPage = function(page) {
  const filtered   = _getFiltered();
  const totalPages = Math.ceil(filtered.length / _state.perPage);
  if (page < 1 || page > totalPages) return;
  _state.page = page;
  _renderPage(filtered);
  document.getElementById('shop-products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Patch _renderPagination to render like the screenshot
(function() {
  const _origRenderPagination = window._renderPagination || function(){};
  function _newRenderPagination(total) {
    const el = document.getElementById('shop-pagination');
    if (!el) return;
    const totalPages = Math.ceil(total / _state.perPage);
    if (totalPages <= 1) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const cur = _state.page;

    // Build pages with ellipsis
    let pages = [];
    if (totalPages <= 7) {
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else if (cur <= 4) {
      pages = [1, 2, 3, 4, 5, '…', totalPages];
    } else if (cur >= totalPages - 3) {
      pages = [1, '…', totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages];
    } else {
      pages = [1, '…', cur-1, cur, cur+1, '…', totalPages];
    }

    const pgBtn = (p) => {
      if (p === '…') return `<span class="pg-ellipsis">…</span>`;
      return `<button class="pg-num${p === cur ? ' active' : ''}" onclick="window._goToPage(${p})">${p}</button>`;
    };

    el.innerHTML = `
    <div class="pagination-wrap">
      <button class="pg-nav" onclick="window._goToPage(1)" ${cur===1?'disabled':''}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
        Page 1
      </button>
      <button class="pg-nav" onclick="window._goToPage(${cur-1})" ${cur===1?'disabled':''}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Previous
      </button>
      <div class="pg-numbers">${pages.map(pgBtn).join('')}</div>
      <button class="pg-nav" onclick="window._goToPage(${cur+1})" ${cur===totalPages?'disabled':''}>
        Next
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <button class="pg-nav" onclick="window._goToPage(${totalPages})" ${cur===totalPages?'disabled':''}>
        Page ${totalPages}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
      </button>
    </div>
    <div class="pg-label">Page ${cur} of ${totalPages}</div>`;
  }
  // Override the module-scoped function by monkey-patching render
  window.__paginationOverride = _newRenderPagination;
})();
