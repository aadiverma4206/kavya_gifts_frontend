/**
 * End-to-End Payment Workflow Test Suite
 *
 * Validates:
 * 1. Successful payment flow (pending -> paid, orderStatus pending -> confirmed, exact schema)
 * 2. Failed payment flow (pending -> failed) & retry recovery
 * 3. Cancelled payment flow (pending -> cancelled)
 * 4. Duplicate payment callback / Idempotency
 * 5. Refresh after payment (retrieving confirmed order by ID)
 * 6. Order history query by customerId
 * 7. Security: Tampered payment amount rejection & invalid signature rejection
 */

import {
  createOrder,
  getOrderById,
  getOrdersByCustomer,
} from "./src/services/orderService.js";
import { recordPayment } from "./src/services/paymentService.js";
import {
  generateServerPaymentSignature,
  secureVerifyPayment,
  secureRecordPaymentFailure,
  secureRecordPaymentCancellation,
} from "./server/securePaymentService.js";
import { retryPaymentForOrder } from "./src/controllers/paymentController.js";

async function runTestSuite() {
  console.log("=================================================");
  console.log("🚀 STARTING CHECKOUT & PAYMENT WORKFLOW TESTS");
  console.log("=================================================\n");

  const testCustId = "CUS-PAYTEST-" + Math.floor(1000 + Math.random() * 9000);
  let passedCount = 0;
  let totalTests = 0;

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

  // --- SCENARIO 1: SUCCESSFUL PAYMENT FLOW ---
  console.log("📋 [Scenario 1] Testing Successful Payment Flow");
  const testItems = [
    {
      productId: "PRD-TEST-001",
      productName: "Royal Festive Hamper",
      price: 1500,
      quantity: 2,
      giftWrappingSelected: true,
      giftWrappingPrice: 150,
      itemSubtotal: 3000,
      total: 3300,
    },
  ];
  const subtotal = 3000;
  const giftWrappingTotal = 300;
  const totalAmount = 3300;

  // 1. Initial Order Creation
  const order1 = await createOrder({
    customer: {
      name: "Aaditya Verma",
      email: "aaditya@example.com",
      phone: "9876543210",
      address: "B-42, Gulmohar Enclave, New Delhi, 110049",
    },
    items: testItems,
    subtotal,
    giftWrap: {
      enabled: true,
      optionId: "royal-gold",
      optionName: "Royal Gold Silk Wrap",
      message: "Happy Celebrations!",
      recipientName: "Kavya",
      fee: giftWrappingTotal,
    },
    giftWrappingTotal,
    totalAmount,
    customerId: testCustId,
    paymentStatus: "pending",
    orderStatus: "pending",
  });

  assert(order1.orderId.startsWith("ORD-"), `Order ID generated: ${order1.orderId}`);
  assert(order1.orderStatus === "pending", `Initial orderStatus is 'pending'`);
  assert(order1.paymentStatus === "pending", `Initial paymentStatus is 'pending'`);
  assert(order1.totalAmount === 3300, `Order totalAmount is ₹${order1.totalAmount}`);
  assert(order1.deliveryAddress.includes("New Delhi"), `Delivery address recorded`);

  // 2. Initial Payment Creation
  const payment1 = await recordPayment({
    orderId: order1.orderId,
    amount: totalAmount,
    provider: "UPI",
    paymentMethod: "UPI (aaditya@okhdfcbank)",
    customerId: testCustId,
    paymentStatus: "pending",
  });

  assert(payment1.paymentId.startsWith("PAY-"), `Payment ID generated: ${payment1.paymentId}`);
  assert(payment1.paymentStatus === "pending", `Initial paymentStatus is 'pending'`);
  assert(payment1.amount === 3300, `Payment amount is ₹${payment1.amount}`);

  // 3. Server Cryptographic Signature
  const signature1 = generateServerPaymentSignature(
    `${order1.orderId}|${totalAmount}|${payment1.paymentId}`
  );
  assert(signature1 && signature1.length === 64, `Cryptographic HMAC-SHA256 signature generated`);

  // 4. Secure Server Verification
  const verifyRes1 = await secureVerifyPayment({
    orderId: order1.orderId,
    paymentId: payment1.paymentId,
    amount: totalAmount,
    customerId: testCustId,
    provider: "UPI",
    providerPaymentId: "UPI-TXN-998811",
    paymentMethod: "UPI (aaditya@okhdfcbank)",
    signature: signature1,
  });

  assert(verifyRes1.verified === true, `Server verified payment successfully`);
  assert(verifyRes1.paymentStatus === "paid", `Response paymentStatus is 'paid'`);
  assert(verifyRes1.orderStatus === "confirmed", `Response orderStatus is 'confirmed'`);

  // 5. Verify Database Records
  const verifiedOrder1 = await getOrderById(order1.orderId);
  assert(verifiedOrder1.orderStatus === "confirmed", `Database orderStatus transitioned to 'confirmed'`);
  assert(verifiedOrder1.paymentStatus === "paid", `Database paymentStatus transitioned to 'paid'`);
  assert(verifiedOrder1.paymentId === payment1.paymentId, `Database order.paymentId references ${payment1.paymentId}`);
  console.log("  ✓ Scenario 1 completed successfully.\n");

  // --- SCENARIO 2: FAILED PAYMENT FLOW & RETRY RECOVERY ---
  console.log("📋 [Scenario 2] Testing Failed Payment Flow & Retry Recovery");
  const order2 = await createOrder({
    customer: {
      name: "Rohit Sharma",
      email: "rohit@example.com",
      phone: "9123456780",
      address: "12 Marine Drive, Mumbai, 400020",
    },
    items: testItems,
    subtotal: 1500,
    giftWrappingTotal: 0,
    totalAmount: 1500,
    customerId: testCustId,
    paymentStatus: "pending",
    orderStatus: "pending",
  });

  const payment2 = await recordPayment({
    orderId: order2.orderId,
    amount: 1500,
    provider: "Card",
    paymentMethod: "Card (ending 4111)",
    customerId: testCustId,
    paymentStatus: "pending",
  });

  // Record failure
  const failRes = await secureRecordPaymentFailure({
    orderId: order2.orderId,
    paymentId: payment2.paymentId,
    reason: "Transaction declined: Insufficient funds in account",
  });
  assert(failRes.paymentStatus === "failed", `Payment failure recorded as 'failed'`);

  const failedOrder = await getOrderById(order2.orderId);
  assert(failedOrder.paymentStatus === "failed", `Database order paymentStatus is 'failed'`);

  // Test Retry Recovery
  console.log("  Testing payment retry recovery...");
  const retryPaymentResult = await retryPaymentForOrder({
    orderId: order2.orderId,
    provider: "UPI",
    paymentMethod: "UPI (rohit@okaxis)",
    customerId: testCustId,
  });
  assert(retryPaymentResult.paymentId.startsWith("PAY-"), `New payment initiated for retry: ${retryPaymentResult.paymentId}`);
  assert(retryPaymentResult.paymentStatus === "pending", `Retry payment starts in 'pending' status`);

  const orderAfterRetry = await getOrderById(order2.orderId);
  assert(orderAfterRetry.paymentStatus === "pending", `Order reset to 'pending' for retry authorization`);
  console.log("  ✓ Scenario 2 completed successfully.\n");

  // --- SCENARIO 3: CANCELLED PAYMENT FLOW ---
  console.log("📋 [Scenario 3] Testing Cancelled Payment Flow");
  const order3 = await createOrder({
    customer: {
      name: "Neha Gupta",
      email: "neha@example.com",
      phone: "9988776655",
      address: "7th Avenue, Indiranagar, Bengaluru, 560038",
    },
    items: testItems,
    subtotal: 2000,
    giftWrappingTotal: 100,
    totalAmount: 2100,
    customerId: testCustId,
    paymentStatus: "pending",
    orderStatus: "pending",
  });

  const payment3 = await recordPayment({
    orderId: order3.orderId,
    amount: 2100,
    provider: "NetBanking",
    paymentMethod: "Net Banking (HDFC)",
    customerId: testCustId,
    paymentStatus: "pending",
  });

  const cancelRes = await secureRecordPaymentCancellation({
    orderId: order3.orderId,
    paymentId: payment3.paymentId,
  });
  assert(cancelRes.paymentStatus === "cancelled", `Payment cancellation recorded as 'cancelled'`);

  const cancelledOrder = await getOrderById(order3.orderId);
  assert(cancelledOrder.paymentStatus === "cancelled", `Database order paymentStatus is 'cancelled'`);
  console.log("  ✓ Scenario 3 completed successfully.\n");

  // --- SCENARIO 4: DUPLICATE PAYMENT CALLBACK (IDEMPOTENCY) ---
  console.log("📋 [Scenario 4] Testing Duplicate Payment Callback / Idempotency");
  // Calling verification again on order1 which is already paid
  const dupVerifyRes = await secureVerifyPayment({
    orderId: order1.orderId,
    paymentId: payment1.paymentId,
    amount: totalAmount,
    customerId: testCustId,
    provider: "UPI",
    providerPaymentId: "UPI-TXN-998811",
    paymentMethod: "UPI (aaditya@okhdfcbank)",
    signature: signature1,
  });

  assert(dupVerifyRes.verified === true, `Duplicate callback verified successfully`);
  assert(dupVerifyRes.isIdempotent === true, `Duplicate callback recognized as idempotent (isIdempotent: true)`);
  assert(dupVerifyRes.orderStatus === "confirmed", `Order status remains confirmed`);
  console.log("  ✓ Scenario 4 completed successfully.\n");

  // --- SCENARIO 5: REFRESH AFTER PAYMENT (GET ORDER BY ID) ---
  console.log("📋 [Scenario 5] Testing Hard Refresh / Direct Load of Paid Order");
  const refreshedOrder = await getOrderById(order1.orderId);
  assert(refreshedOrder !== null, `Order loaded by ID: ${order1.orderId}`);
  assert(refreshedOrder.orderId === order1.orderId, `Loaded orderId matches`);
  assert(refreshedOrder.orderStatus === "confirmed", `Status is 'confirmed'`);
  assert(refreshedOrder.paymentStatus === "paid", `Payment status is 'paid'`);
  assert(refreshedOrder.totalAmount === 3300, `Total amount preserved: ₹${refreshedOrder.totalAmount}`);
  assert(refreshedOrder.giftWrappingTotal === 300, `Gift wrapping total preserved: ₹${refreshedOrder.giftWrappingTotal}`);
  assert(refreshedOrder.items.length === 1, `Items preserved correctly`);
  assert(refreshedOrder.customerSnapshot.name === "Aaditya Verma", `Customer snapshot name preserved`);
  console.log("  ✓ Scenario 5 completed successfully.\n");

  // --- SCENARIO 6: CUSTOMER ORDER HISTORY QUERY ---
  console.log("📋 [Scenario 6] Testing Customer Order History Retrieval");
  const customerOrders = await getOrdersByCustomer(testCustId);
  assert(Array.isArray(customerOrders), `Order history returned as array`);
  assert(customerOrders.length >= 3, `Retrieved ${customerOrders.length} orders for test customer`);
  
  const hasConfirmed = customerOrders.some((o) => o.orderStatus === "confirmed" && o.paymentStatus === "paid");
  assert(hasConfirmed, `Order history contains confirmed & paid orders`);

  const hasCancelled = customerOrders.some((o) => o.paymentStatus === "cancelled");
  assert(hasCancelled, `Order history contains cancelled orders`);
  console.log("  ✓ Scenario 6 completed successfully.\n");

  // --- SCENARIO 7: SECURITY & INTEGRITY CHECKS ---
  console.log("📋 [Scenario 7] Testing Security Integrity (Tampered Amounts & Signatures)");
  // 1. Amount Tamper Check
  let amountTamperCaught = false;
  try {
    const tamperedOrder = await createOrder({
      customer: { name: "Hacker", email: "h@bad.com", phone: "9000000000", address: "Dark Web" },
      items: testItems,
      subtotal: 5000,
      totalAmount: 5000,
      customerId: testCustId,
      paymentStatus: "pending",
      orderStatus: "pending",
    });
    const tamperedPayment = await recordPayment({
      orderId: tamperedOrder.orderId,
      amount: 5000,
      customerId: testCustId,
      paymentStatus: "pending",
    });

    // Malicious client tries to verify paying ₹1 instead of ₹5000
    await secureVerifyPayment({
      orderId: tamperedOrder.orderId,
      paymentId: tamperedPayment.paymentId,
      amount: 1, // TAMPERED AMOUNT!
      customerId: testCustId,
    });
  } catch (err) {
    if (err.message.includes("Security Error") && err.message.includes("does not match")) {
      amountTamperCaught = true;
    }
  }
  assert(amountTamperCaught, `Server rejected tampered payment amount`);

  // 2. Signature Forgery Check
  let signatureTamperCaught = false;
  try {
    const sigOrder = await createOrder({
      customer: { name: "Test Sig", email: "s@test.com", phone: "9111111111", address: "Pune" },
      items: testItems,
      subtotal: 1000,
      totalAmount: 1000,
      customerId: testCustId,
      paymentStatus: "pending",
      orderStatus: "pending",
    });
    const sigPayment = await recordPayment({
      orderId: sigOrder.orderId,
      amount: 1000,
      customerId: testCustId,
      paymentStatus: "pending",
    });

    // Malicious client sends a fake signature
    await secureVerifyPayment({
      orderId: sigOrder.orderId,
      paymentId: sigPayment.paymentId,
      amount: 1000,
      customerId: testCustId,
      signature: "fake_forged_signature_000000000000000000000000000000000000000000",
    });
  } catch (err) {
    if (err.message.includes("Invalid cryptographic payment signature")) {
      signatureTamperCaught = true;
    }
  }
  assert(signatureTamperCaught, `Server rejected forged payment signature`);
  console.log("  ✓ Scenario 7 completed successfully.\n");

  console.log("=================================================");
  console.log(`🎉 ALL ${passedCount}/${totalTests} TESTS PASSED PERFECTLY!`);
  console.log("=================================================");
}

runTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
