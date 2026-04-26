const CART_KEY = "rn_sports_hub_cart";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
  renderCartSidebar();
}

function addToCart(productId, size, quantity = 1) {
  const product = getProductById(productId);
  if (!product) return;
  const selectedSize = size || (product.sizes && product.sizes[0]) || "Free Size";
  const cart = getCart();
  // Use string IDs consistently to avoid type mismatch bugs
  const id = String(productId);
  const existing = cart.find(item => String(item.id) === id && item.size === selectedSize);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id:       id,
      name:     product.name,
      price:    Number(product.price) || 0,
      image:    (product.images && product.images[0]) || product.image || '',
      size:     selectedSize,
      quantity: quantity,
      category: product.category || ''
    });
  }
  saveCart(cart);
  showCartNotification(product.name);
  openCartSidebar();
}

function removeFromCart(productId, size) {
  const id   = String(productId);
  const cart = getCart().filter(item => !(String(item.id) === id && item.size === size));
  saveCart(cart);
}

function updateQuantity(productId, size, delta) {
  const id   = String(productId);
  const cart = getCart();
  const item = cart.find(item => String(item.id) === id && item.size === size);
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
  renderCartSidebar();
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartCount() {
  const count = getCartCount();
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

function openCartSidebar() {
  const sidebar = document.getElementById("cart-sidebar");
  const overlay = document.getElementById("cart-overlay");
  if (sidebar) sidebar.classList.add("open");
  if (overlay) overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCartSidebar() {
  const sidebar = document.getElementById("cart-sidebar");
  const overlay = document.getElementById("cart-overlay");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("active");
  document.body.style.overflow = "";
}

function renderCartSidebar() {
  const container = document.getElementById("cart-items-list");
  const totalEl   = document.getElementById("cart-total-price");
  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p>Your cart is empty</p>
        <a href="shop.html" onclick="closeCartSidebar()" class="btn-shop-now">Browse Products</a>
      </div>`;
    if (totalEl) totalEl.textContent = "₹0";
    return;
  }

  container.innerHTML = cart.map(item => {
    // Escape quotes in name/size for use in onclick attributes
    const eid  = String(item.id).replace(/'/g, "\\'");
    const esz  = (item.size || '').replace(/'/g, "\\'");
    const img  = item.image || 'https://placehold.co/80x80/111/00ff88?text=RN';
    return `
    <div class="cart-item">
      <img src="${img}" alt="${item.name}"
        onerror="this.src='https://placehold.co/80x80/111/00ff88?text=RN'">
      <div class="cart-item-details">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-size">Size: ${item.size}</p>
        <div class="cart-item-qty">
          <button onclick="updateQuantity('${eid}','${esz}',-1)">−</button>
          <span>${item.quantity}</span>
          <button onclick="updateQuantity('${eid}','${esz}',1)">+</button>
        </div>
        <p class="cart-item-price">₹${(Number(item.price) * item.quantity).toLocaleString("en-IN")}</p>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${eid}','${esz}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>`; }).join("");

  if (totalEl) totalEl.textContent = `₹${getCartTotal().toLocaleString("en-IN")}`;
}

function showCartNotification(name) {
  const existing = document.querySelector(".cart-notification");
  if (existing) existing.remove();
  const notif = document.createElement("div");
  notif.className = "cart-notification";
  notif.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00ff88" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <span>${name.length > 30 ? name.slice(0, 30) + "…" : name} added!</span>`;
  document.body.appendChild(notif);
  setTimeout(() => notif.classList.add("show"), 10);
  setTimeout(() => {
    notif.classList.remove("show");
    setTimeout(() => notif.remove(), 400);
  }, 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  renderCartSidebar();
  const overlay = document.getElementById("cart-overlay");
  if (overlay) overlay.addEventListener("click", closeCartSidebar);
});
