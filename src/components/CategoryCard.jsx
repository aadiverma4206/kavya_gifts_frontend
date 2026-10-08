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
};

export default function CategoryCard({ category }) {
  const name =
    typeof category === "object" && category !== null
      ? category.name || category.category_name || "Collection"
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
