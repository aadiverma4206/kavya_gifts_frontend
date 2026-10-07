import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function paymentServerPlugin() {
  return {
    name: "payment-api-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/payments/")) {
          return next();
        }

        let body = {};
        if (req.method === "POST") {
          const buffers = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const raw = Buffer.concat(buffers).toString();
          try {
            body = JSON.parse(raw);
          } catch {
            body = {};
          }
        }

        res.setHeader("Content-Type", "application/json");

        try {
          const pathname = req.url.split("?")[0];
          const paymentModule = await import("./server/securePaymentService.js");

          if (pathname === "/api/payments/create-intent") {
            const { orderId, amount, paymentId } = body;
            const signature = paymentModule.generateServerPaymentSignature(`${orderId}|${amount}|${paymentId}`);
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, signature }));
          }

          if (pathname === "/api/payments/verify") {
            const result = await paymentModule.secureVerifyPayment(body);
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, result }));
          }

          if (pathname === "/api/payments/fail") {
            const result = await paymentModule.secureRecordPaymentFailure(body);
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, result }));
          }

          if (pathname === "/api/payments/cancel") {
            const result = await paymentModule.secureRecordPaymentCancellation(body);
            res.statusCode = 200;
            return res.end(JSON.stringify({ success: true, result }));
          }

          res.statusCode = 404;
          return res.end(JSON.stringify({ success: false, error: "Endpoint not found" }));
        } catch (err) {
          console.error("[Payment Server Error]:", err.message);
          res.statusCode = 400;
          return res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), paymentServerPlugin()],
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
