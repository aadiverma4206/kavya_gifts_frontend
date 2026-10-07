import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase/app", "firebase/firestore", "firebase/auth", "firebase/storage"],
          three: ["three"],
          charts: ["recharts"],
          ui: ["lucide-react", "sonner"],
        },
      },
    },
  },
});
