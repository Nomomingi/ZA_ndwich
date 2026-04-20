(function () {
  const productsContainer = document.getElementById('wishlist-products');
  const recipesContainer = document.getElementById('wishlist-recipes');

  if (!productsContainer || !recipesContainer) return;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderList(type, items, container) {
    if (!items.length) {
      container.innerHTML = '<p class="wishlist-empty">Nothing saved yet.</p>';
      return;
    }

    container.innerHTML = items.map(item => {
      const image = item.image
        ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">`
        : '<span class="product-card-img-label">[ITEM]</span>';
      const pricingProduct = {
        price: Number(item.price) || 0,
        compareAtPrice: Number(item.compareAtPrice || item.originalPrice || 0),
        special: Boolean(item.special)
      };
      const priceMarkup = Number(item.price) > 0
        ? (window.ZDataUtils?.renderPriceMarkup
          ? window.ZDataUtils.renderPriceMarkup(pricingProduct)
          : `<span class="product-card-price">R${Number(item.price).toFixed(2)}</span>`)
        : '';
      const discountBadge = type === 'products' && window.ZDataUtils?.renderDiscountBadge
        ? window.ZDataUtils.renderDiscountBadge(pricingProduct)
        : '';

      return `
        <article
          class="wishlist-card"
          data-type="${type}"
          data-id="${escapeHtml(item.id)}"
          data-name="${escapeHtml(item.name)}"
          data-price="${Number(item.price) || 0}"
          data-meta="${escapeHtml(item.meta || '')}"
        >
          <a href="${escapeHtml(item.href || '#')}" class="product-card-link" aria-label="View ${escapeHtml(item.name)}">
            <div class="product-card-img">
              ${discountBadge}
              ${image}
            </div>
            <div class="product-card-body">
              <span class="product-card-name">${escapeHtml(item.name)}</span>
              <span class="product-card-qty">${escapeHtml(item.meta || '')}</span>
              ${priceMarkup}
            </div>
          </a>
          <div class="wishlist-actions">
            <button class="btn-filter btn-wishlist-add" type="button">Add to Cart</button>
            <button class="btn-filter btn-wishlist-remove" type="button">Remove</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function render() {
    const wishlist = window.ZWishlist?.read ? window.ZWishlist.read() : { products: [], recipes: [] };
    renderList('products', wishlist.products, productsContainer);
    renderList('recipes', wishlist.recipes, recipesContainer);
  }

  function onClick(event) {
    const addButton = event.target.closest('.btn-wishlist-add');
    if (addButton) {
      const card = addButton.closest('.wishlist-card');
      if (!card) return;

      const type = card.dataset.type;
      const id = String(card.dataset.id || '');
      const name = String(card.dataset.name || 'Wishlist item');
      const price = Number(card.dataset.price || 0);
      const unit = String(card.dataset.meta || 'Wishlist');

      if (window.ZAndwichCart?.addToCart) {
        const cartId = type === 'recipes' ? `recipe:${id}` : id;
        const cartName = type === 'recipes' ? `Recipe: ${name}` : name;
        window.ZAndwichCart.addToCart({
          id: cartId,
          name: cartName,
          price,
          unit
        }, 1);
      } else if (window.ZWishlist?.showToast) {
        window.ZWishlist.showToast('Cart is unavailable right now');
      }
      return;
    }

    const button = event.target.closest('.btn-wishlist-remove');
    if (!button) return;

    const card = button.closest('.wishlist-card');
    if (!card) return;

    const type = card.dataset.type;
    const id = card.dataset.id;
    if (type === 'recipes') {
      window.ZWishlist?.removeRecipe?.(id);
    } else {
      window.ZWishlist?.removeProduct?.(id);
    }

    render();
  }

  productsContainer.addEventListener('click', onClick);
  recipesContainer.addEventListener('click', onClick);
  render();
})();
