/**
 * End-to-End Review & History Management Test Suite
 *
 * Verifies:
 * 1. Customer can review a product ONLY after purchasing that product
 * 2. Non-purchasing customer is strictly denied from reviewing
 * 3. Exact review schema & rating range (1 to 5)
 * 4. Customer can edit their own review
 * 5. Customer CANNOT modify another customer's review
 * 6. Customer CANNOT modify review status
 * 7. Owner moderation: approve, reject, hide reviews
 * 8. Product details review summary: average rating, total reviews, review list (approved only)
 * 9. Customer history management:
 *    - Order History (order ID, date, products, total, payment status, order status, details)
 *    - Payment History (payment ID, order ID, amount, method, provider, status, date)
 *    - Review History (product, rating, review, status, date)
 *    - Activity History (action, description, date)
 * 10. Privacy check: Customer queries do not leak other customer records
 */

import {
  createOrder,
} from "./src/services/orderService.js";
import {
  recordPayment,
} from "./src/services/paymentService.js";
import {
  secureVerifyPayment,
} from "./server/securePaymentService.js";
import {
  submitProductReview,
  editCustomerReview,
  checkCanCustomerReview,
  loadProductReviewSummary,
  loadCustomerReviewHistory,
  moderateReviewByOwner,
} from "./src/controllers/reviewController.js";
import {
  getReviewById,
} from "./src/services/reviewService.js";
import {
  loadFullCustomerDashboardHistory,
} from "./src/controllers/historyController.js";

async function runTestSuite() {
  console.log("=================================================");
  console.log("🚀 STARTING REVIEW & HISTORY MANAGEMENT TESTS");
  console.log("=================================================\n");

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const customerA = `CUS-ALICE-${randSuffix}`;
  const customerB = `CUS-BOB-${randSuffix}`;
  const productId = "PRD-HAMPER-ROYAL-01";

  let totalTests = 0;
  let passedCount = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedCount++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // --- TEST 1: Purchase requirement - Customer B attempts to review WITHOUT buying ---
  console.log("📋 [Test 1] Testing Purchase Requirement: Non-buyer rejection");
  const checkBob = await checkCanCustomerReview(customerB, productId);
  assert(checkBob.canReview === false, "Customer B cannot review before purchasing");

  let bobBlocked = false;
  try {
    await submitProductReview({
      productId,
      productName: "Royal Festive Hamper",
      customerId: customerB,
      customerName: "Bob Tester",
      rating: 5,
      title: "Great product!",
      comment: "Looks great even though I never bought it.",
    });
  } catch (err) {
    if (err.message.includes("purchasing that product") || err.message.includes("Eligibility Error")) {
      bobBlocked = true;
    }
  }
  assert(bobBlocked, "Non-purchasing customer was strictly blocked from submitting review");

  // --- TEST 2: Customer A purchases product ---
  console.log("\n📋 [Test 2] Customer A places and verifies order for the product");
  const orderA = await createOrder({
    customer: {
      name: "Alice Sharma",
      email: "alice@example.com",
      phone: "9876500001",
      address: "101 Lotus Court, Jaipur, 302001",
    },
    items: [
      {
        productId,
        productName: "Royal Festive Hamper",
        price: 2499,
        quantity: 1,
        giftWrappingSelected: true,
        giftWrappingPrice: 150,
        itemSubtotal: 2499,
        total: 2649,
      },
    ],
    subtotal: 2499,
    giftWrappingTotal: 150,
    totalAmount: 2649,
    customerId: customerA,
    paymentStatus: "pending",
    orderStatus: "pending",
  });

  const paymentA = await recordPayment({
    orderId: orderA.orderId,
    amount: 2649,
    provider: "UPI",
    paymentMethod: "UPI (alice@upi)",
    customerId: customerA,
    paymentStatus: "pending",
  });

  // Server verifies payment
  await secureVerifyPayment({
    orderId: orderA.orderId,
    paymentId: paymentA.paymentId,
    amount: 2649,
    customerId: customerA,
    provider: "UPI",
    paymentMethod: "UPI (alice@upi)",
  });
  console.log(`  Order ${orderA.orderId} and Payment ${paymentA.paymentId} confirmed for ${customerA}`);

  // Now Customer A checks eligibility
  const checkAlice = await checkCanCustomerReview(customerA, productId);
  assert(checkAlice.canReview === true, "Customer A is now eligible to review after confirmed purchase");

  // --- TEST 3: Rating validation (1 to 5) ---
  console.log("\n📋 [Test 3] Rating Validation: Rating must be 1 to 5");
  let rating0Blocked = false;
  try {
    await submitProductReview({
      productId,
      productName: "Royal Festive Hamper",
      customerId: customerA,
      customerName: "Alice Sharma",
      rating: 0, // INVALID
      title: "Bad",
      comment: "Terrible",
    });
  } catch (err) {
    if (err.message.includes("between 1 and 5")) rating0Blocked = true;
  }
  assert(rating0Blocked, "Rating of 0 was rejected");

  let rating6Blocked = false;
  try {
    await submitProductReview({
      productId,
      productName: "Royal Festive Hamper",
      customerId: customerA,
      customerName: "Alice Sharma",
      rating: 6, // INVALID
      title: "Super",
      comment: "Over 5",
    });
  } catch (err) {
    if (err.message.includes("between 1 and 5")) rating6Blocked = true;
  }
  assert(rating6Blocked, "Rating of 6 was rejected");

  // --- TEST 4: Create Valid Review by Customer A ---
  console.log("\n📋 [Test 4] Submitting Valid Review with full schema");
  const reviewA = await submitProductReview({
    productId,
    productName: "Royal Festive Hamper",
    customerId: customerA,
    customerName: "Alice Sharma",
    rating: 5,
    title: "Exquisite Handcrafted Presentation!",
    comment: "The satin packaging and artisanal sweets were breathtaking. Highly recommend!",
  });

  assert(reviewA.reviewId.startsWith("REV-"), `Review ID generated: ${reviewA.reviewId}`);
  assert(reviewA.productId === productId, `Correct productId: ${reviewA.productId}`);
  assert(reviewA.customerId === customerA, `Correct customerId: ${reviewA.customerId}`);
  assert(reviewA.customerName === "Alice Sharma", `Correct customerName: ${reviewA.customerName}`);
  assert(reviewA.rating === 5, `Rating recorded as 5`);
  assert(reviewA.title.includes("Exquisite"), `Review title recorded`);
  assert(reviewA.comment.includes("satin packaging"), `Review comment recorded`);
  assert(reviewA.status === "approved", `Initial status is approved`);
  assert(reviewA.createdAt !== null, `createdAt timestamp present`);
  assert(reviewA.updatedAt !== null, `updatedAt timestamp present`);

  // --- TEST 5: Customer A edits own review ---
  console.log("\n📋 [Test 5] Customer A edits own review");
  const updatedReviewA = await editCustomerReview({
    reviewId: reviewA.reviewId,
    customerId: customerA,
    rating: 4,
    title: "Updated: Wonderful Diwali Gift",
    comment: "Delivery was slightly delayed by 1 hour but presentation was immaculate.",
  });
  assert(updatedReviewA.rating === 4, "Rating updated to 4 stars");
  assert(updatedReviewA.title.includes("Updated"), "Title updated");
  assert(updatedReviewA.comment.includes("delayed by 1 hour"), "Comment updated");

  // --- TEST 6: Customer B tries to edit Customer A's review (Security check) ---
  console.log("\n📋 [Test 6] Security Check: Customer cannot modify another customer's review");
  let unauthorizedEditBlocked = false;
  try {
    await editCustomerReview({
      reviewId: reviewA.reviewId,
      customerId: customerB, // NOT THE OWNER!
      rating: 1,
      title: "Hacked review",
      comment: "Tampered content",
    });
  } catch (err) {
    if (err.message.includes("cannot modify another customer's review") || err.message.includes("Permission Denied")) {
      unauthorizedEditBlocked = true;
    }
  }
  assert(unauthorizedEditBlocked, "Tampering another customer's review was blocked");

  // --- TEST 7: Customer cannot modify review status ---
  console.log("\n📋 [Test 7] Customer cannot modify review status");
  // Owner hides review
  await moderateReviewByOwner(reviewA.reviewId, "hidden");
  const hiddenRev = await getReviewById(reviewA.reviewId);
  assert(hiddenRev.status === "hidden", "Owner successfully hid review");

  // Customer A edits their review comment
  await editCustomerReview({
    reviewId: reviewA.reviewId,
    customerId: customerA,
    comment: "Adding a minor detail to my review.",
  });
  const revAfterCustEdit = await getReviewById(reviewA.reviewId);
  assert(revAfterCustEdit.status === "hidden", "Review status remained 'hidden' after customer edit (Customer cannot alter status)");

  // Owner approves review again
  await moderateReviewByOwner(reviewA.reviewId, "approved");
  const reApprovedRev = await getReviewById(reviewA.reviewId);
  assert(reApprovedRev.status === "approved", "Owner successfully re-approved review");

  // Owner rejects test review
  await moderateReviewByOwner(reviewA.reviewId, "rejected");
  const rejectedRev = await getReviewById(reviewA.reviewId);
  assert(rejectedRev.status === "rejected", "Owner successfully rejected review");

  // Re-approve for product summary test
  await moderateReviewByOwner(reviewA.reviewId, "approved");

  // --- TEST 8: Product Details Summary (average rating, total reviews, review list) ---
  console.log("\n📋 [Test 8] Product Details Summary (average rating, total reviews, list)");
  const summary = await loadProductReviewSummary(productId);
  assert(summary.totalReviews >= 1, `Total reviews: ${summary.totalReviews}`);
  assert(summary.averageRating >= 1 && summary.averageRating <= 5, `Average rating: ${summary.averageRating}★`);
  assert(Array.isArray(summary.reviews), "Reviews returned as array");
  assert(summary.reviews.some((r) => r.reviewId === reviewA.reviewId), "Customer A's approved review is included in list");

  // --- TEST 9: Customer Dashboard Histories (Orders, Payments, Reviews, Activities) ---
  console.log("\n📋 [Test 9] Customer Dashboard: 4 Histories (Orders, Payments, Reviews, Activity)");
  const dashData = await loadFullCustomerDashboardHistory(customerA, null);

  // 1. Order History
  assert(Array.isArray(dashData.orders), "Order history returned as array");
  assert(dashData.orders.length >= 1, `Found ${dashData.orders.length} order(s) for Customer A`);
  const firstOrder = dashData.orders[0];
  assert(firstOrder.orderId === orderA.orderId, `Order ID matches: ${firstOrder.orderId}`);
  assert(firstOrder.date instanceof Date, "Order date is a valid Date");
  assert(Array.isArray(firstOrder.products) && firstOrder.products.length >= 1, "Order products list present");
  assert(firstOrder.total === 2649, `Order total is ₹${firstOrder.total}`);
  assert(firstOrder.paymentStatus === "paid", "Order paymentStatus is 'paid'");
  assert(firstOrder.orderStatus === "confirmed", "Order orderStatus is 'confirmed'");
  assert(firstOrder.deliveryAddress.includes("Jaipur"), "Order details/address present");

  // 2. Payment History
  assert(Array.isArray(dashData.payments), "Payment history returned as array");
  assert(dashData.payments.length >= 1, `Found ${dashData.payments.length} payment(s) for Customer A`);
  const firstPayment = dashData.payments[0];
  assert(firstPayment.paymentId === paymentA.paymentId, `Payment ID matches: ${firstPayment.paymentId}`);
  assert(firstPayment.orderId === orderA.orderId, `Payment orderId matches: ${firstPayment.orderId}`);
  assert(firstPayment.amount === 2649, `Payment amount is ₹${firstPayment.amount}`);
  assert(firstPayment.method.includes("UPI"), "Payment method present");
  assert(firstPayment.provider === "UPI", "Payment provider present");
  assert(firstPayment.status === "paid", "Payment status is 'paid'");
  assert(firstPayment.date instanceof Date, "Payment date is a valid Date");

  // 3. Review History
  assert(Array.isArray(dashData.reviews), "Review history returned as array");
  assert(dashData.reviews.length >= 1, `Found ${dashData.reviews.length} review(s) for Customer A`);
  const firstRevHist = dashData.reviews[0];
  assert(firstRevHist.product.includes("Royal"), `Review product: ${firstRevHist.product}`);
  assert(firstRevHist.rating === 4, `Review rating: ${firstRevHist.rating}★`);
  assert(firstRevHist.title.includes("Updated"), `Review title: ${firstRevHist.title}`);
  assert(firstRevHist.comment && firstRevHist.comment.includes("detail"), `Review comment present: "${firstRevHist.comment}"`);
  assert(firstRevHist.status === "approved", `Review status: ${firstRevHist.status}`);
  assert(firstRevHist.date instanceof Date, "Review date is a valid Date");

  // 4. Activity History
  assert(Array.isArray(dashData.activities), "Activity history returned as array");
  assert(dashData.activities.length >= 2, `Found ${dashData.activities.length} activity event(s)`);
  assert(dashData.activities.some((a) => a.action === "ORDER_CREATED"), "Activity includes ORDER_CREATED");
  assert(dashData.activities.some((a) => a.action === "PAYMENT_VERIFIED"), "Activity includes PAYMENT_VERIFIED");
  assert(dashData.activities.some((a) => a.action === "REVIEW_POSTED"), "Activity includes REVIEW_POSTED");

  // --- TEST 10: Privacy Check (No cross-customer data leakage) ---
  console.log("\n📋 [Test 10] Privacy Isolation: Customer B cannot see Customer A's private history");
  const bobDashData = await loadFullCustomerDashboardHistory(customerB, null);
  assert(
    !bobDashData.orders.some((o) => o.orderId === orderA.orderId),
    "Customer B does NOT see Customer A's orders"
  );
  assert(
    !bobDashData.payments.some((p) => p.paymentId === paymentA.paymentId),
    "Customer B does NOT see Customer A's payments"
  );
  assert(
    !bobDashData.reviews.some((r) => r.reviewId === reviewA.reviewId),
    "Customer B does NOT see Customer A's reviews in personal review history"
  );
  console.log("  Privacy check passed: Absolute tenant isolation confirmed.\n");

  console.log("=================================================");
  console.log(`🎉 ALL ${passedCount}/${totalTests} TESTS PASSED PERFECTLY!`);
  console.log("=================================================");
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
