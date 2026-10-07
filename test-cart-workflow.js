import assert from "node:assert";
import {
  validateProductForCart,
  fetchProductDetails,
} from "./src/controllers/productController.js";
import {
  calculateItemFinancials,
  calculateCartSummary,
  buildCartItem,
  addOrMergeCartItem,
  updateCartItemQuantity,
  toggleCartItemGiftWrap,
  removeCartItem,
} from "./src/controllers/cartController.js";
import {
  getCloudCart,
  saveCloudCart,
  clearCloudCart,
  mergeGuestCartWithCloudCart,
} from "./src/services/cartService.js";

console.log("=================================================");
console.log("RUNNING COMPLETE CART & GIFT WRAPPING TEST SUITE");
console.log("=================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ FAIL: ${description}`);
    console.error(err);
  }
}

async function runAsyncTest(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ FAIL: ${description}`);
    console.error(err);
  }
}

async function main() {
  // Test Products
  const royalHamper = {
    productId: "PRD-10001",
    productName: "Royal Festive Gourmet Hamper",
    price: 2499,
    stockQuantity: 10,
    status: "active",
    giftWrappingAvailable: true,
    giftWrappingPrice: 150,
  };

  const brassBox = {
    productId: "PRD-10006",
    productName: "Executive Heirloom Brass Keepsake Box",
    price: 2999,
    stockQuantity: 5,
    status: "active",
    giftWrappingAvailable: false, // NOT available
    giftWrappingPrice: 0,
  };

  const outOfStockHamper = {
    productId: "PRD-99999",
    productName: "Vintage Archived Hamper",
    price: 1999,
    stockQuantity: 0,
    status: "active",
    giftWrappingAvailable: true,
    giftWrappingPrice: 100,
  };

  const inactiveHamper = {
    productId: "PRD-88888",
    productName: "Inactive Seasonal Hamper",
    price: 1599,
    stockQuantity: 20,
    status: "inactive",
    giftWrappingAvailable: true,
    giftWrappingPrice: 100,
  };

  // 1. BUSINESS RULE: PREVENT QUANTITY BELOW 1
  runTest("Prevents quantity below 1", () => {
    const resZero = validateProductForCart(royalHamper, 0);
    assert.strictEqual(resZero.isValid, false);
    assert.ok(resZero.error.includes("at least 1"));

    const resNeg = validateProductForCart(royalHamper, -2);
    assert.strictEqual(resNeg.isValid, false);
  });

  // 2. BUSINESS RULE: PREVENT QUANTITY ABOVE AVAILABLE STOCK
  runTest("Prevents quantity above available stock", () => {
    const resOver = validateProductForCart(royalHamper, 11);
    assert.strictEqual(resOver.isValid, false);
    assert.ok(resOver.error.includes("Only 10 left in stock"));

    const resValid = validateProductForCart(royalHamper, 10);
    assert.strictEqual(resValid.isValid, true);
    assert.strictEqual(resValid.sanitizedQuantity, 10);
  });

  // 3. BUSINESS RULE: PREVENT UNAVAILABLE PRODUCT (OUT OF STOCK OR INACTIVE)
  runTest("Prevents out of stock product", () => {
    const res = validateProductForCart(outOfStockHamper, 1);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error.includes("out of stock"));
  });

  runTest("Prevents inactive product", () => {
    const res = validateProductForCart(inactiveHamper, 1);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error.includes("unavailable for purchase"));
  });

  // 4. BUSINESS RULE: PREVENT UNAVAILABLE GIFT WRAPPING
  runTest("Prevents gift wrapping on product with giftWrappingAvailable = false", () => {
    const res = validateProductForCart(brassBox, 1, true);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error.includes("Gift wrapping is not available"));

    const resNoWrap = validateProductForCart(brassBox, 1, false);
    assert.strictEqual(resNoWrap.isValid, true);
    assert.strictEqual(resNoWrap.giftWrappingSelected, false);
    assert.strictEqual(resNoWrap.giftWrappingPrice, 0);
  });

  // 5. GIFT WRAPPING PRICE ADDITION
  runTest("Adds gift wrapping price when giftWrappingSelected is true", () => {
    const res = validateProductForCart(royalHamper, 2, true);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.giftWrappingSelected, true);
    assert.strictEqual(res.giftWrappingPrice, 150);

    const financials = calculateItemFinancials({
      price: royalHamper.price,
      quantity: 2,
      giftWrappingSelected: true,
      giftWrappingPrice: 150,
    });
    assert.strictEqual(financials.itemSubtotal, 2499 * 2); // 4998
    assert.strictEqual(financials.giftWrappingTotal, 150 * 2); // 300
    assert.strictEqual(financials.total, 4998 + 300); // 5298
  });

  // 6. CART ITEM STRUCTURE CONFORMANCE
  runTest("Cart item structure contains all required properties", () => {
    const item = buildCartItem(royalHamper, 2, true);
    assert.strictEqual(item.productId, "PRD-10001");
    assert.strictEqual(item.productName, "Royal Festive Gourmet Hamper");
    assert.strictEqual(item.price, 2499);
    assert.strictEqual(item.quantity, 2);
    assert.strictEqual(item.giftWrappingSelected, true);
    assert.strictEqual(item.giftWrappingPrice, 150);
    assert.strictEqual(item.itemSubtotal, 4998);
    assert.strictEqual(item.total, 5298);
    assert.ok("image" in item);
  });

  // 7. CART TOTALS CONFORMANCE (product subtotal, gift wrapping total, grand total)
  runTest("Calculates correct cart totals for multiple products and gift wrapping", () => {
    const item1 = buildCartItem(royalHamper, 2, true); // price 2499*2=4998, wrap 150*2=300, total 5298
    const item2 = buildCartItem(brassBox, 1, false);   // price 2999*1=2999, wrap 0, total 2999

    const summary = calculateCartSummary([item1, item2]);
    assert.strictEqual(summary.productSubtotal, 4998 + 2999); // 7997
    assert.strictEqual(summary.giftWrappingTotal, 300);      // 300
    assert.strictEqual(summary.grandTotal, 7997 + 300);      // 8297
    assert.strictEqual(summary.totalItems, 3);
  });

  // 8. DEDUPLICATION: MERGING IDENTICAL PRODUCTS
  runTest("Merges identical product and gift wrap without duplicate entries", () => {
    let cart = [];
    const step1 = addOrMergeCartItem(cart, royalHamper, 1, true);
    assert.strictEqual(step1.items.length, 1);
    assert.strictEqual(step1.items[0].quantity, 1);
    assert.strictEqual(step1.wasMerged, false);

    const step2 = addOrMergeCartItem(step1.items, royalHamper, 2, true);
    assert.strictEqual(step2.items.length, 1); // Not duplicated!
    assert.strictEqual(step2.items[0].quantity, 3);
    assert.strictEqual(step2.wasMerged, true);
    assert.strictEqual(step2.items[0].itemSubtotal, 2499 * 3);
    assert.strictEqual(step2.items[0].total, (2499 * 3) + (150 * 3));
  });

  // 9. DEDUPLICATION: DIFFERENT GIFT WRAP CHOICE AS SEPARATE LINE
  runTest("Keeps different gift wrap choice as distinct line items", () => {
    let cart = [];
    const step1 = addOrMergeCartItem(cart, royalHamper, 1, false);
    const step2 = addOrMergeCartItem(step1.items, royalHamper, 1, true);
    assert.strictEqual(step2.items.length, 2);
    assert.strictEqual(step2.items[0].giftWrappingSelected, false);
    assert.strictEqual(step2.items[1].giftWrappingSelected, true);
  });

  // 10. PREVENT OVER-STOCK MERGING
  runTest("Prevents merging if combined quantity exceeds stock", () => {
    let cart = [];
    const step1 = addOrMergeCartItem(cart, royalHamper, 8, false); // stock is 10
    assert.throws(() => {
      addOrMergeCartItem(step1.items, royalHamper, 3, false); // 8 + 3 = 11 > 10
    }, /Cannot add 3 more/);
  });

  // 11. QUANTITY ADJUSTMENT & LIMIT ENFORCEMENT
  runTest("Quantity updates enforce boundaries", () => {
    let cart = [buildCartItem(royalHamper, 2, false)];

    // Valid update
    const updated = updateCartItemQuantity(cart, "PRD-10001", false, 5);
    assert.strictEqual(updated[0].quantity, 5);
    assert.strictEqual(updated[0].itemSubtotal, 2499 * 5);

    // Below 1 rejected
    assert.throws(() => {
      updateCartItemQuantity(cart, "PRD-10001", false, 0);
    }, /lower than 1/);

    // Over stock (10) rejected
    assert.throws(() => {
      updateCartItemQuantity(cart, "PRD-10001", false, 15);
    }, /Only 10 units available/);
  });

  // 12. ITEM REMOVAL
  runTest("Removes product line item correctly", () => {
    const item1 = buildCartItem(royalHamper, 1, false);
    const item2 = buildCartItem(brassBox, 1, false);
    const cart = [item1, item2];

    const updated = removeCartItem(cart, "PRD-10001", false);
    assert.strictEqual(updated.length, 1);
    assert.strictEqual(updated[0].productId, "PRD-10006");
  });

  // 13. TOGGLE GIFT WRAPPING IN CART
  runTest("Toggling gift wrapping updates line total and handles collision merge", () => {
    const itemNoWrap = buildCartItem(royalHamper, 2, false);
    const cart = [itemNoWrap];

    // Toggle wrap on
    const withWrap = toggleCartItemGiftWrap(cart, "PRD-10001", false, true, royalHamper);
    assert.strictEqual(withWrap[0].giftWrappingSelected, true);
    assert.strictEqual(withWrap[0].total, (2499 * 2) + (150 * 2));

    // Collision test: when cart has 1 wrapped and 1 unwrapped, toggling merges them
    const itemA = buildCartItem(royalHamper, 1, false);
    const itemB = buildCartItem(royalHamper, 2, true);
    const twoLinesCart = [itemA, itemB];

    const merged = toggleCartItemGiftWrap(twoLinesCart, "PRD-10001", false, true, royalHamper);
    assert.strictEqual(merged.length, 1);
    assert.strictEqual(merged[0].quantity, 3);
    assert.strictEqual(merged[0].giftWrappingSelected, true);
  });

  // 14. FIRESTORE PERSISTENCE & CLOUD CART (Async)
  await runAsyncTest("Saves and retrieves cloud cart from Firestore", async () => {
    const testCustomerId = `TEST-CUS-${Date.now()}`;
    const testItems = [
      buildCartItem(royalHamper, 2, true),
      buildCartItem(brassBox, 1, false),
    ];
    const summary = calculateCartSummary(testItems);

    // Save to Firestore
    await saveCloudCart(testCustomerId, {
      items: testItems,
      productSubtotal: summary.productSubtotal,
      giftWrappingTotal: summary.giftWrappingTotal,
      grandTotal: summary.grandTotal,
      totalItems: summary.totalItems,
    });

    // Retrieve from Firestore
    const loaded = await getCloudCart(testCustomerId);
    assert.ok(loaded);
    assert.strictEqual(loaded.customerId, testCustomerId);
    assert.strictEqual(loaded.items.length, 2);
    assert.strictEqual(loaded.items[0].productId, "PRD-10001");
    assert.strictEqual(loaded.items[0].giftWrappingSelected, true);
    assert.strictEqual(loaded.items[0].giftWrappingPrice, 150);
    assert.strictEqual(loaded.items[1].productId, "PRD-10006");
    assert.strictEqual(loaded.items[1].giftWrappingSelected, false);
    assert.strictEqual(loaded.productSubtotal, summary.productSubtotal);
    assert.strictEqual(loaded.giftWrappingTotal, summary.giftWrappingTotal);
    assert.strictEqual(loaded.grandTotal, summary.grandTotal);

    // Clean up
    await clearCloudCart(testCustomerId);
    const afterClear = await getCloudCart(testCustomerId);
    assert.strictEqual(afterClear, null);
  });

  // 15. GUEST CART MIGRATION ON LOGIN (Async)
  await runAsyncTest("Migrates and merges guest cart into customer Cloud Cart atomically", async () => {
    const testCustomerId = `TEST-MIGRATE-${Date.now()}`;
    const initialCloudItems = [
      buildCartItem(royalHamper, 1, true),
    ];
    await saveCloudCart(testCustomerId, { items: initialCloudItems });

    // Guest items from localStorage: 1 more Royal Hamper (wrapped) + 1 Brass Box
    const guestItems = [
      buildCartItem(royalHamper, 2, true),
      buildCartItem(brassBox, 1, false),
    ];

    // Merge on login
    const mergedResult = await mergeGuestCartWithCloudCart(testCustomerId, guestItems);
    assert.ok(mergedResult);
    assert.strictEqual(mergedResult.items.length, 2); // 1 royal hamper merged, 1 brass box added

    const mergedRoyal = mergedResult.items.find((x) => x.productId === "PRD-10001");
    assert.strictEqual(mergedRoyal.quantity, 3); // 1 + 2 = 3
    assert.strictEqual(mergedRoyal.giftWrappingSelected, true);

    const mergedBrass = mergedResult.items.find((x) => x.productId === "PRD-10006");
    assert.strictEqual(mergedBrass.quantity, 1);

    // Clean up
    await clearCloudCart(testCustomerId);
  });

  // 16. FETCH ACTIVE CATALOG & PRODUCT DETAILS (Async)
  await runAsyncTest("Fetches active products from catalog via productController", async () => {
    const product = await fetchProductDetails("PRD-10001");
    assert.ok(product);
    assert.strictEqual(product.productId, "PRD-10001");
    assert.strictEqual(product.status, "active");
    assert.strictEqual(product.giftWrappingAvailable, true);
    assert.strictEqual(product.giftWrappingPrice, 150);
  });

  console.log(`\n=================================================`);
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} Tests Passed (100%)`);
  console.log(`=================================================`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
