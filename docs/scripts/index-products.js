(function () {
  const sectionHost = document.getElementById('index-category-sections');
  if (!sectionHost) return;
  const CAROUSEL_PAGE_SIZE = 5;

  const CATEGORY_META = [
    { key: 'garden', title: 'From the Garden', subtitle: 'Fresh vegetables and produce' },
    { key: 'orchard', title: 'From the Orchard', subtitle: 'Fresh fruit' },
    { key: 'butcher', title: 'From the Butcher', subtitle: 'Meats' },
    { key: 'dairy', title: 'From the Dairy', subtitle: 'Dairy and eggs' },
    { key: 'pantry', title: 'From the Pantry', subtitle: 'Dry goods and staples' },
    { key: 'tin', title: 'From the Tin', subtitle: 'Canned and tinned goods' },
    { key: 'spice-rack', title: 'From the Spice Rack', subtitle: 'Spices and seasonings' },
    { key: 'shelf', title: 'From the Shelf', subtitle: 'Condiments, oils and sweeteners' }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(value) {
    return `R${Number(value || 0).toFixed(2)}`;
  }

  function setImageError(container) {
    const img = container.querySelector('img');
    if (img) img.remove();
    const label = container.querySelector('.product-card-img-label');
    if (label) label.classList.add('is-hidden');
    const errorLabel = container.querySelector('.product-image-error');
    if (errorLabel) errorLabel.classList.remove('is-hidden');
  }

  function hydrateImages(scope) {
    scope.querySelectorAll('.product-card-img[data-image-url]').forEach(container => {
      const imageUrl = (container.dataset.imageUrl || '').trim();
      const imageAlt = (container.dataset.imageAlt || 'Product image').trim();
      const errorLabel = container.querySelector('.product-image-error');
      if (errorLabel) errorLabel.classList.add('is-hidden');

      if (!imageUrl) {
        setImageError(container);
        return;
      }

      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = imageAlt;
      img.addEventListener('load', () => {
        const label = container.querySelector('.product-card-img-label');
        if (label) label.classList.add('is-hidden');
      });
      img.addEventListener('error', () => setImageError(container));
      container.prepend(img);
    });
  }

  function productCardMarkup(product) {
    const unit = product.unit || `${product.weight || 0}g`;
    return `
      <article class="product-card">
        <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-card-link" aria-label="View ${escapeHtml(product.name)}">
          <div class="product-card-img" data-image-url="${escapeHtml(product.img || '')}" data-image-alt="${escapeHtml(product.name)}">
            ${window.ZDataUtils?.renderDiscountBadge ? window.ZDataUtils.renderDiscountBadge(product) : ''}
            <span class="product-card-img-label">[IMG]</span>
            <span class="product-image-error is-hidden">There's something wrong with this image.</span>
          </div>
          <div class="product-card-body">
            <span class="product-card-name">${escapeHtml(product.name)}</span>
            <span class="product-card-qty">${escapeHtml(unit)}</span>
            ${window.ZDataUtils?.renderPriceMarkup
              ? window.ZDataUtils.renderPriceMarkup(product)
              : `<span class="product-card-price">${formatMoney(product.price)}</span>`}
          </div>
        </a>
        <div class="product-card-actions">
          <button class="btn-order" data-id="${escapeHtml(product.id)}" data-name="${escapeHtml(product.name)}" data-price="${Number(product.price || 0)}" data-unit="${escapeHtml(unit)}">Add to Cart</button>
        </div>
      </article>
    `;
  }

  function chunkProducts(products, size) {
    const pages = [];
    for (let i = 0; i < products.length; i += size) {
      pages.push(products.slice(i, i + size));
    }
    return pages;
  }

  function sectionMarkup(meta, products) {
    if (!products.length) return '';

    const pages = chunkProducts(products, CAROUSEL_PAGE_SIZE);
    const pagesMarkup = pages
      .map((pageProducts, index) => `
        <div class="carousel-page" data-page-index="${index}">
          ${pageProducts.map(productCardMarkup).join('')}
        </div>
      `)
      .join('');

    const singlePageClass = pages.length <= 1 ? ' is-single' : '';

    return `
      <section class="index-category-block">
      <div class="section-header">
        <span class="section-title">${meta.title}</span>
        <div class="section-rule"></div>
      </div>
      <p class="section-subtitle">${meta.subtitle}</p>
      <div class="index-carousel${singlePageClass}" data-carousel>
        <button type="button" class="carousel-nav carousel-nav-prev" aria-label="Previous ${meta.title} products">&#8249;</button>
        <div class="carousel-viewport">
          <div class="carousel-track">
            ${pagesMarkup}
          </div>
        </div>
        <button type="button" class="carousel-nav carousel-nav-next" aria-label="Next ${meta.title} products">&#8250;</button>
      </div>
      </section>
    `;
  }

  function setCarouselPage(carousel, pageIndex) {
    const track = carousel.querySelector('.carousel-track');
    const pages = carousel.querySelectorAll('.carousel-page');
    const prev = carousel.querySelector('.carousel-nav-prev');
    const next = carousel.querySelector('.carousel-nav-next');
    if (!track || !pages.length || !prev || !next) return;

    const maxIndex = pages.length - 1;
    const safeIndex = Math.max(0, Math.min(pageIndex, maxIndex));
    track.style.transform = `translateX(-${safeIndex * 100}%)`;
    carousel.dataset.currentPage = String(safeIndex);
    prev.disabled = safeIndex === 0;
    next.disabled = safeIndex === maxIndex;
  }

  function initCarousels(scope) {
    scope.querySelectorAll('[data-carousel]').forEach(carousel => {
      const pages = carousel.querySelectorAll('.carousel-page');
      if (!pages.length) return;

      setCarouselPage(carousel, 0);

      const prev = carousel.querySelector('.carousel-nav-prev');
      const next = carousel.querySelector('.carousel-nav-next');
      if (!prev || !next) return;

      prev.addEventListener('click', () => {
        const current = Number(carousel.dataset.currentPage || 0);
        setCarouselPage(carousel, current - 1);
      });

      next.addEventListener('click', () => {
        const current = Number(carousel.dataset.currentPage || 0);
        setCarouselPage(carousel, current + 1);
      });
    });
  }

  async function loadProductsData() {
    try {
      if (window.ZAndwichApi?.fetchJson) {
        return await window.ZAndwichApi.fetchJson('products');
      }
      const apiRes = await fetch('http://localhost:3000/api/products');
      if (apiRes.ok) return apiRes.json();
    } catch (_) {
      // Fall back to static JSON below.
    }

    const response = await fetch('scripts/products.JSON');
    if (!response.ok) throw new Error('Failed to load products.');
    return response.json();
  }

  loadProductsData()
    .then(products => {
      const normalizedProducts = products.map(product =>
        window.ZDataUtils?.normalizeProductData ? window.ZDataUtils.normalizeProductData(product) : product
      );

      const byCategory = new Map();
      for (const meta of CATEGORY_META) byCategory.set(meta.key, []);

      for (const product of normalizedProducts) {
        const key = (product.category || '').toLowerCase();
        if (byCategory.has(key)) byCategory.get(key).push(product);
      }

      sectionHost.innerHTML = CATEGORY_META
        .map(meta => sectionMarkup(meta, byCategory.get(meta.key) || []))
        .join('');

      hydrateImages(sectionHost);
      initCarousels(sectionHost);
    })
    .catch(() => {
      sectionHost.innerHTML = '<p class="shop-error">Could not load featured products.</p>';
    });
})();