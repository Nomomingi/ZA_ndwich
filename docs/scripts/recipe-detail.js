(function () {

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getRecipeId() {
    return new URLSearchParams(window.location.search).get('id');
  }

  async function loadRecipes() {
    try {
      if (window.ZAndwichApi?.fetchJson) return await window.ZAndwichApi.fetchJson('recipes');
      const apiRes = await fetch('http://localhost:3000/api/recipes');
      if (apiRes.ok) return apiRes.json();
    } catch (_) {}

    const response = await fetch('scripts/true_final_recipes.json');
    if (!response.ok) throw new Error('Unable to load recipes.');
    return response.json();
  }

  async function loadProducts() {
    try {
      if (window.ZAndwichApi?.fetchJson) return await window.ZAndwichApi.fetchJson('products');
      const apiRes = await fetch('http://localhost:3000/api/products');
      if (apiRes.ok) return apiRes.json();
    } catch (_) {}

    const response = await fetch('scripts/products.JSON');
    if (!response.ok) throw new Error('Unable to load products.');
    return response.json();
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

  function hydrateImage(container, imageUrl, imageAlt) {
    if (!container) return;
    const label = container.querySelector('.product-card-img-label');

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

    img.addEventListener('error', () => setImageErrorState(container));
    container.prepend(img);
  }

  function showError(message) {
    const grid = document.querySelector('.product-shop-grid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="product-not-found">
        <h2>${escapeHtml(message)}</h2>
        <p>We could not find that recipe in our kitchen desk.</p>
        <a href="recipes.html" class="btn-primary">Back to Recipes</a>
      </div>
    `;
  }

  function getYouTubeVideoId(url) {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      if (host.includes('youtu.be')) {
        const idFromPath = parsed.pathname.replace(/^\//, '').split('/')[0];
        return idFromPath || null;
      }

      if (host.includes('youtube.com')) {
        const fromQuery = parsed.searchParams.get('v');
        if (fromQuery) return fromQuery;

        const pathParts = parsed.pathname.split('/').filter(Boolean);
        const embedIndex = pathParts.indexOf('embed');
        if (embedIndex !== -1 && pathParts[embedIndex + 1]) {
          return pathParts[embedIndex + 1];
        }

        const shortsIndex = pathParts.indexOf('shorts');
        if (shortsIndex !== -1 && pathParts[shortsIndex + 1]) {
          return pathParts[shortsIndex + 1];
        }
      }
    } catch (_) {
      return null;
    }

    return null;
  }

  function renderRecipeVideo(recipe) {
    const panel = document.getElementById('recipe-video-panel');
    const frame = document.getElementById('recipe-video-frame');
    const link = document.getElementById('recipe-video-link');
    const empty = document.getElementById('recipe-video-empty');
    if (!panel || !frame || !link || !empty) return;

    const id = getYouTubeVideoId(recipe.youtube);
    if (!id) {
      panel.classList.remove('is-hidden');
      frame.src = '';
      frame.classList.add('is-hidden');
      link.href = '#';
      link.classList.add('is-hidden');
      empty.textContent = 'Video unavailable :(';
      empty.classList.remove('is-hidden');
      return;
    }

    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    const embedUrl = `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0`;

    frame.src = embedUrl;
    frame.classList.remove('is-hidden');
    link.href = watchUrl;
    link.classList.remove('is-hidden');
    empty.classList.add('is-hidden');
    panel.classList.remove('is-hidden');
  }

  function renderRelated(recipes, currentId, products) {
    const container = document.getElementById('related-recipes');
    if (!container) return;

    const related = recipes.filter(r => String(r.id) !== String(currentId)).slice(0, 3);
    if (!related.length) {
      container.innerHTML = '<p class="shop-error">No related recipes found.</p>';
      return;
    }

    container.innerHTML = related.map(recipe => {
      const cost = Number(recipe.estimatedCost || recipe.estimated_cost || 0);
      const costLabel = window.ZDataUtils?.formatMoney ? window.ZDataUtils.formatMoney(cost) : `R${cost.toFixed(2)}`;
      
      let ingredientsSummary = '';
      if (Array.isArray(products) && products.length > 0 && window.ZDataUtils?.buildIngredientMatches) {
        const matches = window.ZDataUtils.buildIngredientMatches(recipe, products);
        const availableCount = matches.available.length;
        const totalCount = matches.available.length + matches.unavailable.length;
        if (totalCount > 0) {
          ingredientsSummary = `<span class="recipe-ingredients-available">${availableCount} of ${totalCount} ingredients available</span>`;
        }
      }
      
      return `
        <article class="product-card">
          <a href="recipe.html?id=${encodeURIComponent(recipe.id)}" class="product-card-link" aria-label="View ${escapeHtml(recipe.name)}">
            <div class="product-card-img">
              ${recipe.image ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.name)}">` : '<span class="product-card-img-label">[RECIPE]</span>'}
            </div>
            <div class="product-card-body">
              <span class="product-card-name">${escapeHtml(recipe.name)}</span>
              <span class="product-card-qty">${escapeHtml(recipe.category || 'Recipe')} · ${escapeHtml(recipe.area || 'Unknown')}</span>
              ${ingredientsSummary}
              <span class="product-card-price">${costLabel}</span>
            </div>
          </a>
        </article>
      `;
    }).join('');
  }

  function renderIngredientAvailability(recipe, products) {
    const summaryEl = document.getElementById('recipe-availability-summary');
    const addButton = document.getElementById('recipe-add-available');
    if (!summaryEl || !addButton) return;

    const matches = window.ZDataUtils?.buildIngredientMatches
      ? window.ZDataUtils.buildIngredientMatches(recipe, products)
      : { available: [], unavailable: Array.isArray(recipe.ingredients) ? recipe.ingredients : [] };

    const availableCount = matches.available.length;
    const unavailableCount = matches.unavailable.length;
    const unavailableNames = matches.unavailable
      .map(item => item?.name)
      .filter(Boolean);

    if (unavailableCount) {
      summaryEl.innerHTML = `
        <strong>${availableCount} ingredient${availableCount === 1 ? '' : 's'} available</strong> and
        <strong>${unavailableCount} unavailable</strong>.
        ${unavailableNames.length ? `Missing: ${unavailableNames.map(escapeHtml).join(', ')}.` : ''}
      `;
    } else {
      summaryEl.innerHTML = `<strong>All ingredients are available in the store.</strong>`;
    }

    addButton.disabled = availableCount === 0;
    addButton.dataset.recipeId = String(recipe.id || '');
    addButton.dataset.availableCount = String(availableCount);
    addButton.dataset.unavailableCount = String(unavailableCount);
    addButton.dataset.recipeName = recipe.name || 'recipe';

    addButton.onclick = () => {
      if (!availableCount || !window.ZAndwichCart?.addToCart) return;

      matches.available.forEach(entry => {
        window.ZAndwichCart.addToCart({
          id: entry.product.id,
          name: entry.product.name,
          price: entry.product.price,
          unit: entry.product.unit || `${entry.product.weight || ''}g`
        }, 1, { silent: true });
      });

      if (window.ZAndwichCart?.showToast) {
        const missingText = unavailableCount ? ` ${unavailableCount} ingredient${unavailableCount === 1 ? '' : 's'} unavailable.` : '';
        window.ZAndwichCart.showToast(`Added ${availableCount} available ingredient${availableCount === 1 ? '' : 's'} to cart.${missingText}`);
      }
    };
  }

  async function init() {
    const recipeId = getRecipeId();
    if (!recipeId) {
      showError('No recipe specified');
      return;
    }

    try {
      const [recipeData, productsRaw] = await Promise.all([loadRecipes(), loadProducts()]);
      const recipes = Array.isArray(recipeData) ? recipeData : [];
      const products = Array.isArray(productsRaw)
        ? productsRaw.map(item => (window.ZDataUtils?.normalizeProductData ? window.ZDataUtils.normalizeProductData(item) : item))
        : [];

      const recipe = recipes.find(item => String(item.id) === String(decodeURIComponent(recipeId)));
      if (!recipe) {
        showError(`Recipe \"${decodeURIComponent(recipeId)}\" not found`);
        return;
      }

      const rawEstimatedCost = Number(recipe.estimatedCost || recipe.estimated_cost || 0)
        || (window.ZDataUtils?.estimateRecipeCost ? window.ZDataUtils.estimateRecipeCost(recipe, products) : 0);
      const estimatedCost = Number(rawEstimatedCost.toFixed(2));
      const costLabel = window.ZDataUtils?.formatMoney ? window.ZDataUtils.formatMoney(estimatedCost) : `R${estimatedCost.toFixed(2)}`;

      document.title = `${recipe.name} — ZAndwich`;

      const navigationBarTitle = document.querySelector('.navigation-bar-title');
      if (navigationBarTitle) navigationBarTitle.textContent = 'Recipes';

      const heroCardName = document.querySelector('.product-card-name');
      const heroCardQty = document.querySelector('.product-card-qty');
      const heroCardPrice = document.querySelector('.product-card-price');
      const heroCardCopy = document.querySelector('.product-card-copy');
      if (heroCardName) heroCardName.textContent = recipe.name;
      if (heroCardQty) heroCardQty.textContent = `${recipe.category || 'Recipe'} · ${recipe.area || 'Unknown'}`;
      if (heroCardPrice) {
        heroCardPrice.outerHTML = `<span class="product-card-price product-card-price-hero">${costLabel}</span>`;
      }
      if (heroCardCopy) heroCardCopy.textContent = 'Estimated cost based on ingredient matches from our product catalogue.';

      const imageContainer = document.querySelector('.product-hero-card .product-card-img');
      if (imageContainer) {
        imageContainer.innerHTML = `
          <span class="product-card-img-label">[RECIPE]</span>
          <span class="product-image-error is-hidden">There's something wrong with this image.</span>
        `;
        hydrateImage(imageContainer, recipe.image, recipe.name);
      }

      const detailHeading = document.querySelector('.product-detail-heading');
      const detailCopy = document.querySelector('.product-detail-copy');
      const instructionsBlock = document.getElementById('recipe-instructions');
      if (detailHeading) detailHeading.textContent = recipe.name;
      if (detailCopy) detailCopy.textContent = 'Recipe details, ingredient availability, and market cost are listed below.';
      if (instructionsBlock) instructionsBlock.textContent = recipe.instructions || 'No instructions available.';

      const meta = document.querySelectorAll('.product-hero-meta span');
      if (meta[0]) meta[0].textContent = `${recipe.category || 'Recipe type'}`;
      if (meta[1]) meta[1].textContent = `${recipe.area || 'Unknown country'}`;
      if (meta[2]) meta[2].textContent = `Estimated: ${costLabel}`;

      const sourceLink = document.getElementById('recipe-source-link');
      if (sourceLink) {
        if (recipe.source) {
          sourceLink.href = recipe.source;
          sourceLink.classList.remove('is-hidden');
        } else {
          sourceLink.classList.add('is-hidden');
        }
      }

      const wishlistButton = document.getElementById('recipe-wishlist-button');
      if (wishlistButton) {
        wishlistButton.onclick = () => {
          const added = window.ZWishlist?.addRecipe?.({
            id: recipe.id,
            name: recipe.name,
            price: Number(estimatedCost || 0),
            image: recipe.image || '',
            meta: `${recipe.category || 'Recipe'} · ${recipe.area || 'Unknown'}`,
            href: `recipe.html?id=${encodeURIComponent(recipe.id)}`
          });

          if (window.ZWishlist?.showToast) {
            window.ZWishlist.showToast(added ? 'Recipe added to wishlist' : 'Recipe already in wishlist');
          }
        };
      }

      renderRecipeVideo(recipe);

      const ingredientsList = document.getElementById('recipe-ingredients-list');
      if (ingredientsList) {
        const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
        ingredientsList.innerHTML = ingredients.length
          ? ingredients.map(item => `<li><strong>${escapeHtml(item.name || 'Ingredient')}:</strong> ${escapeHtml(item.measure || 'To taste')}</li>`).join('')
          : '<li>No ingredients listed.</li>';
      }

      renderIngredientAvailability(recipe, products);

      renderRelated(recipes.map(r => ({
        ...r,
        estimatedCost: Number((
          Number(r.estimatedCost || r.estimated_cost || 0)
          || (window.ZDataUtils?.estimateRecipeCost ? window.ZDataUtils.estimateRecipeCost(r, products) : 0)
        ).toFixed(2))
      })), recipe.id, products);
    } catch (error) {
      console.error(error);
      showError('Could not load recipe data.');
    }
  }

  init();
})();
