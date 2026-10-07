/**
 * Client-side visual captcha generator and validator.
 */
export function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function validateCaptcha(userInput, actualCode) {
  if (!userInput || !actualCode) return false;
  return userInput.trim().toUpperCase() === actualCode.trim().toUpperCase();
}
