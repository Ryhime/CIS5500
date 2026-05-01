import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar() {
  const [city, setCity] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    const q = city.trim();
    if (!q) return;
    navigate(`/cities?city=${encodeURIComponent(q)}`);
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <input
        id="city-search"
        className="search-input"
        type="search"
        aria-label="City name"
        placeholder="Try Tokyo, Paris, Boston…"
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <button type="submit" className="btn-primary">
        Search city
      </button>
    </form>
  );
}
