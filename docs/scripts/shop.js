(function () {
  const DEFAULT_BUDGET_KEY = 'zandwich-default-budget';
  const searchInput   = document.getElementById('market-search');
  const filterButton  = document.getElementById('confirm-filter');
  const filterSummary = document.getElementById('filter-summary');
  const filterSelect  = document.getElementById('market-filter');
  const budgetRange   = document.getElementById('budget-range');
  const budgetValue   = document.getElementById('budget-value');
  const budgetFill    = document.getElementById('budget-fill');
  const container     = document.getElementById('products-container');
  const clearButton   = document.getElementById('clear-filters');
  const specialsOnly  = document.getElementById('specials-only');
  const availableOnly = document.getElementById('available-only');
  const tagContainer  = document.getElementById('tag-filters');

  let allCards = [];
  let allProducts = [];
  let productsLoadState = 'loading'; // 'loading' | 'loaded' | 'error'

  const activeFilters = {
    query: '',
    category: 'all',
    budget: 10000,
    specialsOnly: false,
    availableOnly: false,
    tags: []
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setImageErrorState(containerEl) {
    if (!containerEl) return;
    const img = containerEl.querySelector('img');
    if (img) img.remove();

    const label = containerEl.querySelector('.product-card-img-label');
    if (label) label.classList.add('is-hidden');

    let errorText = containerEl.querySelector('.product-image-error');
    if (!errorText) {
      errorText = document.createElement('span');
      errorText.className = 'product-image-error';
      errorText.textContent = "There's something wrong with this image.";
      containerEl.appendChild(errorText);
    }
    errorText.classList.remove('is-hidden');
  }

  function hydrateCardImage(cardEl) {
    const imageContainer = cardEl.querySelector('.product-card-img[data-image-url]');
    if (!imageContainer) return;

    const imageUrl = (imageContainer.dataset.imageUrl || '').trim();
    const imageAlt = (imageContainer.dataset.imageAlt || 'Product image').trim();
    const label = imageContainer.querySelector('.product-card-img-label');
    const existingError = imageContainer.querySelector('.product-image-error');
    if (existingError) existingError.classList.add('is-hidden');

    if (!imageUrl) {
      setImageErrorState(imageContainer);
      return;
    }

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = imageAlt;

    img.addEventListener('load', () => {
      if (label) label.classList.add('is-hidden');
      const errorText = imageContainer.querySelector('.product-image-error');
      if (errorText) errorText.classList.add('is-hidden');
    });

    img.addEventListener('error', () => {
      setImageErrorState(imageContainer);
    });

    imageContainer.prepend(img);
  }

  /* ── Build a single product card ── */
  function buildCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.setAttribute('data-category', product.category || 'other');
    card.setAttribute('data-price', product.price);
    card.setAttribute('data-special', product.special ? '1' : '0');
    card.setAttribute('data-available', product.available !== false ? '1' : '0');
    card.setAttribute('data-tags', Array.isArray(product.tags) ? product.tags.join('|') : '');

    const available   = product.available !== false;
    const btnLabel    = available ? 'Add to Cart' : 'Coming Soon';
    const btnDisabled = available ? '' : 'disabled';
    const btnClass    = available ? 'btn-order' : 'btn-order btn-order-disabled';

    card.innerHTML = `
      <a href="product.html?id=${encodeURIComponent(product.id)}" class="product-card-link" aria-label="View ${escapeHtml(product.name)}">
        <div class="product-card-img" data-image-url="${escapeHtml(product.img || '')}" data-image-alt="${escapeHtml(product.name || 'Product image')}">
          ${window.ZDataUtils?.renderDiscountBadge ? window.ZDataUtils.renderDiscountBadge(product) : ''}
          <span class="product-card-img-label">[IMG]</span>
          <span class="product-image-error is-hidden">There's something wrong with this image.</span>
        </div>
        <div class="product-card-body">
          <span class="product-card-name">${escapeHtml(product.name)}</span>
          <span class="product-card-qty">${escapeHtml(product.unit || product.weight + 'g')}</span>
          ${window.ZDataUtils?.renderPriceMarkup
            ? window.ZDataUtils.renderPriceMarkup(product)
            : `<span class="product-card-price">R${product.price.toFixed(2)}</span>`}
        </div>
      </a>
      <div class="product-card-actions">
        <button
          class="${btnClass}"
          data-id="${escapeHtml(product.id)}"
          data-name="${escapeHtml(product.name)}"
          data-price="${product.price}"
          data-unit="${escapeHtml(product.unit || product.weight + 'g')}"
          ${btnDisabled}
        >${btnLabel}</button>
        <button
          class="btn-secondary btn-wishlist-product"
          type="button"
          data-id="${escapeHtml(product.id)}"
          data-name="${escapeHtml(product.name)}"
          data-price="${product.price}"
          data-compare-at-price="${Number(product.compareAtPrice || product.originalPrice || 0)}"
          data-special="${product.special ? '1' : '0'}"
          data-image="${escapeHtml(product.img || '')}"
          data-meta="${escapeHtml(product.unit || product.weight + 'g')}"
        >Wishlist</button>
      </div>
    `;

    hydrateCardImage(card);
    return card;
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function buildDynamicFilters(products) {
    allProducts = Array.isArray(products) ? products : [];

    if (filterSelect) {
      const categories = uniqueSorted(allProducts.map(p => p.category || 'other'));
      filterSelect.innerHTML = [
        '<option value="all">All categories</option>',
        ...categories.map(c => `<option value="${c}">${c}</option>`)
      ].join('');
    }

    renderTagFilters();
  }

  function getSelectedTags() {
    if (!tagContainer) return [];
    return Array.from(tagContainer.querySelectorAll('input[type="checkbox"][data-tag]:checked'))
      .map(el => el.dataset.tag)
      .filter(Boolean);
  }

  function computeVisibleTags() {
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const category = filterSelect ? filterSelect.value : 'all';
    const budget = budgetRange ? Number(budgetRange.value) : 10000;
    const onlySpecials = specialsOnly ? Boolean(specialsOnly.checked) : false;
    const onlyAvailable = availableOnly ? Boolean(availableOnly.checked) : false;

    const matches = allProducts.filter(p => {
      const name = (p.name || '').toLowerCase();
      const price = Number(p.price) || 0;
      const matchSearch = !q || name.includes(q);
      const matchCat = category === 'all' || (p.category || 'other') === category;
      const matchBudget = price <= budget;
      const matchSpecial = !onlySpecials || Boolean(p.special);
      const matchAvail = !onlyAvailable || p.available !== false;
      return matchSearch && matchCat && matchBudget && matchSpecial && matchAvail;
    });

    return uniqueSorted(matches.flatMap(p => Array.isArray(p.tags) ? p.tags : []));
  }

  function renderTagFilters() {
    if (!tagContainer) return;

    const selected = new Set(getSelectedTags());
    const tags = computeVisibleTags();

    tagContainer.innerHTML = tags.length
      ? tags.map(tag => `
          <label class="tag-chip">
            <input type="checkbox" data-tag="${tag}" ${selected.has(tag) ? 'checked' : ''}>
            <span>${tag}</span>
          </label>
        `).join('')
      : '<span class="filter-summary">No tag filters for the current search.</span>';
  }

  function clearAllFilters() {
    const preferredBudget = getPreferredBudgetValue();
    if (searchInput) searchInput.value = '';
    if (filterSelect) filterSelect.value = 'all';
    if (budgetRange) {
      budgetRange.value = String(preferredBudget != null ? preferredBudget : (budgetRange.min || 0));
    }
    if (specialsOnly) specialsOnly.checked = false;
    if (availableOnly) availableOnly.checked = false;
    if (tagContainer) {
      tagContainer.querySelectorAll('input[type="checkbox"][data-tag]').forEach(el => { el.checked = false; });
    }

    updateBudgetLabel();
    renderTagFilters();
    applyFilters();
  }

  /* ── Filter logic ── */
  function applyFilters() {
    if (!allCards.length) {
      const msg = productsLoadState === 'error'
        ? 'Failed to load products.'
        : productsLoadState === 'loading'
          ? 'Loading products...'
          : 'No products available.';

      if (filterSummary) filterSummary.textContent = msg;
      const countEl = document.getElementById('results-count');
      if (countEl) countEl.textContent = msg;
      return;
    }

    activeFilters.query         = searchInput  ? searchInput.value.trim().toLowerCase() : '';
    activeFilters.category      = filterSelect ? filterSelect.value : 'all';
    activeFilters.budget        = budgetRange  ? Number(budgetRange.value) : 10000;
    activeFilters.specialsOnly  = specialsOnly ? Boolean(specialsOnly.checked) : false;
    activeFilters.availableOnly = availableOnly ? Boolean(availableOnly.checked) : false;
    activeFilters.tags          = getSelectedTags();

    let visible = 0;
    allCards.forEach(card => {
      const name     = card.querySelector('.product-card-name')?.textContent.toLowerCase() || '';
      const cat      = card.dataset.category;
      const price    = parseFloat(card.dataset.price) || 0;
      const special  = card.dataset.special === '1';
      const available = card.dataset.available === '1';
      const tags     = (card.dataset.tags || '').split('|').filter(Boolean);

      const matchSearch  = !activeFilters.query    || name.includes(activeFilters.query);
      const matchCat     = activeFilters.category === 'all' || cat === activeFilters.category;
      const matchBudget  = price <= activeFilters.budget;
      const matchSpecial = !activeFilters.specialsOnly || special;
      const matchAvail   = !activeFilters.availableOnly || available;
      const matchTags    = !activeFilters.tags.length || activeFilters.tags.every(t => tags.includes(t));

      const show = matchSearch && matchCat && matchBudget && matchSpecial && matchAvail && matchTags;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const msg = visible > 0
      ? `Showing ${visible} item${visible === 1 ? '' : 's'}`
      : 'No items match your filters';

    if (filterSummary) filterSummary.textContent = msg;
    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = msg;
  }

  /* ── Budget bar label ── */
  function getPreferredBudgetValue() {
    if (!budgetRange) return null;
    try {
      const raw = window.localStorage.getItem(DEFAULT_BUDGET_KEY);
      if (!raw) return null;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) return null;
      const min = Number(budgetRange.min || 0);
      const max = Number(budgetRange.max || value);
      return Math.min(max, Math.max(min, value));
    } catch (_) {
      return null;
    }
  }

  function applyPreferredBudgetDefault() {
    if (!budgetRange) return;
    const preferred = getPreferredBudgetValue();
    if (preferred != null) {
      budgetRange.value = String(preferred);
    }
  }

  function applySpecialsPreferenceFromUrl() {
    if (!specialsOnly) return;
    const params = new URLSearchParams(window.location.search);
    const shouldShowSpecials = params.get('specials') === '1' || params.get('specials') === 'true';
    if (shouldShowSpecials) {
      specialsOnly.checked = true;
    }
  }

  function updateBudgetLabel() {
    if (!budgetRange || !budgetValue) return;
    const v = Number(budgetRange.value);
    budgetValue.textContent = v.toLocaleString('en-ZA');
    if (budgetFill) {
      budgetFill.style.width = `${(v / Number(budgetRange.max)) * 100}%`;
    }
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

  /* ── Load products from API/JSON ── */
  loadProductsData()
    .then(products => {
      if (!container) return;
      container.innerHTML = '';

      const normalizedProducts = products.map(product =>
        window.ZDataUtils?.normalizeProductData ? window.ZDataUtils.normalizeProductData(product) : product
      );

      applyPreferredBudgetDefault();
      applySpecialsPreferenceFromUrl();
      buildDynamicFilters(normalizedProducts);
      normalizedProducts.forEach(product => {
        const card = buildCard(product);
        container.appendChild(card);
        allCards.push(card);
      });

      productsLoadState = 'loaded';
      updateBudgetLabel();
      applyFilters();

      // wire cart buttons (cart.js also fires wireCardButtons on DOMContentLoaded,
      // but products load async so we re-wire after they appear)
      if (typeof wireCardButtons === 'function') wireCardButtons();
    })
    .catch(err => {
      productsLoadState = 'error';
      console.error('Failed to load products:', err);
      if (container) {
        container.innerHTML = '<p class="shop-error">Failed to load products. Please refresh.</p>';
      }
      // Keep filter UI in sync with load failures.
      if (filterSummary) filterSummary.textContent = 'Failed to load products.';
      const countEl = document.getElementById('results-count');
      if (countEl) countEl.textContent = 'Failed to load products.';
    });

  /* ── Events ── */
  if (budgetRange) {
    budgetRange.addEventListener('input', () => { updateBudgetLabel(); renderTagFilters(); applyFilters(); });
  }
  if (filterButton) filterButton.addEventListener('click', applyFilters);
  if (searchInput) {
    searchInput.addEventListener('input', () => { renderTagFilters(); applyFilters(); });
    searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); applyFilters(); } });
  }
  if (filterSelect) filterSelect.addEventListener('change', () => { renderTagFilters(); applyFilters(); });
  if (specialsOnly) specialsOnly.addEventListener('change', () => { renderTagFilters(); applyFilters(); });
  if (availableOnly) availableOnly.addEventListener('change', () => { renderTagFilters(); applyFilters(); });
  if (tagContainer) tagContainer.addEventListener('change', applyFilters);
  if (clearButton) clearButton.addEventListener('click', clearAllFilters);
  if (container) {
    container.addEventListener('click', event => {
      const button = event.target.closest('.btn-wishlist-product');
      if (!button) return;

      const added = window.ZWishlist?.addProduct?.({
        id: button.dataset.id,
        name: button.dataset.name,
        price: Number(button.dataset.price || 0),
        compareAtPrice: Number(button.dataset.compareAtPrice || 0),
        special: button.dataset.special === '1',
        image: button.dataset.image || '',
        meta: button.dataset.meta || '',
        href: `product.html?id=${encodeURIComponent(button.dataset.id || '')}`
      });

      if (window.ZWishlist?.showToast) {
        window.ZWishlist.showToast(added ? 'Added to wishlist' : 'Already in wishlist');
      }
    });
  }

  updateBudgetLabel();
})();