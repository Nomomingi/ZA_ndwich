/* product.js — loads product data from URL param, populates product.html */
(function () {

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setImageErrorState(container) {
    if (!container) return;
    const img = container.querySelector('img');
    if (img) img.remove();
    const label = container.querySelector('.product-card-img-label');
    if (label) label.classList.add('is-hidden');

    let errorText = container.querySelector('.product-image-error');
    if (!errorText) {
      errorText = document.createElement('span');
      errorText.className = 'product-image-error';
      errorText.textContent = "There's something wrong with this image.";
      container.appendChild(errorText);
    }
    errorText.classList.remove('is-hidden');
  }

  function hydrateImageContainers(scope) {
    if (!scope) return;
    const containers = scope.querySelectorAll('.product-card-img[data-image-url]');

    containers.forEach(container => {
      const imageUrl = (container.dataset.imageUrl || '').trim();
      const imageAlt = (container.dataset.imageAlt || 'Product image').trim();
      const label = container.querySelector('.product-card-img-label');
      const existingError = container.querySelector('.product-image-error');
      if (existingError) existingError.classList.add('is-hidden');

      if (!imageUrl) {
        setImageErrorState(container);
        return;
      }

      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = imageAlt;

      img.addEventListener('load', () => {
        if (label) label.classList.add('is-hidden');
        const errorText = container.querySelector('.product-image-error');
        if (errorText) errorText.classList.add('is-hidden');
      });

      img.addEventListener('error', () => {
        setImageErrorState(container);
      });

      container.prepend(img);
    });
  }

  function buildCardImageMarkup(product) {
    return `
      <div class="product-card-img" data-image-url="${escapeHtml(product.img || '')}" data-image-alt="${escapeHtml(product.name || 'Product image')}">
        ${window.ZDataUtils?.renderDiscountBadge ? window.ZDataUtils.renderDiscountBadge(product) : ''}
        <span class="product-card-img-label">[IMG]</span>
        <span class="product-image-error is-hidden">There's something wrong with this image.</span>
      </div>
    `;
  }

  function renderPriceMarkup(product) {
    if (window.ZDataUtils?.renderPriceMarkup) {
      return window.ZDataUtils.renderPriceMarkup(product);
    }
    return `<span class="product-card-price">R${Number(product.price || 0).toFixed(2)}</span>`;
  }

  function getManufacturerInfo(product) {
    const name = String(product.manufacturerName || '').trim();
    const description = String(product.manufacturerDescription || '').trim();
    const sourceCategory = String(product.sourceCategory || '').trim();

    if (name && description) {
      const categorySuffix = sourceCategory ? ` - ${sourceCategory}` : '';
      return {
        title: `Manufacturer Information: ${name}${categorySuffix}`,
        copy: description
      };
    }

    return {
      title: 'Manufacturer Information',
      copy: 'Manufacturer details are being prepared for this product.'
    };
  }

  function getIdFromURL() {
    return new URLSearchParams(window.location.search).get('id');
  }

  async function loadProducts() {
    // product.html lives in docs/, JSON lives in docs/scripts/
    // API first, file fallback for local demos.
    try {
      if (window.ZAndwichApi?.fetchJson) {
        return await window.ZAndwichApi.fetchJson('products');
      }
      const apiRes = await fetch('http://localhost:3000/api/products');
      if (apiRes.ok) return apiRes.json();
    } catch (_) {
      // Fall back to static JSON below.
    }

    const res = await fetch('scripts/products.JSON');
    if (!res.ok) throw new Error('Could not load products data.');
    return res.json();
  }

  function renderRelatedProducts(allProducts, current) {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    const currentTags = current.tags || [];
    const related = allProducts
      .filter(p => p.id !== current.id)
      .map(p => {
        const tags = p.tags || [];
        const overlap = tags.filter(t => currentTags.includes(t));
        return { product: p, score: overlap.length };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
      .slice(0, 3)
      .map(entry => entry.product);

    if (!related.length) {
      grid.innerHTML = '<p class="shop-error">No related products found.</p>';
      return;
    }

    grid.innerHTML = related.map(p => `
      <article class="product-card">
        <a href="product.html?id=${encodeURIComponent(p.id)}" class="product-card-link" aria-label="View ${p.name}">
          ${buildCardImageMarkup(p)}
          <div class="product-card-body">
            <span class="product-card-name">${p.name}</span>
            <span class="product-card-qty">${p.unit || p.weight + 'g'}</span>
            ${renderPriceMarkup(p)}
          </div>
        </a>
        <div class="product-card-actions">
          <button
            class="btn-order"
            data-id="${p.id}"
            data-name="${p.name}"
            data-price="${p.price}"
            data-unit="${p.unit || p.weight + 'g'}"
          >Add</button>
        </div>
      </article>
    `).join('');

    hydrateImageContainers(grid);
  }

  function populate(product) {
    /* page title */
    document.title = `${product.name} — ZAndwich`;

    /* navigation-bar title */
    const navigationBarTitle = document.querySelector('.navigation-bar-title');
    if (navigationBarTitle) navigationBarTitle.textContent = product.name;

    /* hero card */
    const nameEl  = document.querySelector('.product-card-name');
    const qtyEl   = document.querySelector('.product-card-qty');
    const priceEl = document.querySelector('.product-card-price');
    const copyEl  = document.querySelector('.product-card-copy');
    if (nameEl)  nameEl.textContent  = product.name;
    if (qtyEl)   qtyEl.textContent   = product.unit || `${product.weight}g`;
    if (priceEl) {
      const priceMarkup = window.ZDataUtils?.renderPriceMarkup
        ? window.ZDataUtils.renderPriceMarkup(product, 'product-card-price-hero')
        : `<span class="product-card-price product-card-price-hero">R${product.price.toFixed(2)}</span>`;
      priceEl.outerHTML = priceMarkup;
    }
    if (copyEl)  copyEl.textContent  = product.description;

    const heroImage = document.querySelector('.product-hero-card .product-card-img');
    if (heroImage) {
      heroImage.dataset.imageUrl = product.img || '';
      heroImage.dataset.imageAlt = product.name || 'Product image';
      heroImage.innerHTML = `
        ${window.ZDataUtils?.renderDiscountBadge ? window.ZDataUtils.renderDiscountBadge(product) : ''}
        <span class="product-card-img-label">[IMG]</span>
        <span class="product-image-error is-hidden">There's something wrong with this image.</span>
      `;
      hydrateImageContainers(heroImage.parentElement || document);
    }

    /* detail panel */
    const heading  = document.querySelector('.product-detail-heading');
    const detCopy  = document.querySelector('.product-detail-copy');
    const stockEl  = document.querySelector('.product-hero-meta span:first-child');
    const deliveryEl = document.querySelector('.product-hero-meta span:nth-child(2)');
    const sourceEl = document.querySelector('.product-hero-meta span:nth-child(3)');
    if (heading)  heading.textContent  = product.name;
    if (detCopy)  detCopy.textContent  = product.description;
    if (stockEl) {
      stockEl.textContent  = product.available ? 'In stock' : 'Out of stock';
      stockEl.style.color  = product.available ? '#2e7d32' : '#c62828';
    }
    if (deliveryEl) deliveryEl.textContent = product.sameDayDelivery ? 'Same-day delivery' : 'Standard delivery';
    if (sourceEl) {
      const sourceCategory = product.sourceCategory ? ` - ${product.sourceCategory}` : '';
      sourceEl.textContent = product.manufacturerName
        ? `${product.manufacturerName}${sourceCategory}`
        : 'Source pending';
    }

    /* specs */
    const specsList = document.querySelector('.product-specs');
    if (specsList) {
      const compareAtPrice = Number(product.compareAtPrice || product.originalPrice || 0);
      const hasDiscount = compareAtPrice > Number(product.price || 0);
      specsList.innerHTML = `
        <li><strong>Size:</strong> ${product.unit || product.weight + 'g'}</li>
        <li><strong>Price:</strong> ${hasDiscount ? `R${product.price.toFixed(2)} (Was R${compareAtPrice.toFixed(2)})` : `R${product.price.toFixed(2)}`}</li>
        <li><strong>Availability:</strong> ${product.available ? 'In Stock' : 'Out of Stock'}</li>
        <li><strong>Same-day delivery:</strong> ${product.sameDayDelivery ? 'Yes' : 'No'}</li>
        <li><strong>Source category:</strong> ${product.sourceCategory || 'other'}</li>
        <li><strong>Manufacturer:</strong> ${product.manufacturerName || 'Not assigned'}</li>
        ${product.tags ? `<li><strong>Tags:</strong> ${product.tags.join(', ')}</li>` : ''}
      `;
    }

    const manufacturerTitle = document.getElementById('manufacturer-info-title');
    const manufacturerCopy = document.getElementById('manufacturer-info-copy');
    const manufacturerInfo = getManufacturerInfo(product);
    if (manufacturerTitle) manufacturerTitle.textContent = manufacturerInfo.title;
    if (manufacturerCopy) manufacturerCopy.textContent = manufacturerInfo.copy;

    /* wire the Add to Basket button with product data */
    const addBtn = document.querySelector('.btn-add');
    if (addBtn) {
      addBtn.dataset.id    = product.id;
      addBtn.dataset.name  = product.name;
      addBtn.dataset.price = product.price;
      addBtn.dataset.unit  = product.unit || `${product.weight}g`;
    }

    const wishlistBtn = document.querySelector('.btn-wishlist-detail');
    if (wishlistBtn) {
      wishlistBtn.onclick = () => {
        const added = window.ZWishlist?.addProduct?.({
          id: product.id,
          name: product.name,
          price: Number(product.price || 0),
          compareAtPrice: Number(product.compareAtPrice || product.originalPrice || 0),
          special: Boolean(product.special),
          image: product.img || '',
          meta: product.unit || `${product.weight}g`,
          href: `product.html?id=${encodeURIComponent(product.id)}`
        });
        if (window.ZWishlist?.showToast) {
          window.ZWishlist.showToast(added ? 'Added to wishlist' : 'Already in wishlist');
        }
      };
    }

    const detailNote = document.querySelector('.product-detail-note');
    if (detailNote) {
      detailNote.textContent = product.special
        ? 'Featured market price while stocks last.'
        : 'Market pricing updates with stock and seasonality.';
    }

    /* pass full product context to recipe loader */
    if (typeof window.loadRecipesForProduct === 'function') {
      window.loadRecipesForProduct(product);
    } else if (typeof window.loadRecipes === 'function') {
      window.loadRecipes(product.mealdbIngredient || product.name);
    }
  }

  function showError(msg) {
    const grid = document.querySelector('.product-shop-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="product-not-found">
          <h2>${msg}</h2>
          <p>We could not find that product in our market.</p>
          <a href="shop.html" class="btn-primary">Back to Shop</a>
        </div>
      `;
    }
  }

  async function init() {
    const id = getIdFromURL();
    if (!id) { showError('No product specified'); return; }

    try {
      const products = (await loadProducts()).map(p =>
        window.ZDataUtils?.normalizeProductData ? window.ZDataUtils.normalizeProductData(p) : p
      );
      const product  = products.find(p => p.id === decodeURIComponent(id));
      if (product) {
        populate(product);
        renderRelatedProducts(products, product);
      } else {
        showError(`"${decodeURIComponent(id)}" not found`);
      }
    } catch (err) {
      console.error(err);
      showError('Could not load product data.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();