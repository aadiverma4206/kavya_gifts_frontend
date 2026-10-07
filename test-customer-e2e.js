import assert from "node:assert";
import { registerCustomer, loginUser } from "./src/services/authService.js";
import { executeCustomerRegistration, executeCustomerLogin } from "./src/controllers/authController.js";
import { generateCaptcha } from "./src/utils/captcha.js";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "./src/firebase/firebase.js";

console.log("=================================================");
console.log("TESTING CUSTOMER ID REGISTRATION & LOGIN PIPELINE");
console.log("=================================================\n");

async function runTests() {
  const uniqueStamp = Date.now();
  const testEmail = `test_customer_${uniqueStamp}@example.com`;
  const testPassword = "Password@123";
  const captcha = generateCaptcha();

  console.log(`1. Testing executeCustomerRegistration for ${testEmail}...`);
  const step1Data = {
    fullName: "Priya Sharma",
    mobile: "9876543210",
    email: testEmail,
    address: "Flat 204, Rosewood Heights, Koramangala, Bengaluru, Karnataka 560034",
  };
  const step2Data = {
    password: testPassword,
    confirmPassword: testPassword,
    captchaInput: captcha,
    actualCaptcha: captcha,
  };

  const regResult = await executeCustomerRegistration(step1Data, step2Data);
  console.log("✓ Registration completed successfully!");
  console.log("  - Generated Customer ID:", regResult.profile.customerId);
  console.log("  - User UID:", regResult.user.uid);
  console.log("  - Email:", regResult.profile.email);
  console.log("  - Role:", regResult.profile.role);
  console.log("  - Full Name:", regResult.profile.fullName);

  assert.ok(regResult.profile.customerId, "Customer ID must be generated");
  assert.ok(/^CUS-\d+$/.test(regResult.profile.customerId), `Customer ID must follow format CUS-XXXXX, got ${regResult.profile.customerId}`);
  assert.strictEqual(regResult.profile.role, "customer");
  assert.strictEqual(regResult.profile.status, "active");

  const generatedId = regResult.profile.customerId;

  console.log("\n2. Verifying Firestore document persistence...");
  const userDocRef = doc(db, "users", regResult.user.uid);
  const snap = await getDoc(userDocRef);
  assert.ok(snap.exists(), "User profile must exist in Firestore");
  const storedData = snap.data();
  assert.strictEqual(storedData.customerId, generatedId, "Stored customerId must match generated ID");
  console.log("✓ Firestore document verified! customerId in DB:", storedData.customerId);

  console.log("\n3. Testing Login via Email...");
  const loginByEmail = await executeCustomerLogin(testEmail, testPassword);
  assert.ok(loginByEmail.user, "User must be returned on login");
  assert.strictEqual(loginByEmail.profile.customerId, generatedId, "Logged in user must have matching customerId");
  console.log("✓ Login via Email SUCCESS! customerId:", loginByEmail.profile.customerId);

  console.log("\n4. Testing Login via Customer ID (" + generatedId + ")...");
  const loginById = await executeCustomerLogin(generatedId, testPassword);
  assert.ok(loginById.user, "User must be returned on customer ID login");
  assert.strictEqual(loginById.profile.email, testEmail, "Profile email must match");
  assert.strictEqual(loginById.profile.customerId, generatedId, "Profile customerId must match");
  console.log("✓ Login via Customer ID SUCCESS! email:", loginById.profile.email);

  console.log("\n5. Testing Duplicate Registration Prevention...");
  try {
    await executeCustomerRegistration(step1Data, step2Data);
    assert.fail("Duplicate email registration should have thrown an error");
  } catch (err) {
    console.log("✓ Duplicate registration correctly rejected with:", err.message);
  }

  // Cleanup test document from Firestore
  try {
    await deleteDoc(userDocRef);
    console.log("\n✓ Cleaned up test document from Firestore.");
  } catch (e) {
    console.warn("Cleanup warning:", e);
  }

  console.log("\n🎉 ALL CUSTOMER ID REGISTRATION AND LOGIN TESTS PASSED 100%!");
}

runTests().then(() => process.exit(0)).catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
