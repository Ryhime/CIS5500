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
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
      <input
        id="city-search"
        type="search"
        aria-label="City name"
        placeholder="City name"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        style={{ flex: 1, maxWidth: "20rem" }}
      />
      <button type="submit">Search city</button>
    </form>
  );
}
