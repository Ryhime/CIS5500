import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CityLeafletMap from "../components/CityLeafletMap";

/** Empty string = same origin in dev (Vite proxies API routes). */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function Map() {
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
      await Promise.resolve();
      if (cancelled) return;
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
        if (!cancelled) setError("Could not load city location from the API.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityName]);

  const lat = city?.latitude;
  const lng = city?.longitude;
  const hasCoords =
    lat != null &&
    lng != null &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Explore</p>
        <h1 className="page-title">
          {cityName ? `Map · ${cityName}` : "City map"}
        </h1>
        <p className="page-lede">
          Coordinates come from your city overview API. Search a city first,
          then open this page to see it on the map.
        </p>
      </header>

      <nav className="page-nav" aria-label="Section">
        <Link className="link-back" to="/">
          Home
        </Link>
        {cityName && (
          <>
            <span className="page-nav-sep" aria-hidden>
              ·
            </span>
            <Link
              className="link-back"
              to={`/cities?city=${encodeURIComponent(cityName)}`}
            >
              City overview
            </Link>
          </>
        )}
      </nav>

      {!cityName && (
        <div className="card card-muted">
          <p className="card-body">
            Search for a city from the home page to drop a pin on the map.
          </p>
        </div>
      )}

      {cityName && loading && <p className="status-line">Loading map data…</p>}
      {cityName && error && (
        <p className="status-line status-error" role="status">
          {error}
        </p>
      )}
      {cityName && !loading && !error && !hasCoords && (
        <div className="card card-muted">
          <p className="card-body">
            No coordinates found for &ldquo;{cityName}&rdquo;. Try another
            spelling or a city that exists in the population dataset.
          </p>
        </div>
      )}

      {hasCoords && (
        <section className="map-section" aria-label="City map">
          <CityLeafletMap
            lat={Number(lat)}
            lng={Number(lng)}
            label={city?.city ? `${city.city}, ${city.country ?? ""}`.trim() : cityName}
          />
          <p className="map-meta">
            {Number(lat).toFixed(4)}°, {Number(lng).toFixed(4)}°
          </p>
        </section>
      )}
    </main>
  );
}
