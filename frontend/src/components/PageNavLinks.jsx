import { Link } from "react-router-dom";

export default function PageNavLinks({ cityName }) {
  if (!cityName) return null;
  const q = `?city=${encodeURIComponent(cityName)}`;
  return (
    <nav className="page-nav" aria-label="City sections">
      <Link className="pill-link" to={`/cities${q}`}>
        Overview
      </Link>
      <Link className="pill-link" to={`/hotels${q}`}>
        Hotels
      </Link>
      <Link className="pill-link" to={`/reviews${q}`}>
        Reviews
      </Link>
    </nav>
  );
}
