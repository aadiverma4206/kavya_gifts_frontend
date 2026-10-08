import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import AnnouncementBar from "./components/AnnouncementBar.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/common/ProtectedRoute.jsx";
import ScrollToTop from "./components/common/ScrollToTop.jsx";

// Public Storefront Pages
import Home from "./pages/Home.jsx";
import Category from "./pages/Category.jsx";
import Product from "./pages/Product.jsx";
import Cart from "./pages/Cart.jsx";
import NotFound from "./pages/NotFound.jsx";

// Customer Auth & Portal Pages
import Register from "./pages/customer/Register.jsx";
import Login from "./pages/customer/Login.jsx";
import CustomerDashboard from "./pages/customer/CustomerDashboard.jsx";
import Checkout from "./pages/customer/Checkout.jsx";
import Payment from "./pages/customer/Payment.jsx";
import OrderConfirmation from "./pages/customer/OrderConfirmation.jsx";
import OrderHistory from "./pages/customer/OrderHistory.jsx";
import ProductReview from "./pages/customer/ProductReview.jsx";
import ProfileManagement from "./pages/customer/ProfileManagement.jsx";

// Owner Management Pages
import OwnerLogin from "./pages/owner/OwnerLogin.jsx";
import OwnerDashboard from "./pages/owner/OwnerDashboard.jsx";
import ProductManagement from "./pages/owner/ProductManagement.jsx";
import CategoryManagement from "./pages/owner/CategoryManagement.jsx";
import OrderManagement from "./pages/owner/OrderManagement.jsx";
import PaymentHistory from "./pages/owner/PaymentHistory.jsx";
import UserManagement from "./pages/owner/UserManagement.jsx";
import ReviewManagement from "./pages/owner/ReviewManagement.jsx";
import SettingsManagement from "./pages/owner/SettingsManagement.jsx";

export default function App() {
  const location = useLocation();
  const isOwnerRoute = location.pathname.startsWith("/owner");

  return (
    <>
      <ScrollToTop />
      <Toaster position="top-right" richColors closeButton />

      {/* Customer Storefront Chrome: only visible outside Owner portal */}
      {!isOwnerRoute && (
        <>
          <AnnouncementBar />
          <Header />
        </>
      )}

      <main>
        <Routes>
          {/* Public Storefront */}
          <Route path="/" element={<Home />} />
          <Route path="/category/:name" element={<Category />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Customer Protected Workflow */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roleRequired="customer">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute roleRequired="customer">
                <Checkout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute roleRequired="customer">
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-confirmation/:orderId"
            element={
              <ProtectedRoute roleRequired="customer">
                <OrderConfirmation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute roleRequired="customer">
                <OrderHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review/:productId"
            element={
              <ProtectedRoute roleRequired="customer">
                <ProductReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roleRequired="customer">
                <ProfileManagement />
              </ProtectedRoute>
            }
          />

          {/* Owner Portal Routes */}
          <Route path="/owner/login" element={<OwnerLogin />} />
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute roleRequired="owner">
                <OwnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/products"
            element={
              <ProtectedRoute roleRequired="owner">
                <ProductManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/categories"
            element={
              <ProtectedRoute roleRequired="owner">
                <CategoryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/orders"
            element={
              <ProtectedRoute roleRequired="owner">
                <OrderManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/payments"
            element={
              <ProtectedRoute roleRequired="owner">
                <PaymentHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/users"
            element={
              <ProtectedRoute roleRequired="owner">
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/reviews"
            element={
              <ProtectedRoute roleRequired="owner">
                <ReviewManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/settings"
            element={
              <ProtectedRoute roleRequired="owner">
                <SettingsManagement />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {!isOwnerRoute && <Footer />}
    </>
  );
}
