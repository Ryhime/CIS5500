import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CityCard from "../components/CityCard";

/** Empty string = same origin in dev (Vite proxies API routes). */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function CityOverview() {
  const [params] = useSearchParams();
  const cityName = params.get("city")?.trim() ?? "";

  const [city, setCity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cityName) return;

    let cancelled = false;
    const url = `${API_BASE}/cities/${encodeURIComponent(cityName)}`;

    (async () => {
      setLoading(true);
      setError(null);
      setCity(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const rows = await res.json();
        if (cancelled) return;
        const firstRow = Array.isArray(rows) ? rows[0] : null;
        setCity(firstRow ?? null);
      } catch {
        if (cancelled) return;
        setError("Could not load city overview from the API.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityName]);

  return (
    <div>
      <h1>City overview{cityName ? `: ${cityName}` : ""}</h1>
      <p>
        <Link to="/">← Back to search</Link>
      </p>
      {!cityName && <p>Search for a city from the home page to view details.</p>}
      {cityName && loading && <p>Loading...</p>}
      {cityName && error && <p role="status">{error}</p>}
      {cityName && !loading && !error && !city && (
        <p>No city details found for "{cityName}".</p>
      )}
      {city && (
        <>
          <p style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link to={`/hotels?city=${encodeURIComponent(cityName)}`}>View hotels</Link>
            <Link to={`/safety?city=${encodeURIComponent(cityName)}`}>View safety</Link>
            <Link to={`/reviews?city=${encodeURIComponent(cityName)}`}>View reviews</Link>
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: "1rem" }}>
              <CityCard city={city} />
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
