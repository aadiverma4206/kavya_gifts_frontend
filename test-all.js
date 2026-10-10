/**
 * Unified Automated Test Suite Runner for Kavya Gifts
 * Runs all unit and end-to-end architecture verification tests sequentially.
 */

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const testSuites = [
  { name: "100+ Products Catalog Architecture", script: "test-100-products.js" },
  { name: "Authentication & Security Rules", script: "test-auth.js" },
  { name: "Cart & Gift Wrapping Workflow", script: "test-cart-workflow.js" },
  { name: "Customer Registration & Login Pipeline", script: "test-customer-e2e.js" },
  { name: "Payment & Cryptographic Verification", script: "test-payment-workflow.js" },
  { name: "Review & Customer History Isolation", script: "test-review-history-workflow.js" },
  { name: "Owner Dashboard & Store Administration", script: "test-owner-dashboard-workflow.js" },
];

async function runScript(suite) {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`\n=================================================`);
    console.log(`▶ RUNNING SUITE: ${suite.name}`);
    console.log(`  Script: ${suite.script}`);
    console.log(`=================================================`);

    const child = spawn("node", [suite.script], {
      cwd: __dirname,
      stdio: "inherit",
      shell: true,
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`\n✅ SUITE PASSED: ${suite.name}\n`);
        resolvePromise({ ...suite, passed: true });
      } else {
        console.error(`\n❌ SUITE FAILED (exit code ${code}): ${suite.name}\n`);
        resolvePromise({ ...suite, passed: false, code });
      }
    });

    child.on("error", (err) => {
      console.error(`\n❌ ERROR SPAWNING SUITE: ${suite.name}`, err);
      resolvePromise({ ...suite, passed: false, error: err });
    });
  });
}

async function runAll() {
  console.log("=================================================");
  console.log("🚀 STARTING COMPLETE KAVYA GIFTS TEST PIPELINE");
  console.log(`  Total suites to execute: ${testSuites.length}`);
  console.log("=================================================");

  const startTime = Date.now();
  const results = [];

  for (const suite of testSuites) {
    const res = await runScript(suite);
    results.push(res);
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const passedSuites = results.filter((r) => r.passed);
  const failedSuites = results.filter((r) => !r.passed);

  console.log("\n=================================================");
  console.log("📊 MASTER TEST EXECUTION SUMMARY");
  console.log("=================================================");
  console.log(`Time taken: ${durationSec}s`);
  console.log(`Suites executed: ${results.length}`);
  console.log(`Suites passed:   ${passedSuites.length}`);
  console.log(`Suites failed:   ${failedSuites.length}`);

  results.forEach((r, idx) => {
    const mark = r.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  ${idx + 1}. [${mark}] ${r.name}`);
  });

  console.log("=================================================");

  if (failedSuites.length > 0) {
    console.error(`❌ FAILURE: ${failedSuites.length} test suite(s) failed.`);
    process.exit(1);
  } else {
    console.log("🎉 ALL TEST SUITES PASSED WITH 100% SUCCESS!");
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error("FATAL MASTER TEST RUNNER ERROR:", err);
  process.exit(1);
});
