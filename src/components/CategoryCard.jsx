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

function getCategoryIcon(name) {
  if (!name) return "🎁";
  if (CATEGORY_ICONS[name]) return CATEGORY_ICONS[name];
  const lower = name.toLowerCase();
  if (lower.includes("diwali") || lower.includes("festiv")) return "🪔";
  if (lower.includes("wed") || lower.includes("annivers")) return "💍";
  if (lower.includes("birth")) return "🎂";
  if (lower.includes("corp") || lower.includes("exec") || lower.includes("work")) return "💼";
  if (lower.includes("choc") || lower.includes("sweet")) return "🍫";
  if (lower.includes("perfum") || lower.includes("fragran") || lower.includes("scent")) return "🌸";
  if (lower.includes("flower") || lower.includes("bouquet") || lower.includes("rose")) return "💐";
  if (lower.includes("tea") || lower.includes("gourmet") || lower.includes("coffee") || lower.includes("snack")) return "🍵";
  if (lower.includes("baby") || lower.includes("mom") || lower.includes("parent")) return "🧸";
  if (lower.includes("well") || lower.includes("care") || lower.includes("spa")) return "🌿";
  if (lower.includes("lux")) return "👑";
  return "🎁";
}

export default function CategoryCard({ category }) {
  const name =
    typeof category === "object" && category !== null
      ? category.categoryName || category.name || category.category_name || "Collection"
      : String(category || "Collection");

  const icon = getCategoryIcon(name);

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
