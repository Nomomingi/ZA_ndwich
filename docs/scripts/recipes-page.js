(function () {
  const DEFAULT_BUDGET_KEY = 'zandwich-default-budget';

  const searchInput = document.getElementById('recipe-search');
  const sortSelect = document.getElementById('recipe-sort');
  const countrySelect = document.getElementById('recipe-country');
  const budgetRange = document.getElementById('recipe-budget-range');
  const budgetValue = document.getElementById('recipe-budget-value');
  const budgetFill = document.getElementById('recipe-budget-fill');
  const budgetScale = document.querySelector('.budget-scale');
  const resultsCount = document.getElementById('recipe-results-count');
  const recipeContainer = document.getElementById('recipes-container');
  const clearButton = document.getElementById('clear-recipe-filters');

  if (!recipeContainer) return;

  let recipes = [];
  let products = [];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function loadRecipes() {
    try {
      if (window.ZAndwichApi?.fetchJson) return await window.ZAndwichApi.fetchJson('recipes');
      const apiRes = await fetch('http://localhost:3000/api/recipes');
      if (apiRes.ok) return apiRes.json();
    } catch (_) {
      // Fall through to static file.
    }

    const response = await fetch('scripts/true_final_recipes.json');
    if (!response.ok) throw new Error('Unable to load recipes.');
    return response.json();
  }

  async function loadProducts() {
    try {
      if (window.ZAndwichApi?.fetchJson) return await window.ZAndwichApi.fetchJson('products');
      const apiRes = await fetch('http://localhost:3000/api/products');
      if (apiRes.ok) return apiRes.json();
    } catch (_) {
      // Fall through to static file.
    }

    const response = await fetch('scripts/products.JSON');
    if (!response.ok) throw new Error('Unable to load product data.');
    return response.json();
  }

  function updateBudgetLabel() {
    if (!budgetRange || !budgetValue) return;
    const value = Number(budgetRange.value || 0);
    budgetValue.textContent = value.toFixed(2);
    if (budgetFill) {
      budgetFill.style.width = `${(value / Number(budgetRange.max || 1)) * 100}%`;
    }
  }

  function updateBudgetScale() {
    if (!budgetScale || !budgetRange) return;
    const max = Number(budgetRange.max || 0);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(fraction => `R${Math.round(max * fraction)}`);
    budgetScale.innerHTML = ticks.map(value => `<span>${value}</span>`).join('');
  }

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

  function buildCountryOptions(items) {
    if (!countrySelect) return;
    const areas = Array.from(new Set(
      items.map(item => String(item.area || '').trim()).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));

    countrySelect.innerHTML = [
      '<option value="all">All countries</option>',
      ...areas.map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`)
    ].join('');
  }

  function getRecipeCost(recipe) {
    const explicit = Number(recipe.estimatedCost || recipe.estimated_cost || 0);
    if (explicit > 0) {
      return Number(explicit.toFixed(2));
    }
    if (window.ZDataUtils?.estimateRecipeCost) {
      return Number(window.ZDataUtils.estimateRecipeCost(recipe, products).toFixed(2));
    }
    return 0;
  }

  function recipeCard(recipe, estimatedCost, productsList, orderIndex) {
    const title = escapeHtml(recipe.name || 'Recipe');
    const area = escapeHtml(recipe.area || 'Unknown');
    const category = escapeHtml(recipe.category || 'Recipe');
    const image = escapeHtml(recipe.image || '');
    const cost = window.ZDataUtils?.formatMoney
      ? window.ZDataUtils.formatMoney(estimatedCost)
      : `R${estimatedCost.toFixed(2)}`;

    let ingredientsSummary = '';
    if (Array.isArray(productsList) && productsList.length > 0 && window.ZDataUtils?.buildIngredientMatches) {
      const matches = window.ZDataUtils.buildIngredientMatches(recipe, productsList);
      const availableCount = matches.available.length;
      const totalCount = matches.available.length + matches.unavailable.length;
      if (totalCount > 0) {
        ingredientsSummary = `<span class="recipe-ingredients-available">${availableCount} of ${totalCount} ingredients available</span>`;
      }
    }

    return `
      <article class="product-card" data-cost="${estimatedCost}" data-order="${orderIndex}" data-country="${area.toLowerCase()}" data-name="${title.toLowerCase()}" data-category="${category.toLowerCase()}">
        <a href="recipe.html?id=${encodeURIComponent(recipe.id)}" class="product-card-link" aria-label="View ${title}">
          <div class="product-card-img">
            ${image ? `<img src="${image}" alt="${title}">` : '<span class="product-card-img-label">[RECIPE]</span>'}
          </div>
          <div class="product-card-body">
            <span class="product-card-name">${title}</span>
            <span class="product-card-qty">${category} · ${area}</span>
            ${ingredientsSummary}
            <span class="product-card-price">${cost}</span>
          </div>
        </a>
        <div class="product-card-actions">
          <button
            class="btn-filter btn-recipe-add-cart"
            type="button"
            data-id="${escapeHtml(recipe.id || '')}"
            data-name="${title}"
            data-ingredients='${JSON.stringify(recipe.ingredients || [])}'
            data-products='${JSON.stringify(productsList || [])}'
          >Add to Cart</button>
          <button
            class="btn-secondary btn-wishlist-recipe"
            type="button"
            data-id="${escapeHtml(recipe.id || '')}"
            data-name="${title}"
            data-image="${image}"
            data-meta="${category} · ${area}"
            data-cost="${estimatedCost}"
          >Wishlist</button>
        </div>
      </article>
    `;
  }

  function applyFilters() {
    const query = String(searchInput?.value || '').trim().toLowerCase();
    const sortMode = String(sortSelect?.value || 'default').toLowerCase();
    const country = String(countrySelect?.value || 'all').toLowerCase();
    const maxCost = Number(budgetRange?.value || 9999);

    const cards = Array.from(recipeContainer.querySelectorAll('.product-card'));
    const visibleCards = [];
    const hiddenCards = [];
    let shown = 0;

    cards.forEach(card => {
      const name = card.dataset.name || '';
      const cardCountry = card.dataset.country || '';
      const cardCost = Number(card.dataset.cost || 0);

      const matchQuery = !query || name.includes(query);
      const matchCountry = country === 'all' || cardCountry === country;
      const matchCost = cardCost <= maxCost;

      const show = matchQuery && matchCountry && matchCost;
      card.style.display = show ? '' : 'none';
      if (show) {
        shown += 1;
        visibleCards.push(card);
      } else {
        hiddenCards.push(card);
      }
    });

    visibleCards.sort((a, b) => {
      const costDiff = Number(b.dataset.cost || 0) - Number(a.dataset.cost || 0);
      const reverseCostDiff = Number(a.dataset.cost || 0) - Number(b.dataset.cost || 0);
      const orderDiff = Number(a.dataset.order || 0) - Number(b.dataset.order || 0);

      if (sortMode === 'expensive') {
        return costDiff !== 0 ? costDiff : orderDiff;
      }

      if (sortMode === 'cheap') {
        return reverseCostDiff !== 0 ? reverseCostDiff : orderDiff;
      }

      return orderDiff;
    });

    hiddenCards.sort((a, b) => Number(a.dataset.order || 0) - Number(b.dataset.order || 0));
    [...visibleCards, ...hiddenCards].forEach(card => recipeContainer.appendChild(card));

    if (resultsCount) {
      resultsCount.textContent = shown
        ? `Showing ${shown} recipe${shown === 1 ? '' : 's'}`
        : 'No recipes match your filters';
    }
  }

  function clearFilters() {
    const preferredBudget = getPreferredBudgetValue();
    if (searchInput) searchInput.value = '';
    if (sortSelect) sortSelect.value = 'default';
    if (countrySelect) countrySelect.value = 'all';
    if (budgetRange) budgetRange.value = String(preferredBudget != null ? preferredBudget : (budgetRange.max || '1200'));
    updateBudgetLabel();
    applyFilters();
  }

  async function init() {
    try {
      const [recipeData, productData] = await Promise.all([loadRecipes(), loadProducts()]);
      recipes = Array.isArray(recipeData) ? recipeData : [];
      products = Array.isArray(productData)
        ? productData.map(item => (window.ZDataUtils?.normalizeProductData ? window.ZDataUtils.normalizeProductData(item) : item))
        : [];

      buildCountryOptions(recipes);

      const cards = recipes.map((recipe, index) => {
        const estimatedCost = getRecipeCost(recipe);
        return recipeCard(recipe, estimatedCost, products, index);
      });

      recipeContainer.innerHTML = cards.join('');
      applyPreferredBudgetDefault();
      updateBudgetScale();
      updateBudgetLabel();
      applyFilters();
    } catch (error) {
      console.error(error);
      recipeContainer.innerHTML = '<p class="shop-error">Could not load recipes.</p>';
      if (resultsCount) resultsCount.textContent = 'Failed to load recipes';
    }
  }

  searchInput?.addEventListener('input', applyFilters);
  sortSelect?.addEventListener('change', applyFilters);
  countrySelect?.addEventListener('change', applyFilters);
  budgetRange?.addEventListener('input', () => {
    updateBudgetLabel();
    applyFilters();
  });
  recipeContainer?.addEventListener('click', event => {
    const wishlistButton = event.target.closest('.btn-wishlist-recipe');
    const addCartButton = event.target.closest('.btn-recipe-add-cart');

    if (wishlistButton) {
      const added = window.ZWishlist?.addRecipe?.({
        id: wishlistButton.dataset.id,
        name: wishlistButton.dataset.name,
        price: Number(wishlistButton.dataset.cost || 0),
        image: wishlistButton.dataset.image || '',
        meta: wishlistButton.dataset.meta || '',
        href: `recipe.html?id=${encodeURIComponent(wishlistButton.dataset.id || '')}`
      });

      if (window.ZWishlist?.showToast) {
        window.ZWishlist.showToast(added ? 'Recipe added to wishlist' : 'Recipe already in wishlist');
      }
    }

    if (addCartButton) {
      const ingredients = JSON.parse(addCartButton.dataset.ingredients || '[]');
      const productsList = JSON.parse(addCartButton.dataset.products || '[]');

      if (ingredients.length === 0 || productsList.length === 0) return;

      let addedCount = 0;
      ingredients.forEach(ingredient => {
        const product = window.ZDataUtils?.findBestProductForIngredient
          ? window.ZDataUtils.findBestProductForIngredient(ingredient.name, productsList)
          : productsList.find(p => String(p.name).toLowerCase().includes(String(ingredient.name).toLowerCase()));

        if (product && product.available !== false) {
          window.ZAndwichCart?.addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            unit: product.unit || `${product.weight || ''}g`
          }, 1, { silent: true });
          addedCount++;
        }
      });

      if (window.ZAndwichCart?.showToast && addedCount > 0) {
        window.ZAndwichCart.showToast(`Added ${addedCount} ingredient${addedCount === 1 ? '' : 's'} to cart`);
      }
    }
  });
  clearButton?.addEventListener('click', clearFilters);

  init();
})();
