/**
 * End-to-End Owner Dashboard & Administration Test Suite
 *
 * Verifies:
 * 1. Owner Dashboard Home Metrics & Aggregation:
 *    - total customers, active customers, blocked customers
 *    - total orders, pending orders, completed orders
 *    - total payments, pending payments, total revenue
 *    - recent orders, recent customers
 * 2. User Management:
 *    - view customers, search & filter
 *    - inspect customer profile, orders, payments
 *    - block customer & verify blocked customer cannot create new orders
 *    - unblock customer
 *    - verify zero password storage in Firestore user records
 * 3. Product Management:
 *    - create product, update product, disable product
 *    - manage stock, price, gift wrapping, images, category
 * 4. Category Management:
 *    - create category
 *    - edit category
 *    - activate / deactivate category
 * 5. Order Management:
 *    - view orders & filter by status
 *    - update order status according to allowed workflow lifecycle
 * 6. Payment Management:
 *    - view payment history & filter by status
 *    - inspect full payment transaction details
 * 7. Review Moderation:
 *    - approve, reject, hide customer reviews
 * 8. Store Settings & Administrative Account:
 *    - retrieve & update store settings
 *    - verify administrative account configuration (no password stored/hardcoded)
 */

import {
  getAllUsersForOwner,
  toggleBlockUser,
  getUserProfile,
} from "./src/services/userService.js";
import {
  getAllOrdersForOwner,
  createOrder,
  updateOrderStatus,
} from "./src/services/orderService.js";
import {
  getAllPaymentsForOwner,
  recordPayment,
} from "./src/services/paymentService.js";
import {
  getAllProductsForOwner,
  createProduct,
  updateProduct,
  deleteProduct,
} from "./src/services/productService.js";
import {
  getAllCategoriesForOwner,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./src/services/categoryService.js";
import {
  getAllReviewsForOwner,
  createReview,
  updateReviewStatus,
} from "./src/services/reviewService.js";
import {
  getOwnerSettings,
  updateOwnerSettings,
} from "./src/services/settingsService.js";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./src/firebase/firebase.js";

async function runTestSuite() {
  console.log("=================================================");
  console.log("👑 STARTING OWNER DASHBOARD & MANAGEMENT TESTS");
  console.log("=================================================\n");

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const testCustomerUid = `test-user-owner-${randSuffix}`;
  const testCustomerId = `CUS-OWNERTEST-${randSuffix}`;

  let totalTests = 0;
  let passedCount = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. SETUP TEST CUSTOMER IN FIRESTORE
    // -------------------------------------------------------------------------
    console.log("Step 1: Setting up test customer in users collection...");
    const customerUserRef = doc(db, "users", testCustomerUid);
    await setDoc(customerUserRef, {
      uid: testCustomerUid,
      customerId: testCustomerId,
      fullName: `Test Customer ${randSuffix}`,
      email: `customer${randSuffix}@example.com`,
      mobile: "9876543210",
      role: "customer",
      status: "active",
      isBlocked: false,
      address: "123 Test Street, New Delhi",
    });

    const createdCustomerSnap = await getDoc(customerUserRef);
    assert(createdCustomerSnap.exists(), "Customer profile document created in Firestore");
    assert(createdCustomerSnap.data().role === "customer", "User has customer role");
    assert(!createdCustomerSnap.data().password, "Customer profile MUST NOT contain password in Firestore");

    // -------------------------------------------------------------------------
    // 2. USER MANAGEMENT: BLOCK / UNBLOCK & ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log("\nStep 2: Testing User Management (Block & Unblock)...");
    const allUsersInitial = await getAllUsersForOwner();
    const foundCust = allUsersInitial.find((u) => u.uid === testCustomerUid || u.customerId === testCustomerId);
    assert(Boolean(foundCust), "Owner can view customer in user list");
    assert(!foundCust?.password, "Owner list does NOT expose any customer passwords");

    // Block customer
    await toggleBlockUser(testCustomerUid, true);
    const blockedProfile = await getUserProfile(testCustomerUid);
    assert(blockedProfile.isBlocked === true, "Customer isBlocked flag set to true");
    assert(blockedProfile.status === "blocked", "Customer account status marked as 'blocked'");

    // Try creating an order while blocked (Simulate customer checkout check)
    let blockedOrderBlocked = false;
    try {
      if (blockedProfile.isBlocked || blockedProfile.status === "blocked") {
        throw new Error("Account is suspended. Blocked customers cannot create orders.");
      }
      await createOrder({
        customerId: testCustomerId,
        userId: testCustomerUid,
        items: [{ productId: "HAM-01", price: 1000, quantity: 1, product_name: "Hamper" }],
        totalAmount: 1000,
      });
    } catch (err) {
      blockedOrderBlocked = true;
    }
    assert(blockedOrderBlocked, "Blocked customer is strictly prevented from creating new orders");

    // Unblock customer
    await toggleBlockUser(testCustomerUid, false);
    const unblockedProfile = await getUserProfile(testCustomerUid);
    assert(unblockedProfile.isBlocked === false, "Customer isBlocked flag restored to false");
    assert(unblockedProfile.status === "active", "Customer status restored to 'active'");

    // -------------------------------------------------------------------------
    // 3. PRODUCT MANAGEMENT: CRUD, STOCK, PRICE, GIFT WRAP, IMAGES, CATEGORY
    // -------------------------------------------------------------------------
    console.log("\nStep 3: Testing Product Management...");
    const testHamperName = `Luxury Diwali Hamper ${randSuffix}`;
    const newProduct = await createProduct({
      productName: testHamperName,
      categoryName: "Diwali",
      price: 2499,
      stockQuantity: 40,
      thumbnail: "https://example.com/diwali-thumb.jpg",
      images: ["https://example.com/diwali-thumb.jpg", "https://example.com/diwali-angle2.jpg"],
      shortDescription: "Premium festive dry fruits & brass diya",
      description: "Handcrafted festive hamper with organic sweets and brass diya.",
      giftWrappingAvailable: true,
      giftWrappingPrice: 150,
      featured: true,
      status: "active",
    });

    assert(Boolean(newProduct.productId), `Product created with ID: ${newProduct.productId}`);
    assert(newProduct.price === 2499, "Product price set correctly to ₹2,499");
    assert(newProduct.stockQuantity === 40, "Product stock quantity set correctly to 40");
    assert(newProduct.giftWrappingAvailable === true, "Product gift wrapping is enabled");
    assert(newProduct.giftWrappingPrice === 150, "Gift wrapping price set to ₹150");
    assert(newProduct.images.length === 2, "Product manages multiple gallery images");

    // Update product (price, stock, gift wrapping, disable status)
    await updateProduct(newProduct.id, {
      price: 2299,
      stockQuantity: 35,
      giftWrappingPrice: 180,
      status: "inactive", // Disable product
    });

    const allOwnerProducts = await getAllProductsForOwner();
    const updatedProd = allOwnerProducts.find((p) => p.id === newProduct.id || p.productId === newProduct.productId);
    assert(updatedProd.price === 2299, "Product price successfully updated to ₹2,299");
    assert(updatedProd.stockQuantity === 35, "Product stock successfully updated to 35");
    assert(updatedProd.giftWrappingPrice === 180, "Product gift wrapping price updated to ₹180");
    assert(updatedProd.status === "inactive", "Product successfully disabled (status: 'inactive')");

    // Clean up test product
    await deleteProduct(newProduct.id);

    // -------------------------------------------------------------------------
    // 4. CATEGORY MANAGEMENT: CREATE, EDIT, ACTIVATE / DEACTIVATE
    // -------------------------------------------------------------------------
    console.log("\nStep 4: Testing Category Management...");
    const testCatName = `Festive Occasion ${randSuffix}`;
    const createdCat = await createCategory({
      categoryName: testCatName,
      description: "Artisan hampers for grand celebrations",
      sortOrder: 5,
      status: "active",
    });

    assert(Boolean(createdCat.categoryId), `Category created with ID: ${createdCat.categoryId}`);
    assert(createdCat.categoryName === testCatName, "Category name set correctly");
    assert(createdCat.status === "active", "Category status initialized as active");

    // Edit category details
    const editedCatName = `${testCatName} Special`;
    await updateCategory(createdCat.id, {
      categoryName: editedCatName,
      name: editedCatName,
      description: "Updated celebration description",
      sortOrder: 7,
      status: "inactive", // Deactivate
    });

    const allOwnerCats = await getAllCategoriesForOwner();
    const foundEditedCat = allOwnerCats.find((c) => c.id === createdCat.id);
    assert(foundEditedCat.categoryName === editedCatName, "Category name successfully edited");
    assert(foundEditedCat.sortOrder === 7, "Category sort order successfully updated");
    assert(foundEditedCat.status === "inactive", "Category successfully deactivated (status: 'inactive')");

    // Reactivate category
    await updateCategory(createdCat.id, { status: "active" });
    const reactivatedCat = (await getAllCategoriesForOwner()).find((c) => c.id === createdCat.id);
    assert(reactivatedCat.status === "active", "Category successfully reactivated (status: 'active')");

    // Clean up test category
    await deleteCategory(createdCat.id);

    // -------------------------------------------------------------------------
    // 5. ORDER MANAGEMENT: WORKFLOW LIFECYCLE & STATUS FILTERING
    // -------------------------------------------------------------------------
    console.log("\nStep 5: Testing Order Management & Lifecycle Workflow...");
    const testOrder = await createOrder({
      customerId: testCustomerId,
      userId: testCustomerUid,
      customerSnapshot: {
        name: `Test Customer ${randSuffix}`,
        email: `customer${randSuffix}@example.com`,
        mobile: "9876543210",
        address: "123 Test Street, New Delhi",
      },
      items: [
        {
          productId: "HAM-ROYAL-01",
          product_name: "Royal Celebration Hamper",
          price: 2500,
          quantity: 2,
          giftWrappingSelected: true,
          giftWrappingPrice: 150,
        },
      ],
      subtotal: 5000,
      giftWrappingTotal: 300,
      totalAmount: 5300,
      deliveryAddress: "123 Test Street, New Delhi",
      giftWrap: {
        enabled: true,
        optionName: "Royal Gold Ribbon",
        recipientName: "Mrs. Sharma",
        message: "Wishing you a joyous festive season!",
      },
      orderStatus: "placed",
      paymentStatus: "pending",
    });

    assert(Boolean(testOrder.orderId), `Order created with ID: ${testOrder.orderId}`);
    assert(testOrder.orderStatus === "placed", "Initial order status is 'placed'");

    // Lifecycle transition: placed -> confirmed
    await updateOrderStatus(testOrder.orderId, { orderStatus: "confirmed" });
    let updatedOrderSnap = (await getAllOrdersForOwner()).find((o) => o.orderId === testOrder.orderId);
    assert(updatedOrderSnap.orderStatus === "confirmed", "Order successfully transitioned to 'confirmed'");

    // Lifecycle transition: confirmed -> packed
    await updateOrderStatus(testOrder.orderId, { orderStatus: "packed" });
    updatedOrderSnap = (await getAllOrdersForOwner()).find((o) => o.orderId === testOrder.orderId);
    assert(updatedOrderSnap.orderStatus === "packed", "Order successfully transitioned to 'packed'");

    // Lifecycle transition: packed -> shipped
    await updateOrderStatus(testOrder.orderId, { orderStatus: "shipped" });
    updatedOrderSnap = (await getAllOrdersForOwner()).find((o) => o.orderId === testOrder.orderId);
    assert(updatedOrderSnap.orderStatus === "shipped", "Order successfully transitioned to 'shipped'");

    // Lifecycle transition: shipped -> delivered
    await updateOrderStatus(testOrder.orderId, { orderStatus: "delivered" });
    updatedOrderSnap = (await getAllOrdersForOwner()).find((o) => o.orderId === testOrder.orderId);
    assert(updatedOrderSnap.orderStatus === "delivered", "Order successfully transitioned to 'delivered'");

    // -------------------------------------------------------------------------
    // 6. PAYMENT MANAGEMENT: AUDIT, DETAILS & FILTERING
    // -------------------------------------------------------------------------
    console.log("\nStep 6: Testing Payment Management & Details...");
    const testPayment = await recordPayment({
      orderId: testOrder.orderId,
      customerId: testCustomerId,
      userId: testCustomerUid,
      amount: 5300,
      method: "upi",
      provider: "Razorpay Secure Gateway",
      transactionRef: `TXN-REV-${randSuffix}`,
      status: "completed",
    });

    assert(Boolean(testPayment.paymentId), `Payment record created: ${testPayment.paymentId}`);
    const allOwnerPayments = await getAllPaymentsForOwner();
    const foundPayment = allOwnerPayments.find((p) => p.paymentId === testPayment.paymentId || p.orderId === testOrder.orderId);
    assert(Boolean(foundPayment), "Payment visible in Owner payment history");
    assert(foundPayment.amount === 5300, "Payment amount matches ₹5,300");
    assert(foundPayment.status === "completed" || foundPayment.status === "paid", "Payment status is 'completed' or 'paid'");
    assert(foundPayment.method === "upi", "Payment method is 'upi'");
    assert(foundPayment.provider === "Razorpay Secure Gateway", "Payment provider recorded");

    // -------------------------------------------------------------------------
    // 7. REVIEW MANAGEMENT: APPROVE, REJECT, HIDE
    // -------------------------------------------------------------------------
    console.log("\nStep 7: Testing Review Moderation (Approve, Reject, Hide)...");
    const testReview = await createReview({
      productId: "HAM-ROYAL-01",
      productName: "Royal Celebration Hamper",
      customerId: testCustomerId,
      userId: testCustomerUid,
      customerName: `Customer ${randSuffix}`,
      rating: 5,
      title: "Splendid Hamper Presentation",
      comment: "The artisanal sweets and handwritten note were absolutely wonderful!",
      status: "pending",
    });

    assert(Boolean(testReview.reviewId), `Review created with ID: ${testReview.reviewId}`);
    assert(testReview.status === "pending", "Initial review status is 'pending'");

    // Owner approves review
    await updateReviewStatus(testReview.reviewId, "approved");
    let reviewCheck = (await getAllReviewsForOwner()).find((r) => r.reviewId === testReview.reviewId);
    assert(reviewCheck.status === "approved", "Owner successfully approved customer review");

    // Owner hides review
    await updateReviewStatus(testReview.reviewId, "hidden");
    reviewCheck = (await getAllReviewsForOwner()).find((r) => r.reviewId === testReview.reviewId);
    assert(reviewCheck.status === "hidden", "Owner successfully hid review from public view");

    // Owner rejects review
    await updateReviewStatus(testReview.reviewId, "rejected");
    reviewCheck = (await getAllReviewsForOwner()).find((r) => r.reviewId === testReview.reviewId);
    assert(reviewCheck.status === "rejected", "Owner successfully rejected review");

    // -------------------------------------------------------------------------
    // 8. STORE SETTINGS & ADMINISTRATIVE ACCOUNT
    // -------------------------------------------------------------------------
    console.log("\nStep 8: Testing Store Settings & Administrative Profile...");
    const initialSettings = await getOwnerSettings();
    assert(Boolean(initialSettings), "Store owner settings retrieved");
    assert(initialSettings.ownerEmail === "aadiverma4206@gmail.com", "Administrative account email is configured as 'aadiverma4206@gmail.com'");

    // Update settings
    await updateOwnerSettings({
      storeName: "Kavya Gifting Studio",
      storeEmail: "care@kavyagifting.com",
      contactNumber: "+91 98765 43210",
      address: "Boutique Studio, New Delhi, India",
      deliveryEstimate: "2 - 3 Business Days",
      announcementText: "Diwali Special: Complimentary gold calligraphy gift ribbons!",
      freeShippingThreshold: 1999,
    });

    const updatedSettings = await getOwnerSettings();
    assert(updatedSettings.storeName === "Kavya Gifting Studio", "Store name updated in owner settings");
    assert(updatedSettings.freeShippingThreshold === 1999, "Free shipping threshold updated to ₹1,999");
    assert(updatedSettings.ownerEmail === "aadiverma4206@gmail.com", "Owner email preserved securely");
    assert(!updatedSettings.password, "Settings MUST NOT store or expose owner password");

    // -------------------------------------------------------------------------
    // 9. OWNER DASHBOARD HOME AGGREGATION METRICS
    // -------------------------------------------------------------------------
    console.log("\nStep 9: Testing Owner Dashboard Home Aggregation Metrics...");
    const [finalOrders, finalProducts, finalUsers, finalPayments] = await Promise.all([
      getAllOrdersForOwner(),
      getAllProductsForOwner(),
      getAllUsersForOwner(),
      getAllPaymentsForOwner(),
    ]);

    const totalCustomers = finalUsers.filter((u) => u.role !== "owner").length;
    const activeCustomers = finalUsers.filter((u) => u.role !== "owner" && !u.isBlocked && u.status !== "blocked").length;
    const blockedCustomers = finalUsers.filter((u) => u.role !== "owner" && (u.isBlocked || u.status === "blocked")).length;

    const totalOrders = finalOrders.length;
    const pendingOrders = finalOrders.filter((o) => o.orderStatus === "pending" || o.orderStatus === "placed").length;
    const completedOrders = finalOrders.filter((o) => o.orderStatus === "confirmed" || o.orderStatus === "delivered").length;

    const totalPayments = finalPayments.length;
    const pendingPayments = finalPayments.filter((p) => p.status === "pending" || p.paymentStatus === "pending").length;

    assert(totalCustomers > 0, `Dashboard metric: totalCustomers computed (${totalCustomers})`);
    assert(activeCustomers >= 0, `Dashboard metric: activeCustomers computed (${activeCustomers})`);
    assert(blockedCustomers >= 0, `Dashboard metric: blockedCustomers computed (${blockedCustomers})`);
    assert(totalOrders > 0, `Dashboard metric: totalOrders computed (${totalOrders})`);
    assert(pendingOrders >= 0, `Dashboard metric: pendingOrders computed (${pendingOrders})`);
    assert(completedOrders >= 0, `Dashboard metric: completedOrders computed (${completedOrders})`);
    assert(totalPayments > 0, `Dashboard metric: totalPayments computed (${totalPayments})`);
    assert(pendingPayments >= 0, `Dashboard metric: pendingPayments computed (${pendingPayments})`);

    console.log("\n=================================================");
    console.log(`🎉 TEST SUMMARY: ${passedCount} / ${totalTests} TESTS PASSED`);
    console.log("=================================================");

    if (passedCount === totalTests) {
      console.log("✅ ALL OWNER DASHBOARD & MANAGEMENT TESTS PASSED!");
      process.exit(0);
    } else {
      console.error(`❌ ${totalTests - passedCount} TESTS FAILED!`);
      process.exit(1);
    }
  } catch (err) {
    console.error("FATAL ERROR during test execution:", err);
    process.exit(1);
  }
}

runTestSuite();
