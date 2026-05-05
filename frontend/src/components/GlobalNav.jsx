import { Link, useLocation } from "react-router-dom";

export default function GlobalNav() {
  const location = useLocation();
  const path = location.pathname;

  function isActive(to) {
    if (to === "/") return path === "/";
    return path === to || path.startsWith(`${to}/`);
  }

  return (
    <header className="page-nav" style={{ padding: "0.85rem 1rem", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
      <nav className="page-nav" aria-label="Primary">
        <Link className="pill-link" to="/" aria-current={isActive("/") ? "page" : undefined}>
          Home
        </Link>
        <Link className="pill-link" to="/discover" aria-current={isActive("/discover") ? "page" : undefined}>
          Discover
        </Link>
        <Link className="pill-link" to="/hotels" aria-current={isActive("/hotels") ? "page" : undefined}>
          Hotels
        </Link>
        <Link className="pill-link" to="/reviews" aria-current={isActive("/reviews") ? "page" : undefined}>
          Reviews
        </Link>
      </nav>
    </header>
  );
}
