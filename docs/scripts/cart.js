(function () {
  const CART_KEY = 'zandwich-cart';
  const ORDER_KEY = 'zandwich-last-order';
  const VAT_RATE = 0.15;
  const DELIVERY_FEE = 45;

  function readJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error(`Could not read ${key}:`, err);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Could not save ${key}:`, err);
    }
  }

  function getCart() {
    const cart = readJSON(CART_KEY, []);
    return Array.isArray(cart) ? cart : [];
  }

  function saveCart(cart) {
    writeJSON(CART_KEY, cart);
    renderAll();
  }

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  function getCartTotal() {
    return getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  function getCheckoutTotal() {
    const cartTotal = getCartTotal();
    if (cartTotal <= 0) return 0;
    return cartTotal + DELIVERY_FEE;
  }

  function getVatBreakdown(totalInclVat) {
    const total = Number(totalInclVat) || 0;
    const subtotal = total / (1 + VAT_RATE);
    const vat = total - subtotal;
    return { subtotal, vat, total };
  }

  function formatMoney(value) {
    return `R${Number(value).toFixed(2)}`;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(date);
  }

  function addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  function flashCartBadge() {
    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.classList.remove('cart-flash');
      void badge.offsetWidth;
      badge.classList.add('cart-flash');
    });
  }

  function ensureToast() {
    let toast = document.getElementById('cart-toast');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'cart-toast';
    toast.className = 'cart-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    return toast;
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = ensureToast();
    toast.textContent = message;
    toast.classList.add('cart-toast-show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('cart-toast-show');
    }, 2200);
  }

  function updateCartBadges() {
    const count = getCartCount();
    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = String(count);
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  function addToCart(item, quantity, options = {}) {
    const qty = Math.max(1, Number(quantity) || 1);
    if (!item?.id || !item?.name) return;

    const cart = getCart();
    const existing = cart.find(entry => entry.id === item.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: qty,
        unit: item.unit || ''
      });
    }

    saveCart(cart);
    flashCartBadge();
    if (!options.silent) {
      showToast(`${item.name} added to cart`);
    }
  }

  function updateQuantity(id, quantity) {
    const cart = getCart();
    const item = cart.find(entry => entry.id === id);
    if (!item) return;

    item.quantity = Math.max(0, Number(quantity) || 0);
    saveCart(cart.filter(entry => entry.quantity > 0));
  }

  function removeFromCart(id) {
    saveCart(getCart().filter(item => item.id !== id));
  }

  function readProductPageQuantity() {
    const input = document.querySelector('.quantity-selector input');
    const quantity = Number(input?.value);
    return Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  }

  function syncProductQuantityInput(input, nextValue) {
    if (!input) return 1;
    const safeValue = Math.max(1, Math.floor(Number(nextValue) || 1));
    input.value = String(safeValue);
    return safeValue;
  }

  function handleDocumentClicks(event) {
    const clearButton = event.target.closest('#cart-clear');
    if (clearButton) {
      saveCart([]);
      showToast('Cart cleared');
      return;
    }

    const qtyButton = event.target.closest('.quantity-selector button');
    if (qtyButton) {
      const selector = qtyButton.closest('.quantity-selector');
      const input = selector?.querySelector('input');
      const delta = qtyButton.textContent.includes('+') ? 1 : -1;
      syncProductQuantityInput(input, (Number(input?.value) || 1) + delta);
      return;
    }

    const cardButton = event.target.closest('.btn-order');
    if (cardButton?.dataset.id && !cardButton.disabled) {
      addToCart({
        id: cardButton.dataset.id,
        name: cardButton.dataset.name,
        price: cardButton.dataset.price,
        unit: cardButton.dataset.unit
      }, 1);
      return;
    }

    const addButton = event.target.closest('.btn-add');
    if (addButton?.dataset.id && !addButton.disabled) {
      addToCart({
        id: addButton.dataset.id,
        name: addButton.dataset.name,
        price: addButton.dataset.price,
        unit: addButton.dataset.unit
      }, readProductPageQuantity());
      return;
    }

    const cartActionButton = event.target.closest('[data-cart-action]');
    if (!cartActionButton) return;

    const id = cartActionButton.dataset.id;
    const action = cartActionButton.dataset.cartAction;
    const quantity = Number(cartActionButton.dataset.quantity);

    if (action === 'increase') {
      updateQuantity(id, quantity + 1);
    } else if (action === 'decrease') {
      updateQuantity(id, quantity - 1);
    } else if (action === 'remove') {
      removeFromCart(id);
    }
  }

  function handleDocumentChanges(event) {
    const input = event.target.closest('.quantity-selector input');
    if (input) syncProductQuantityInput(input, input.value);
  }

  function renderCartPage() {
    const emptyState = document.getElementById('cart-empty');
    const summary = document.getElementById('cart-summary');
    const itemsContainer = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const vatEl = document.getElementById('cart-vat');
    const totalEl = document.getElementById('cart-total');
    if (!emptyState || !summary || !itemsContainer || !subtotalEl || !vatEl || !totalEl) return;

    const cart = getCart();
    if (!cart.length) {
      emptyState.classList.remove('is-hidden');
      summary.classList.add('is-hidden');
      return;
    }

    emptyState.classList.add('is-hidden');
    summary.classList.remove('is-hidden');

    itemsContainer.innerHTML = cart.map(item => `
      <article class="cart-row">
        <div class="cart-row-info">
          <span class="cart-row-name">${item.name}</span>
          <span class="cart-row-meta">${item.unit || 'Market item'} · ${formatMoney(item.price)} each</span>
        </div>
        <div class="cart-row-controls" aria-label="Change quantity">
          <button class="qty-btn" type="button" data-cart-action="decrease" data-id="${item.id}" data-quantity="${item.quantity}">−</button>
          <span class="qty-display">${item.quantity}</span>
          <button class="qty-btn" type="button" data-cart-action="increase" data-id="${item.id}" data-quantity="${item.quantity}">+</button>
        </div>
        <span class="cart-row-subtotal">${formatMoney(item.price * item.quantity)}</span>
        <button class="cart-remove" type="button" aria-label="Remove ${item.name}" data-cart-action="remove" data-id="${item.id}">×</button>
      </article>
    `).join('');

    const breakdown = getVatBreakdown(getCartTotal());
    subtotalEl.textContent = formatMoney(breakdown.subtotal);
    vatEl.textContent = formatMoney(breakdown.vat);
    totalEl.textContent = formatMoney(breakdown.total);
  }

  function renderCheckoutPage() {
    const emptyState = document.getElementById('checkout-empty');
    const form = document.getElementById('checkout-form');
    const itemsContainer = document.getElementById('checkout-items');
    const subtotalEl = document.getElementById('checkout-subtotal');
    const vatEl = document.getElementById('checkout-vat');
    const deliveryEl = document.getElementById('checkout-delivery');
    const totalEl = document.getElementById('checkout-total');
    if (!itemsContainer || !subtotalEl || !vatEl || !deliveryEl || !totalEl) return;

    const cart = getCart();
    if (!cart.length) {
      if (emptyState) emptyState.classList.remove('is-hidden');
      if (form) form.classList.add('is-hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('is-hidden');
    if (form) form.classList.remove('is-hidden');

    itemsContainer.innerHTML = cart.map(item => `
      <div class="checkout-line-item">
        <span>${item.name} × ${item.quantity}</span>
        <span>${formatMoney(item.price * item.quantity)}</span>
      </div>
    `).join('');

    const cartTotal = getCartTotal();
    const breakdown = getVatBreakdown(cartTotal);
    subtotalEl.textContent = formatMoney(breakdown.subtotal);
    vatEl.textContent = formatMoney(breakdown.vat);
    deliveryEl.textContent = formatMoney(cartTotal > 0 ? DELIVERY_FEE : 0);
    totalEl.textContent = formatMoney(getCheckoutTotal());
  }

  function renderConfirmationPage() {
    const details = document.getElementById('confirmation-details');
    const emptyState = document.getElementById('confirmation-empty');
    if (!details || !emptyState) return;

    const order = readJSON(ORDER_KEY, null);
    if (!order) {
      details.classList.add('is-hidden');
      emptyState.classList.remove('is-hidden');
      return;
    }

    emptyState.classList.add('is-hidden');
    details.classList.remove('is-hidden');

    document.getElementById('order-number').textContent = order.number;
    document.getElementById('delivery-date').textContent = order.deliveryEstimate;
    document.getElementById('order-total').textContent = formatMoney(order.total);
    document.getElementById('order-items-count').textContent = String(order.items.reduce((sum, item) => sum + item.quantity, 0));
    document.getElementById('order-customer').textContent = order.customer.name;
    document.getElementById('order-address').textContent = order.customer.address;
  }

  function handleCheckoutSubmit(event) {
    const form = event.target;
    if (!form.matches('#checkout-form')) return;

    event.preventDefault();
    const cart = getCart();
    if (!cart.length) {
      window.location.href = 'cart.html';
      return;
    }

    const formData = new FormData(form);
    const customer = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      notes: String(formData.get('notes') || '').trim()
    };

    const order = {
      number: `ZA-${Date.now().toString().slice(-8)}`,
      placedAt: new Date().toISOString(),
      deliveryEstimate: formatDate(addDays(2)),
      deliveryFee: DELIVERY_FEE,
      total: getCheckoutTotal(),
      items: cart,
      customer
    };

    writeJSON(ORDER_KEY, order);
    saveCart([]);
    window.location.href = 'confirmation.html';
  }

  function renderAll() {
    updateCartBadges();
    renderCartPage();
    renderCheckoutPage();
    renderConfirmationPage();
  }

  document.addEventListener('click', handleDocumentClicks);
  document.addEventListener('change', handleDocumentChanges);
  document.addEventListener('submit', handleCheckoutSubmit);
  window.addEventListener('storage', renderAll);
  document.addEventListener('DOMContentLoaded', renderAll);

  window.wireCardButtons = function () {};
  window.ZAndwichCart = {
    addToCart,
    getCart,
    saveCart,
    showToast,
    updateQuantity,
    removeFromCart,
    getCartCount,
    getCartTotal
  };
})();
