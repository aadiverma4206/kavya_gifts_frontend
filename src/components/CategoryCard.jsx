import { Link } from "react-router-dom";
import "./CategoryCard.css";

const CATEGORY_ICONS = {
  Diwali: "🪔",
  Wedding: "💍",
  Birthday: "🎂",
  Corporate: "💼",
  Anniversary: "✨",
  Celebration: "🎉",
  Luxury: "👑",
  Festive: "🪔",
  "Festive Celebrations": "🪔",
  "Weddings & Anniversaries": "💍",
  "Wellness & Self Care": "🌿",
  "Birthdays": "🎂",
  "Corporate & Keepsakes": "💼",
  "Artisanal Chocolates & Sweets": "🍫",
  "Luxury Perfumes & Fragrances": "🌸",
  "Preserved Flowers & Bouquets": "💐",
  "Gourmet Delights & Teas": "🍵",
  "Baby & New Parents": "🧸",
};

export default function CategoryCard({ category }) {
  const name =
    typeof category === "object" && category !== null
      ? category.categoryName || category.name || category.category_name || "Collection"
      : String(category || "Collection");

  const icon = CATEGORY_ICONS[name] || "🎁";

  return (
    <Link
      to={`/category/${encodeURIComponent(name)}`}
      className="category-card card"
      aria-label={`Explore ${name} hampers`}
    >
      <div className="category-card-content">
        <span className="category-icon" aria-hidden="true">{icon}</span>
        <span className="category-title">{name}</span>
        <span className="category-action">Explore &rarr;</span>
      </div>
    </Link>
  );
}
