// ── RN Sports Hub — Products v3 (Static + Firebase upgrade)
// This file runs as a regular <script> (not module).
// Static products are available immediately.
// Firebase upgrade happens via inline module script in each HTML page.

// ── Static product data (immediate fallback) ──────────────────────────────────
const products = [
  { id: 1, name: "Real Madrid Home Jersey 24/25", category: "jerseys", type: "fan", brand: "Adidas", price: 699, originalPrice: 999, badge: "HOT", images: ["https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&q=80"], sizes: ["S","M","L","XL","XXL"], team: "Real Madrid", description: "Official fan version Real Madrid home jersey for the 2024/25 season. Breathable fabric, club badge, sponsor logos.", stock: 15, featured: true },
  { id: 2, name: "Barcelona Away Jersey 24/25", category: "jerseys", type: "fan", brand: "Nike", price: 699, originalPrice: 999, badge: "NEW", images: ["https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=600&q=80"], sizes: ["S","M","L","XL","XXL"], team: "Barcelona", description: "Barcelona away kit for 2024/25 season. Premium quality fan version jersey.", stock: 12, featured: true },
  { id: 3, name: "Manchester City Home Jersey", category: "jerseys", type: "player", brand: "Puma", price: 1299, originalPrice: 1799, badge: "PLAYER VERSION", images: ["https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80"], sizes: ["S","M","L","XL"], team: "Manchester City", description: "Player version jersey with Dri-FIT ADV technology. Same as worn on the pitch.", stock: 8, featured: false },
  { id: 4, name: "Nike Mercurial Vapor 15", category: "studs", type: "fg", brand: "Nike", price: 2499, originalPrice: 3499, badge: "BESTSELLER", images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80"], sizes: ["6","7","8","9","10","11"], team: null, description: "Speed boot designed for fast attackers. Lightweight, grippy FG outsole for firm ground.", stock: 6, featured: true },
  { id: 5, name: "Adidas Predator Accuracy.3", category: "studs", type: "fg", brand: "Adidas", price: 1999, originalPrice: 2799, badge: "HOT", images: ["https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80"], sizes: ["6","7","8","9","10","11"], team: null, description: "Control-focused boot with HYBRIDTOUCH upper for precise passing and shooting.", stock: 10, featured: false },
  { id: 6, name: "Argentina Home Jersey 2024", category: "jerseys", type: "fan", brand: "Adidas", price: 799, originalPrice: 1099, badge: "SALE", images: ["https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&q=80"], sizes: ["S","M","L","XL","XXL"], team: "Argentina", description: "2024 Argentina national team home jersey. Celebrate with the world champions.", stock: 20, featured: true },
  { id: 7, name: "Goalkeeper Gloves Pro", category: "gear", type: "accessory", brand: "Adidas", price: 449, originalPrice: 649, badge: "NEW", images: ["https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=600&q=80"], sizes: ["S","M","L","XL"], team: null, description: "Grip-enhanced goalkeeper gloves with finger protection. Suitable for training and matches.", stock: 25, featured: false },
  { id: 8, name: "PSG Home Jersey 24/25", category: "jerseys", type: "fan", brand: "Nike", price: 699, originalPrice: 999, badge: "NEW", images: ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80"], sizes: ["S","M","L","XL","XXL"], team: "PSG", description: "Paris Saint-Germain home jersey for the 2024/25 season.", stock: 18, featured: false },
  { id: 9, name: "Mizuno Morelia Neo III", category: "studs", type: "fg", brand: "Mizuno", price: 3299, originalPrice: 4499, badge: "PREMIUM", images: ["https://images.unsplash.com/photo-1556906781-9a412961a28c?w=600&q=80"], sizes: ["6","7","8","9","10"], team: null, description: "Japanese craftsmanship at its finest. K-leather upper for unmatched touch and comfort.", stock: 4, featured: false },
  { id: 10, name: "Training Football (Size 5)", category: "gear", type: "ball", brand: "Nike", price: 599, originalPrice: 799, badge: "BESTSELLER", images: ["https://images.unsplash.com/photo-1598971861713-54ad16a7e72e?w=600&q=80"], sizes: ["Size 5"], team: null, description: "High-durability match football. 32-panel construction for consistent flight.", stock: 30, featured: true },
  { id: 11, name: "Brazil Home Jersey 2024", category: "jerseys", type: "fan", brand: "Nike", price: 799, originalPrice: 1099, badge: "HOT", images: ["https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&q=80"], sizes: ["S","M","L","XL","XXL"], team: "Brazil", description: "Brazil national team home jersey. The iconic yellow and green.", stock: 22, featured: true },
  { id: 12, name: "Shin Guards Pro Elite", category: "gear", type: "protection", brand: "Adidas", price: 349, originalPrice: 499, badge: "SALE", images: ["https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=600&q=80"], sizes: ["S","M","L"], team: null, description: "Lightweight carbon-fibre shin guards with ankle support. Approved for competitive play.", stock: 40, featured: false }
];

// ── Set static products immediately (zero delay) ──────────────────────────────
window.PRODUCTS = products;

// ── Helper functions ──────────────────────────────────────────────────────────
function getProductById(id) {
  return (window.PRODUCTS || products).find(p => String(p.id) === String(id)) || null;
}

function getFeaturedProducts() {
  return (window.PRODUCTS || products).filter(p => p.featured === true || ['HOT','BESTSELLER','NEW'].includes(p.badge)).slice(0, 8);
}

function getProductsByCategory(cat) {
  const src = window.PRODUCTS || products;
  return cat === 'all' ? src : src.filter(p => p.category === cat);
}

function renderProductCard(product) {
  const imgs = (product.images && product.images.length > 0) ? product.images : [product.image || ''];
  const discount = product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  return `
    <div class="product-card" onclick="window.location='product.html?id=${product.id}'" style="cursor:pointer">
      <div class="product-image-wrap">
        <img src="${imgs[0]}" alt="${product.name}" loading="lazy" onerror="this.src='https://placehold.co/400x400/111/00ff88?text=RN+Sports'">
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

// ── Firebase upgrade: called by inline module script in each HTML page ─────────
// Pages that need live Firebase data include this snippet:
//
//   <script type="module">
//     import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
//     import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
//     import { firebaseConfig } from "./assets/js/firebase-config.js";
//     const app = initializeApp(firebaseConfig);
//     const db  = getFirestore(app);
//     try {
//       const snap = await getDocs(collection(db, "products"));
//       if (!snap.empty) {
//         window.PRODUCTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
//         window.dispatchEvent(new Event("productsLoaded"));
//       }
//     } catch(e) { console.warn("Firebase products load failed:", e.message); }
//   </script>
//
// shop.js and product.js already listen for window.PRODUCTS and retry loading.
