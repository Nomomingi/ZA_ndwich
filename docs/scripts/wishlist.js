(function () {
  const WISHLIST_KEY = 'zandwich-wishlist';

  function readWishlist() {
    try {
      const raw = window.localStorage.getItem(WISHLIST_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        products: Array.isArray(parsed?.products) ? parsed.products : [],
        recipes: Array.isArray(parsed?.recipes) ? parsed.recipes : []
      };
    } catch (error) {
      console.error('Could not read wishlist:', error);
      return { products: [], recipes: [] };
    }
  }

  function writeWishlist(next) {
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    } catch (error) {
      console.error('Could not save wishlist:', error);
    }
  }

  function normalizeItem(item) {
    return {
      id: String(item?.id || ''),
      name: String(item?.name || ''),
      image: String(item?.image || ''),
      meta: String(item?.meta || ''),
      price: Number(item?.price || 0),
      compareAtPrice: Number(item?.compareAtPrice || item?.originalPrice || 0),
      special: Boolean(item?.special),
      href: String(item?.href || '#')
    };
  }

  function addByType(type, item) {
    const wishlist = readWishlist();
    const list = type === 'recipes' ? wishlist.recipes : wishlist.products;
    const normalized = normalizeItem(item);
    if (!normalized.id || !normalized.name) return false;

    const exists = list.some(entry => String(entry.id) === normalized.id);
    if (exists) return false;

    list.push(normalized);
    writeWishlist(wishlist);
    return true;
  }

  function removeByType(type, id) {
    const wishlist = readWishlist();
    const list = type === 'recipes' ? wishlist.recipes : wishlist.products;
    const before = list.length;
    const next = list.filter(entry => String(entry.id) !== String(id));

    if (type === 'recipes') wishlist.recipes = next;
    else wishlist.products = next;

    if (before !== next.length) writeWishlist(wishlist);
    return before !== next.length;
  }

  function isInType(type, id) {
    const wishlist = readWishlist();
    const list = type === 'recipes' ? wishlist.recipes : wishlist.products;
    return list.some(entry => String(entry.id) === String(id));
  }

  function showToast(message) {
    let toast = document.getElementById('wishlist-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'wishlist-toast';
      toast.className = 'wishlist-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('wishlist-toast-show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.classList.remove('wishlist-toast-show');
    }, 2200);
  }
  showToast.timer = null;

  window.ZWishlist = {
    read: readWishlist,
    addProduct(item) {
      return addByType('products', item);
    },
    addRecipe(item) {
      return addByType('recipes', item);
    },
    removeProduct(id) {
      return removeByType('products', id);
    },
    removeRecipe(id) {
      return removeByType('recipes', id);
    },
    hasProduct(id) {
      return isInType('products', id);
    },
    hasRecipe(id) {
      return isInType('recipes', id);
    },
    showToast
  };
})();
