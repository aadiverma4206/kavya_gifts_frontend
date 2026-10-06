import { Link } from "react-router-dom";
import "./CategoryCard.css";

export default function CategoryCard({ category }) {
  return (
    <Link to={`/category/${encodeURIComponent(category)}`} className="category-card card">
      <span>{category}</span>
    </Link>
  );
}
