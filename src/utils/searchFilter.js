/**
 * High-performance search and filter utility for product catalogs.
 */

export function filterAndSortProducts(products = [], {
  searchQuery = "",
  selectedCategory = "all",
  sortBy = "default",
  priceRange = null,
} = {}) {
  if (!Array.isArray(products)) return [];
  let list = products.filter((p) => p && typeof p === "object");

  // 1. Category Filter
  if (selectedCategory && selectedCategory !== "all") {
    const targetCat = selectedCategory.trim().toLowerCase();
    list = list.filter((p) => {
      const cat = (p.categoryName || p.category || p.categoryId || "").toLowerCase().trim();
      return Boolean(cat && (cat.includes(targetCat) || targetCat.includes(cat)));
    });
  }

  // 2. Search Query Filter
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    list = list.filter((p) => {
      const name = (p.productName || p.product_name || "").toLowerCase();
      const desc = (p.description || p.shortDescription || "").toLowerCase();
      const cat = (p.categoryName || p.category || "").toLowerCase();
      return name.includes(query) || desc.includes(query) || cat.includes(query);
    });
  }

  // 3. Price Range Filter
  if (priceRange && (priceRange.min !== undefined || priceRange.max !== undefined)) {
    const min = priceRange.min !== undefined ? Number(priceRange.min) : 0;
    const max = priceRange.max !== undefined ? Number(priceRange.max) : Infinity;
    list = list.filter((p) => {
      const price = Number(p.price) || 0;
      return price >= min && price <= max;
    });
  }

  // 4. Sorting
  switch (sortBy) {
    case "price_asc":
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      break;
    case "price_desc":
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      break;
    case "name_asc":
      list.sort((a, b) => {
        const nameA = a.productName || a.product_name || "";
        const nameB = b.productName || b.product_name || "";
        return nameA.localeCompare(nameB);
      });
      break;
    case "name_desc":
      list.sort((a, b) => {
        const nameA = a.productName || a.product_name || "";
        const nameB = b.productName || b.product_name || "";
        return nameB.localeCompare(nameA);
      });
      break;
    case "rating_desc":
      list.sort((a, b) => (Number(b.rating || b.averageRating) || 0) - (Number(a.rating || a.averageRating) || 0));
      break;
    case "featured":
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
    case "newest":
      list.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
        if (dateA && dateB && dateA !== dateB) return dateB - dateA;
        const numA = Number(String(a.productId || a.id || "").replace(/\D/g, "")) || 0;
        const numB = Number(String(b.productId || b.id || "").replace(/\D/g, "")) || 0;
        if (numA !== numB) return numB - numA;
        return String(b.productId || b.id || "").localeCompare(String(a.productId || a.id || ""), undefined, { numeric: true });
      });
      break;
    default:
      // Default natural order
      break;
  }

  return list;
}
