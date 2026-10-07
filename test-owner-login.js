import { loginOwnerAccount } from "./src/services/authService.js";

async function testOwnerLoginDirect() {
  console.log("Testing Owner Login with provided credentials...");
  console.log("Email: kavyachakradhari711@gmail.com");

  try {
    const result = await loginOwnerAccount("kavyachakradhari711@gmail.com", "Admin@1234");
    console.log("✓ LOGIN SUCCESSFUL!");
    console.log("User UID:", result.user.uid);
    console.log("Email:", result.user.email);
    console.log("Role:", result.profile.role);
    console.log("Status:", result.profile.status);
    console.log("Full Name:", result.profile.fullName);
  } catch (err) {
    console.error("✗ LOGIN FAILED:", err);
    process.exit(1);
  }
}

testOwnerLoginDirect().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
