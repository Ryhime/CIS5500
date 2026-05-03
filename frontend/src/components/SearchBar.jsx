import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function SearchBar() {
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/cities`)
      .then((r) => r.json())
      .then((rows) => setCities(rows.map((r) => r.city)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const q = city.trim();
    if (!q) return;
    navigate(`/cities?city=${encodeURIComponent(q)}`);
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <select
        className="search-input"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        disabled={loading}
        aria-label="City name"
      >
        <option value="">{loading ? "Loading cities…" : "Select a city…"}</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-primary" disabled={!city}>
        Search city
      </button>
    </form>
  );
}
