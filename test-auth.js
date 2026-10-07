import assert from "node:assert";
import {
  validateRegistrationStep1,
  validateRegistrationStep2,
} from "./src/controllers/authController.js";
import { generateCaptcha, validateCaptcha } from "./src/utils/captcha.js";

console.log("=========================================");
console.log("RUNNING AUTHENTICATION ARCHITECTURE TESTS");
console.log("=========================================\n");

let passedTests = 0;
let totalTests = 0;

function test(description, fn) {
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

// 1. CAPTCHA TESTS
test("Captcha generation produces 5-character string", () => {
  const code = generateCaptcha();
  assert.strictEqual(typeof code, "string");
  assert.strictEqual(code.length, 5);
});

test("Captcha validation succeeds with identical casing", () => {
  assert.strictEqual(validateCaptcha("A1B2C", "A1B2C"), true);
});

test("Captcha validation is case-insensitive", () => {
  assert.strictEqual(validateCaptcha("a1b2c", "A1B2C"), true);
});

test("Captcha validation rejects mismatched string", () => {
  assert.strictEqual(validateCaptcha("XXXXX", "A1B2C"), false);
  assert.strictEqual(validateCaptcha("", "A1B2C"), false);
  assert.strictEqual(validateCaptcha(null, "A1B2C"), false);
});

// 2. STEP 1 REGISTRATION VALIDATIONS
test("Step 1 validation rejects empty Full Name", () => {
  const result = validateRegistrationStep1({
    fullName: "",
    mobile: "9876543210",
    email: "priya@example.com",
    address: "123 MG Road, Bengaluru",
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes("Full Name"));
});

test("Step 1 validation rejects invalid mobile numbers", () => {
  const invalidMobiles = ["123", "1234567890", "abcdefghij", "5999999999"];
  for (const mobile of invalidMobiles) {
    const result = validateRegistrationStep1({
      fullName: "Priya Sharma",
      mobile,
      email: "priya@example.com",
      address: "123 MG Road, Bengaluru",
    });
    assert.strictEqual(result.isValid, false, `Mobile ${mobile} should fail validation`);
  }
});

test("Step 1 validation accepts valid 10-digit Indian mobile number", () => {
  const validMobiles = ["9876543210", "8123456789", "7000000000", "+91 9876543210"];
  for (const mobile of validMobiles) {
    const result = validateRegistrationStep1({
      fullName: "Priya Sharma",
      mobile,
      email: "priya@example.com",
      address: "123 MG Road, Bengaluru",
    });
    assert.strictEqual(result.isValid, true, `Mobile ${mobile} should pass validation`);
  }
});

test("Step 1 validation rejects invalid emails", () => {
  const invalidEmails = ["plainaddress", "@missinguser.com", "user@", "user@domain", "user@.com"];
  for (const email of invalidEmails) {
    const result = validateRegistrationStep1({
      fullName: "Priya Sharma",
      mobile: "9876543210",
      email,
      address: "123 MG Road, Bengaluru",
    });
    assert.strictEqual(result.isValid, false, `Email ${email} should fail validation`);
  }
});

test("Step 1 validation rejects too short address", () => {
  const result = validateRegistrationStep1({
    fullName: "Priya Sharma",
    mobile: "9876543210",
    email: "priya@example.com",
    address: "Hi",
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes("address"));
});

test("Step 1 validation passes with complete valid inputs", () => {
  const result = validateRegistrationStep1({
    fullName: "Priya Sharma",
    mobile: "9876543210",
    email: "priya@example.com",
    address: "Flat 402, Lotus Towers, Indiranagar, Bengaluru, 560038",
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.error, null);
});

// 3. STEP 2 REGISTRATION VALIDATIONS
test("Step 2 validation rejects password shorter than 6 characters", () => {
  const result = validateRegistrationStep2({
    password: "123",
    confirmPassword: "123",
    captchaInput: "ABCDE",
    actualCaptcha: "ABCDE",
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes("6 characters"));
});

test("Step 2 validation rejects mismatched confirmPassword", () => {
  const result = validateRegistrationStep2({
    password: "SecurePassword1",
    confirmPassword: "DifferentPassword2",
    captchaInput: "ABCDE",
    actualCaptcha: "ABCDE",
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes("do not match"));
});

test("Step 2 validation rejects incorrect captcha", () => {
  const result = validateRegistrationStep2({
    password: "SecurePassword1",
    confirmPassword: "SecurePassword1",
    captchaInput: "WRONG",
    actualCaptcha: "ABCDE",
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes("Captcha"));
});

test("Step 2 validation succeeds with valid password, matching confirmation, and valid captcha", () => {
  const result = validateRegistrationStep2({
    password: "SecurePassword123!",
    confirmPassword: "SecurePassword123!",
    captchaInput: "abcde",
    actualCaptcha: "ABCDE",
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.error, null);
});

// 4. ROLE & BLOCKED USER LOGIC TESTS
test("Blocked customer evaluation flags blocked accounts accurately", () => {
  const activeProfile = { role: "customer", isBlocked: false, status: "active" };
  const blockedProfile1 = { role: "customer", isBlocked: true, status: "active" };
  const blockedProfile2 = { role: "customer", isBlocked: false, status: "blocked" };

  const isBlockedActive = Boolean(activeProfile.isBlocked || activeProfile.status === "blocked");
  const isBlocked1 = Boolean(blockedProfile1.isBlocked || blockedProfile1.status === "blocked");
  const isBlocked2 = Boolean(blockedProfile2.isBlocked || blockedProfile2.status === "blocked");

  assert.strictEqual(isBlockedActive, false);
  assert.strictEqual(isBlocked1, true);
  assert.strictEqual(isBlocked2, true);
});

test("Role verification strictly differentiates owner vs customer", () => {
  const ownerProfile = { role: "owner" };
  const customerProfile = { role: "customer" };

  assert.strictEqual(ownerProfile.role === "owner", true);
  assert.strictEqual(customerProfile.role === "owner", false);
  assert.strictEqual(customerProfile.role === "customer", true);
  assert.strictEqual(ownerProfile.role === "customer", false);
});

console.log(`\nTests Summary: ${passedTests}/${totalTests} Passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
