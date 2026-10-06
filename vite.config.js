import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxies /api requests to the Express server during development so the
// frontend can call relative paths like "/api/products" without CORS hassle.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
