// Talks to the product catalog API.
//
// Set VITE_APPS_SCRIPT_URL in client/.env to your deployed Apps Script Web
// App URL (ends in /exec) to read the sheet directly, with no Express
// server involved. If it's not set, falls back to the Express backend at
// "/api/..." (proxied to http://localhost:4000 in dev, see vite.config.js).

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${url}`);
  return res.json();
}

export async function getAllProducts() {
  if (APPS_SCRIPT_URL) {
    return fetchJson(`${APPS_SCRIPT_URL}?type=all`);
  }
  return fetchJson("/api/products");
}

export async function getProductsByCategory(category) {
  if (APPS_SCRIPT_URL) {
    return fetchJson(`${APPS_SCRIPT_URL}?type=category&value=${encodeURIComponent(category)}`);
  }
  return fetchJson(`/api/products/${encodeURIComponent(category)}`);
}

export async function getProductById(productId) {
  if (APPS_SCRIPT_URL) {
    return fetchJson(`${APPS_SCRIPT_URL}?type=id&value=${encodeURIComponent(productId)}`);
  }
  return fetchJson(`/api/products/id/${encodeURIComponent(productId)}`);
}
