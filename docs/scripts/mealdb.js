const recipeStatus = document.getElementById('recipe-status');
const recipeList = document.getElementById('recipe-list');

const KEYWORD_STOP_WORDS = new Set([
  'fresh', 'tinned', 'canned', 'white', 'brown', 'ground', 'whole',
  'meal', 'powder', 'stock', 'cubes', 'cube', 'oil', 'sauce', 'plain'
]);

let recipeCache = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(value) {
  return normalize(value)
    .split(' ')
    .filter(token => token.length > 2 && !KEYWORD_STOP_WORDS.has(token));
}

function singularize(token) {
  if (token.endsWith('ies') && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith('s') && token.length > 3) return token.slice(0, -1);
  return token;
}

function buildKeywordSet(product) {
  const sourceValues = [product?.name || '', product?.mealdbIngredient || ''];
  if (Array.isArray(product?.tags)) sourceValues.push(product.tags.join(' '));

  const tokens = sourceValues.flatMap(tokenize);
  const expanded = new Set();
  tokens.forEach(token => {
    expanded.add(token);
    expanded.add(singularize(token));
  });

  return Array.from(expanded).filter(Boolean);
}

function getRecipeIngredients(recipe) {
  if (!Array.isArray(recipe?.ingredients)) return [];
  return recipe.ingredients.map(item => normalize(item?.name || '')).filter(Boolean);
}

function scoreRecipe(recipe, keywords) {
  if (!keywords.length) return 0;

  const ingredientNames = getRecipeIngredients(recipe);
  const recipeName = normalize(recipe?.name || '');
  let score = 0;

  keywords.forEach(keyword => {
    if (!keyword) return;
    const exactIngredientMatch = ingredientNames.some(name => name.split(' ').includes(keyword));
    const containsIngredientMatch = ingredientNames.some(name => name.includes(keyword));
    const nameMatch = recipeName.includes(keyword);

    if (exactIngredientMatch) score += 4;
    else if (containsIngredientMatch) score += 2;
    if (nameMatch) score += 1;
  });

  return score;
}

function renderRecipe(recipe, productsList) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const image = escapeHtml(recipe?.image || '');
  const title = escapeHtml(recipe?.name || 'Recipe');
  const category = escapeHtml(recipe?.category || 'Recipe idea');
  const area = escapeHtml(recipe?.area || '');
  const source = recipe?.source || recipe?.youtube || '';
  const href = `recipe.html?id=${encodeURIComponent(recipe?.id || '')}`;
  const costValue = Number(recipe?.estimatedCost || recipe?.estimated_cost || 0);
  const costLabel = costValue > 0 && window.ZDataUtils?.formatMoney
    ? window.ZDataUtils.formatMoney(costValue)
    : '';

  let ingredientsSummary = '';
  if (Array.isArray(productsList) && productsList.length > 0 && window.ZDataUtils?.buildIngredientMatches) {
    const matches = window.ZDataUtils.buildIngredientMatches(recipe, productsList);
    const availableCount = matches.available.length;
    const totalCount = matches.available.length + matches.unavailable.length;
    if (totalCount > 0) {
      ingredientsSummary = `<span class="recipe-ingredients-available">${availableCount} of ${totalCount} ingredients available</span>`;
    }
  }

  card.innerHTML = `
    <div class="product-card-img">
      ${image ? `<img src="${image}" alt="${title}">` : '<span class="product-card-img-label">[IMG]</span>'}
    </div>
    <div class="product-card-body">
      <span class="product-card-name">${title}</span>
      <span class="product-card-qty">${area ? `${category} · ${area}` : category}</span>
      ${ingredientsSummary}
      ${costLabel ? `<span class="product-card-price">${costLabel}</span>` : ''}
      <a class="btn-order" href="${href}">Open Recipe</a>
    </div>
  `;

  recipeList.appendChild(card);
}

async function loadRecipeData() {
  if (Array.isArray(recipeCache)) return recipeCache;

  let data;
  try {
    if (window.ZAndwichApi?.fetchJson) {
      data = await window.ZAndwichApi.fetchJson('recipes');
    } else {
      const apiRes = await fetch('http://localhost:3000/api/recipes');
      if (apiRes.ok) {
        data = await apiRes.json();
      }
    }
  } catch (_) {
    // Fall back to static JSON below.
  }

  if (!Array.isArray(data)) {
    const response = await fetch('scripts/true_final_recipes.json');
    if (!response.ok) throw new Error('Could not load recipe data');
    data = await response.json();
  }
  recipeCache = Array.isArray(data) ? data : [];
  return recipeCache;
}

async function loadRecipesForProduct(product) {
  if (!recipeList || !recipeStatus) return;

  try {
    const productName = product?.name || 'this product';
    recipeStatus.textContent = `Looking for recipes using ${productName}...`;
    recipeList.innerHTML = '';

    const [recipes, products] = await Promise.all([
      loadRecipeData(),
      (async () => {
        try {
          if (window.ZAndwichApi?.fetchJson) return await window.ZAndwichApi.fetchJson('products');
          const apiRes = await fetch('http://localhost:3000/api/products');
          if (apiRes.ok) return apiRes.json();
        } catch (_) {}
        const fallbackRes = await fetch('scripts/products.JSON');
        return fallbackRes.ok ? fallbackRes.json() : [];
      })()
    ]);

    const normalizedProducts = Array.isArray(products)
      ? products.map(item => (window.ZDataUtils?.normalizeProductData ? window.ZDataUtils.normalizeProductData(item) : item))
      : [];
    const keywords = buildKeywordSet(product || {});

    const matched = recipes
      .map(recipe => {
        const estimatedCost = Number(recipe?.estimatedCost || recipe?.estimated_cost || 0)
          || (window.ZDataUtils?.estimateRecipeCost ? window.ZDataUtils.estimateRecipeCost(recipe, normalizedProducts) : 0);
        return { recipe: { ...recipe, estimatedCost }, score: scoreRecipe(recipe, keywords) };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || String(a.recipe.name || '').localeCompare(String(b.recipe.name || '')))
      .slice(0, 8)
      .map(entry => entry.recipe);

    if (!matched.length) {
      recipeStatus.textContent = `No recipe ideas found in our recipe file for ${productName}.`;
      return;
    }

    recipeStatus.textContent = `Recipe ideas from our recipe file for ${productName}`;
    matched.forEach(recipe => renderRecipe(recipe, normalizedProducts));
  } catch (error) {
    recipeStatus.textContent = 'Unable to load recipe suggestions at the moment.';
    console.error('Recipe loading error:', error);
  }
}

function loadRecipes(ingredientName) {
  return loadRecipesForProduct({ name: ingredientName, mealdbIngredient: ingredientName, tags: [] });
}

window.loadRecipesForProduct = loadRecipesForProduct;
window.loadRecipes = loadRecipes;
