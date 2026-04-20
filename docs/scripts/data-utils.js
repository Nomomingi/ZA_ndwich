(function () {
  const RECIPE_COST_MULTIPLIER = 2.65;

  const BASE_PRICE = {
    garden: 24,
    orchard: 18,
    butcher: 65,
    dairy: 29,
    pantry: 26,
    tin: 19,
    'spice-rack': 17,
    shelf: 33
  };

  const WEIGHT_DEFAULT = {
    garden: 500,
    orchard: 1000,
    butcher: 500,
    dairy: 500,
    pantry: 1000,
    tin: 400,
    'spice-rack': 100,
    shelf: 500
  };

  const UNIT_DEFAULT = {
    garden: '500g pack',
    orchard: '1kg bag',
    butcher: '500g pack',
    dairy: '500g pack',
    pantry: '1kg pack',
    tin: '400g tin',
    'spice-rack': '100g pack',
    shelf: '500ml bottle'
  };

  const STOP_WORDS = new Set(['fresh', 'tinned', 'canned', 'ground', 'white', 'brown', 'self', 'raising']);
  const SPECIAL_DISCOUNT_RATIO = 0.75;
  const SPECIAL_PRODUCT_BASE_PRICES = {
    bacon: 93.0,
    chicken: 93.0,
    eggs: 39.0,
    tomatoes: 12.99
  };

  const PREFERRED_PRODUCT_IMAGES = {
    'mielie-meal-white': 'https://pureandwhole.co.za/wp-content/uploads/2021/11/Yellow-Maize-Meal-Non-GMO-Wholegrain.jpg',
    potatoes: 'https://res.cloudinary.com/babylon/image/upload/c_thumb,w_750,h_750,dpr_1,f_auto/babylonstoren/shop/image/image-lr-veg-potatoes-4kg-2-0891c7b9d275',
    onions: 'https://media.istockphoto.com/id/178502200/photo/onions-in-bag.jpg?s=612x612&w=0&k=20&c=s68D7Ny-L1qMDMaKyrkXvgl4QL1eXKVEqGVEhvbJuI8=',
    mince: 'https://www.thenakedbutcher.com.au/cdn/shop/files/chicken-mince-scaled-uai-2560x1440-a5d88e52-ecbd-47af-a7f2-4762bd1c7079-_1_a6b4eb4a-fd5d-435f-bcc7-44411e750bdc.jpg?v=1688715266',
    chicken: 'https://media.istockphoto.com/id/1349245212/photo/burrito-ingredients-chicken-thigh-on-black-backgroundtop-viewwith-space-for-text.jpg?s=612x612&w=0&k=20&c=wwk5546k0fA2DTdjj1VfLeefn2GEYuqj8HY11FbwO84=',
    'chicken-drumsticks': 'https://www.shutterstock.com/image-photo/fresh-raw-chicken-drumsticks-on-600nw-2654971427.jpg',
    lamb: 'https://thumbs.dreamstime.com/b/raw-lamb-chop-cutlets-fresh-mutton-meat-steaks-herbs-wooden-background-top-view-raw-lamb-chop-cutlets-fresh-mutton-meat-429559380.jpg?w=768',
    bacon: 'https://thumbs.dreamstime.com/b/raw-smoked-sliced-bacon-crumpled-paper-84715402.jpg',
    boerewors: 'https://media.istockphoto.com/id/185063958/photo/wors-on-a-braai.jpg?s=612x612&w=0&k=20&c=0XfyK-1d_gkn_bAWwHj2V8aFt-ynJtjFJyBVdGlO-N0=',
    eggs: 'https://media.istockphoto.com/id/1474901155/photo/fresh-organic-chicken-eggs.jpg?s=612x612&w=0&k=20&c=VS7iD9xIgu5ZQFcUyMyE5twR3dkQfp3C_XjB7FdbltU=',
    milk: 'https://t4.ftcdn.net/jpg/02/31/84/29/360_F_231842968_qThCnmslPbEAwhg7nuW9rAy8qRNhRli7.jpg',
    butter: 'https://media.istockphoto.com/id/1935462348/photo/butter-close-up.jpg?s=612x612&w=0&k=20&c=8W1_2faRA1gW-wJqQvxFdELCc7b2tRS8I0XcCji3zeE=',
    'cake-flour': 'https://thumbs.dreamstime.com/b/top-down-view-cake-flour-old-recipe-cards-bowl-106702299.jpg',
    'white-sugar': 'https://img.freepik.com/free-photo/world-diabetes-day-sugar-wooden-bowl-dark-surface_1150-26666.jpg?semt=ais_hybrid&w=740&q=80',
    salt: 'https://thumbs.dreamstime.com/b/spilled-salt-salt-shaker-spilled-salt-salt-shaker-blue-background-114042149.jpg',
    'black-pepper': 'https://www.stylecraze.com/wp-content/uploads/2013/06/17-Amazing-Benefits-Of-Black-Pepper-For-Skin-Hair-And-Health_1200px.jpg.webp',
    'sunflower-oil': 'https://images.medicinenet.com/images/article/main_image/is-sunflower-oil-good-for-you-and-is-it-healthier-than-olive-oil.jpg?output-quality=75',
    'curry-powder': 'https://foodal.com/wp-content/uploads/2015/02/Make-Your-Own-Curry-Powder.jpg'
  };

  function titleCase(word) {
    if (!word) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  function inferIngredient(name) {
    const words = String(name || '')
      .replace(/[()]/g, ' ')
      .replace(/-/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter(w => !STOP_WORDS.has(w.toLowerCase()));

    return (words.length ? words : ['Ingredient']).map(titleCase).join(' ');
  }

  function inferTags(product) {
    const tags = new Set(Array.isArray(product.tags) ? product.tags.map(t => String(t).toLowerCase()) : []);
    String(product.name || '')
      .replace(/[()]/g, ' ')
      .replace(/-/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .forEach(word => {
        const normalized = word.toLowerCase();
        if (normalized.length > 2 && !STOP_WORDS.has(normalized)) tags.add(normalized);
      });

    if (product.category) tags.add(String(product.category).toLowerCase());
    if (/fresh/i.test(String(product.name || ''))) tags.add('fresh');
    if (/canned|tinned/i.test(String(product.name || ''))) tags.add('pantry');

    return Array.from(tags).slice(0, 6);
  }

  function generateProductDescription(product) {
    const name = String(product.name || 'this product');
    const lowerName = name.toLowerCase();
    const category = String(product.category || '').toLowerCase();

    if (/sardine|pilchard|fish/.test(lowerName)) {
      return `${name} brings a bold, briny finish to toast, rice bowls, and quick weeknight lunches.`;
    }
    if (/tomato/.test(lowerName)) {
      return `${name} adds bright acidity and a glossy, full-bodied finish to sauces, salads, and stovetop staples.`;
    }
    if (/oil/.test(lowerName)) {
      return `${name} is a kitchen workhorse for frying, dressing, and finishing dishes with a rich, smooth edge.`;
    }
    if (/pasta/.test(lowerName)) {
      return `${name} gives you a reliable, filling base for generous sauces, baked dishes, and pantry meals.`;
    }
    if (/cheese|butter|milk|yoghurt/.test(lowerName)) {
      return `${name} adds comfort, richness, and a little extra luxury to everyday cooking.`;
    }
    if (/onion|garlic|carrot|spinach|potato|cabbage|pumpkin|butternut|beans|peas|corn|avocado|mielie|mielie meal/.test(lowerName)) {
      return `${name} is a dependable market staple that brings body, colour, and flavour to simple home cooking.`;
    }
    if (/beef|mince|chicken|pork|lamb|bacon|meat|sausage/.test(lowerName)) {
      return `${name} is built for hearty plates, comforting meals, and generous family portions.`;
    }
    if (/apple|banana|lemon|orange|pear|mango|pineapple|grapes/.test(lowerName)) {
      return `${name} keeps things fresh, bright, and ready for breakfast tables, lunchboxes, or a quick snack.`;
    }

    switch (category) {
      case 'tin':
        return `${name} is a pantry-ready tin made for fast meals, bold flavour, and dependable convenience.`;
      case 'dairy':
        return `${name} brings smooth texture and rich flavour to everyday kitchen favourites.`;
      case 'butcher':
        return `${name} is a substantial ingredient for meals that need depth, comfort, and a proper centrepiece.`;
      case 'orchard':
        return `${name} offers a clean, fresh finish for snacks, lunchboxes, and lighter meals.`;
      case 'garden':
        return `${name} is a bright, versatile staple that works across salads, sides, stews, and sandwiches.`;
      default:
        return `${name} is a practical staple in South African kitchens, selected for daily meals and dependable quality.`;
    }
  }

  function getProductPricing(product) {
    const currentPrice = Number(product.price) || 0;
    const compareAtPrice = Number(product.compareAtPrice || product.originalPrice || 0);
    const isDiscounted = compareAtPrice > currentPrice;

    return {
      currentPrice,
      compareAtPrice,
      isDiscounted
    };
  }

  function renderPriceMarkup(product, className = '') {
    const pricing = getProductPricing(product);
    const baseClass = className ? ` ${className}` : '';

    if (pricing.isDiscounted) {
      return `
        <span class="product-card-price product-card-price-sale${baseClass}">
          <span class="product-price-current">R${pricing.currentPrice.toFixed(2)}</span>
          <span class="product-price-compare">R${pricing.compareAtPrice.toFixed(2)}</span>
        </span>
      `;
    }

    return `<span class="product-card-price${baseClass}">R${pricing.currentPrice.toFixed(2)}</span>`;
  }

  function getDiscountPercent(product) {
    const pricing = getProductPricing(product);
    if (!pricing.isDiscounted || pricing.compareAtPrice <= 0) return 0;

    const discount = ((pricing.compareAtPrice - pricing.currentPrice) / pricing.compareAtPrice) * 100;
    return Math.max(1, Math.round(discount));
  }

  function renderDiscountBadge(product, className = '') {
    const discountPercent = getDiscountPercent(product);
    if (!discountPercent) return '';

    const baseClass = className ? ` ${className}` : '';
    return `<span class="product-discount-badge${baseClass}" aria-label="${discountPercent}% off">-${discountPercent}%</span>`;
  }

  function inferPrice(product, category) {
    const base = BASE_PRICE[category] || 22;
    const name = String(product.name || '').toLowerCase();
    let mod = 0;

    if (/beef|lamb|pork|chicken|hake|boerewors|mince|bacon/.test(name)) mod += 28;
    if (/oil/.test(name)) mod += 18;
    if (/cheese|butter|cream|milk|yoghurt|eggs/.test(name)) mod += 10;
    if (/spice|pepper|cinnamon|masala|turmeric|paprika|oregano|powder/.test(name)) mod -= 4;
    if (/sugar|salt|flour|rice|pasta|oats|samp/.test(name)) mod -= 2;

    const value = Math.max(9, base + mod);
    return Number((Math.round(value * 2) / 2).toFixed(2));
  }

  function normalizeProductData(product) {
    const category = String(product.category || 'pantry');
    const normalized = { ...product };

    normalized.description = generateProductDescription(normalized);

    const preferredImage = PREFERRED_PRODUCT_IMAGES[String(normalized.id || '').toLowerCase()];
    if (preferredImage) {
      normalized.img = preferredImage;
    }

    if (!Number(normalized.price) || Number(normalized.price) <= 0) {
      normalized.price = inferPrice(normalized, category);
    } else {
      normalized.price = Number(normalized.price);
    }

    const specialBasePrice = SPECIAL_PRODUCT_BASE_PRICES[String(normalized.id || '').toLowerCase()];
    if (Number.isFinite(specialBasePrice)) {
      normalized.special = true;
      normalized.compareAtPrice = Number(specialBasePrice.toFixed(2));
      normalized.price = Number((specialBasePrice * SPECIAL_DISCOUNT_RATIO).toFixed(2));
    }

    if (!Number(normalized.weight) || Number(normalized.weight) <= 0) {
      normalized.weight = WEIGHT_DEFAULT[category] || 500;
    }

    if (!normalized.unit || /placeholder/i.test(String(normalized.unit))) {
      normalized.unit = UNIT_DEFAULT[category] || '1 pack';
    }

    if (!normalized.mealdbIngredient || /placeholder/i.test(String(normalized.mealdbIngredient))) {
      normalized.mealdbIngredient = inferIngredient(normalized.name);
    }

    if (!Array.isArray(normalized.tags) || !normalized.tags.length) {
      normalized.tags = inferTags(normalized);
    }

    if (normalized.special && !Number(normalized.compareAtPrice)) {
      normalized.compareAtPrice = Number((normalized.price * 1.35).toFixed(2));
    } else if (Number(normalized.compareAtPrice) > 0) {
      normalized.compareAtPrice = Number(normalized.compareAtPrice);
    }

    normalized.available = normalized.available !== false;

    return normalized;
  }

  function normalizeWord(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function parseQuantityToGramsOrMl(measure) {
    const m = normalizeWord(measure);
    const numberMatch = m.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) return null;

    const value = Number(numberMatch[1]);
    if (!Number.isFinite(value) || value <= 0) return null;

    if (m.includes('kg') || m.includes('kilogram')) return value * 1000;
    if (m.includes('g') || m.includes('gram')) return value;
    if (m.includes('l ') || m.endsWith(' l') || m.includes('liter')) return value * 1000;
    if (m.includes('ml')) return value;

    return null;
  }

  function buildProductAliasMap(products) {
    const map = new Map();
    products.forEach(product => {
      const p = normalizeProductData(product);
      const aliases = [p.name, p.mealdbIngredient, ...(Array.isArray(p.tags) ? p.tags : [])]
        .map(normalizeWord)
        .filter(Boolean);
      aliases.forEach(alias => map.set(alias, p));
    });
    return map;
  }

  function findBestProductForIngredient(ingredientName, products) {
    const needle = normalizeWord(ingredientName);
    if (!needle) return null;

    const aliasMap = buildProductAliasMap(products);
    if (aliasMap.has(needle)) return aliasMap.get(needle);

    let best = null;
    let bestScore = 0;
    products.forEach(raw => {
      const p = normalizeProductData(raw);
      const hay = [p.name, p.mealdbIngredient, ...(Array.isArray(p.tags) ? p.tags : [])]
        .map(normalizeWord)
        .join(' ');

      if (!hay) return;
      let score = 0;
      if (hay.includes(needle)) score += 5;
      if (needle.includes(normalizeWord(p.mealdbIngredient))) score += 4;
      needle.split(' ').forEach(token => {
        if (token && hay.includes(token)) score += 1;
      });

      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    });

    return best;
  }

  function estimateRecipeCost(recipe, products) {
    if (!recipe || !Array.isArray(recipe.ingredients) || !Array.isArray(products) || !products.length) {
      return 0;
    }

    let total = 0;
    recipe.ingredients.forEach(ingredient => {
      const product = findBestProductForIngredient(ingredient?.name, products);
      if (!product) return;

      const qty = parseQuantityToGramsOrMl(ingredient?.measure);
      const packWeight = Number(product.weight) || 500;
      const basePrice = Number(product.price) || 0;

      if (qty && packWeight > 0) {
        const ratio = Math.min(1.2, Math.max(0.04, qty / packWeight));
        total += basePrice * ratio * RECIPE_COST_MULTIPLIER;
      } else {
        total += basePrice * 0.18 * RECIPE_COST_MULTIPLIER;
      }
    });

    return Number((total + recipe.ingredients.length * 4).toFixed(2));
  }

  function buildIngredientMatches(recipe, products) {
    const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
    const available = [];
    const unavailable = [];

    ingredients.forEach(ingredient => {
      const product = findBestProductForIngredient(ingredient?.name, products);
      if (product && product.available !== false) {
        available.push({ ingredient, product });
      } else {
        unavailable.push(ingredient);
      }
    });

    return { available, unavailable };
  }

  function formatMoney(value) {
    return `R${Number(value || 0).toFixed(2)}`;
  }

  window.ZDataUtils = {
    normalizeProductData,
    estimateRecipeCost,
    buildIngredientMatches,
    getProductPricing,
    getDiscountPercent,
    renderPriceMarkup,
    renderDiscountBadge,
    generateProductDescription,
    formatMoney
  };
})();
