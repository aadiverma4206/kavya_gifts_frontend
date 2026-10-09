/**
 * High-performance search and filter utility for product catalogs.
 */

export function filterAndSortProducts(products = [], {
  searchQuery = "",
  selectedCategory = "all",
  sortBy = "default",
  priceRange = null,
} = {}) {
  let list = [...products];

  // 1. Category Filter
  if (selectedCategory && selectedCategory !== "all") {
    const targetCat = selectedCategory.trim().toLowerCase();
    list = list.filter((p) => {
      const cat = (p.categoryName || p.category || p.categoryId || "").toLowerCase();
      return cat.includes(targetCat) || targetCat.includes(cat);
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
  if (priceRange && typeof priceRange.max === "number") {
    list = list.filter((p) => {
      const price = Number(p.price) || 0;
      const min = priceRange.min || 0;
      return price >= min && price <= priceRange.max;
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
      list.sort((a, b) => (a.productName || "").localeCompare(b.productName || ""));
      break;
    case "featured":
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
    default:
      // Default natural order
      break;
  }

  return list;
}
