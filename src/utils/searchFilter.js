/**
 * High-performance search, filtering, and occasion mapping engine for product catalogs.
 */

// Occasion keyword aliases to map loose customer searches to exact category slugs
const OCCASION_ALIASES = {
  diwali: "Festive Celebrations",
  festive: "Festive Celebrations",
  festival: "Festive Celebrations",
  rakhi: "Festive Celebrations",
  holi: "Festive Celebrations",
  newyear: "Festive Celebrations",
  wedding: "Weddings & Anniversaries",
  anniversary: "Weddings & Anniversaries",
  marriage: "Weddings & Anniversaries",
  bridal: "Weddings & Anniversaries",
  chocolate: "Artisanal Chocolates & Sweets",
  chocolates: "Artisanal Chocolates & Sweets",
  sweets: "Artisanal Chocolates & Sweets",
  mithai: "Artisanal Chocolates & Sweets",
  corporate: "Corporate Gifting",
  business: "Corporate Gifting",
  executive: "Corporate Gifting",
  gourmet: "Gourmet & Dry Fruits",
  dryfruits: "Gourmet & Dry Fruits",
  wellness: "Wellness & Spa",
  perfume: "Luxury Perfumes",
  fragrance: "Luxury Perfumes",
  baby: "Baby & Mom Care",
  birthday: "Birthdays & Milestones",
};

export function filterAndSortProducts(
  products = [],
  {
    searchQuery = "",
    selectedCategory = "all",
    sortBy = "default",
    priceRange = null,
    inStockOnly = false,
  } = {}
) {
  if (!Array.isArray(products)) return [];
  let list = products.filter((p) => p && typeof p === "object");

  // 1. In-Stock Filter
  if (inStockOnly) {
    list = list.filter((p) => {
      const stock = Number(p.stockQuantity !== undefined ? p.stockQuantity : p.stock_qty) || 0;
      return stock > 0;
    });
  }

  // 2. Category Filter (with alias normalization)
  if (selectedCategory && selectedCategory !== "all") {
    const rawTarget = selectedCategory.trim().toLowerCase();
    const normalizedTarget = (OCCASION_ALIASES[rawTarget] || selectedCategory).trim().toLowerCase();

    list = list.filter((p) => {
      const cat = (p.categoryName || p.category || p.categoryId || "").toLowerCase().trim();
      return Boolean(
        cat &&
          (cat.includes(rawTarget) ||
            rawTarget.includes(cat) ||
            cat.includes(normalizedTarget) ||
            normalizedTarget.includes(cat))
      );
    });
  }

  // 3. Search Query Filter (scoring by name > occasion > tags > description)
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    const queryTokens = query.split(/\s+/).filter(Boolean);

    list = list.filter((p) => {
      const name = (p.productName || p.product_name || "").toLowerCase();
      const desc = (p.description || p.shortDescription || "").toLowerCase();
      const cat = (p.categoryName || p.category || "").toLowerCase();
      const tags = Array.isArray(p.tags) ? p.tags.join(" ").toLowerCase() : "";

      const searchableText = `${name} ${cat} ${tags} ${desc}`;
      return queryTokens.every((token) => searchableText.includes(token));
    });
  }

  // 4. Price Range Filter
  if (priceRange && (priceRange.min !== undefined || priceRange.max !== undefined)) {
    const min = priceRange.min !== undefined ? Number(priceRange.min) : 0;
    const max = priceRange.max !== undefined ? Number(priceRange.max) : Infinity;
    list = list.filter((p) => {
      const price = Number(p.price) || 0;
      return price >= min && price <= max;
    });
  }

  // 5. Sorting
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
      list.sort(
        (a, b) =>
          (Number(b.rating || b.averageRating) || 0) - (Number(a.rating || a.averageRating) || 0)
      );
      break;
    case "featured":
      list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
    case "newest":
      list.sort((a, b) => {
        const dateA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : new Date(a.createdAt || 0).getTime();
        const dateB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : new Date(b.createdAt || 0).getTime();
        if (dateA && dateB && dateA !== dateB) return dateB - dateA;
        const numA = Number(String(a.productId || a.id || "").replace(/\D/g, "")) || 0;
        const numB = Number(String(b.productId || b.id || "").replace(/\D/g, "")) || 0;
        if (numA !== numB) return numB - numA;
        return String(b.productId || b.id || "").localeCompare(
          String(a.productId || a.id || ""),
          undefined,
          { numeric: true }
        );
      });
      break;
    default:
      break;
  }

  return list;
}
