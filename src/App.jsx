import { Routes, Route } from "react-router-dom";
import AnnouncementBar from "./components/AnnouncementBar.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import Home from "./pages/Home.jsx";
import Category from "./pages/Category.jsx";
import Product from "./pages/Product.jsx";
import Cart from "./pages/Cart.jsx";

export default function App() {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:name" element={<Category />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
