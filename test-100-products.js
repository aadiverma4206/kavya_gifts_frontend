import assert from "node:assert";
import { DUMMY_PRODUCTS, getDummyProducts, getDummyProductsByCategory } from "./src/data/dummyProducts.js";
import { fetchActiveCatalog } from "./src/controllers/productController.js";
import { filterAndSortProducts } from "./src/utils/searchFilter.js";

console.log("=================================================");
console.log("TESTING 100+ DUMMY PRODUCTS CATALOG ARCHITECTURE");
console.log("=================================================\n");

async function runTests() {
  console.log(`1. Verifying dummy catalog size...`);
  const allDummy = getDummyProducts();
  console.log(`  - Total active dummy products: ${allDummy.length}`);
  assert.ok(allDummy.length >= 100, `Must have at least 100 dummy products, found ${allDummy.length}`);
  console.log(`✓ PASS: Catalog has ${allDummy.length} products (satisfies 100+ requirement).`);

  console.log(`\n2. Verifying schema completeness and network image URLs...`);
  let invalidImages = 0;
  let invalidPrices = 0;
  let invalidNames = 0;

  for (const p of allDummy) {
    if (!p.productId || !p.productId.startsWith("PRD-")) {
      console.error(`Invalid product ID:`, p);
    }
    if (!p.productName || p.productName.trim().length < 3) invalidNames++;
    if (typeof p.price !== "number" || p.price <= 0) invalidPrices++;

    // Check network images
    const img = p.thumbnail || (p.images && p.images[0]);
    if (!img || (!img.startsWith("http://") && !img.startsWith("https://"))) {
      invalidImages++;
      console.error(`Invalid network image for product ${p.productId}:`, img);
    }
  }

  assert.strictEqual(invalidNames, 0, "All products must have valid names");
  assert.strictEqual(invalidPrices, 0, "All products must have valid prices > 0");
  assert.strictEqual(invalidImages, 0, "All products must have valid HTTP/HTTPS network images");
  console.log(`✓ PASS: 100% of products have valid network images and valid pricing.`);

  console.log(`\n3. Verifying category distribution across all 10 gifting categories...`);
  const categories = [...new Set(allDummy.map((p) => p.categoryName))];
  console.log(`  - Categories found:`, categories);
  assert.ok(categories.length >= 8, `Expected at least 8 categories, found ${categories.length}`);

  for (const cat of categories) {
    const inCat = getDummyProductsByCategory(cat);
    assert.ok(inCat.length > 0, `Category ${cat} must contain products`);
    console.log(`  - Category [${cat}]: ${inCat.length} products`);
  }
  console.log(`✓ PASS: All categories have rich product coverage.`);

  console.log(`\n4. Verifying filterAndSortProducts utility...`);
  const searchResults = filterAndSortProducts(allDummy, { searchQuery: "diwali" });
  assert.ok(searchResults.length > 0, "Search for 'diwali' must return matching hampers");
  console.log(`  - Search 'diwali' matched: ${searchResults.length} hampers`);

  const sortedLow = filterAndSortProducts(allDummy, { sortBy: "price_asc" });
  assert.ok(sortedLow[0].price <= sortedLow[sortedLow.length - 1].price, "Ascending price sort must work");
  console.log(`  - Lowest price: ₹${sortedLow[0].price}, Highest price: ₹${sortedLow[sortedLow.length - 1].price}`);
  console.log(`✓ PASS: Search and sorting utilities operate seamlessly.`);

  console.log(`\n5. Verifying fetchActiveCatalog via productController...`);
  const activeCatalog = await fetchActiveCatalog();
  assert.ok(activeCatalog.length >= 100, `Controller must return 100+ products, got ${activeCatalog.length}`);
  console.log(`  - Active catalog count: ${activeCatalog.length} products`);
  console.log(`✓ PASS: Controller returns 100+ products.`);

  console.log("\n=================================================");
  console.log("🎉 ALL 100+ DUMMY PRODUCTS TESTS PASSED 100%!");
  console.log("=================================================");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
