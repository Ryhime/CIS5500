import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CityLeafletMap from "../components/CityLeafletMap";
import PageNavLinks from "../components/PageNavLinks";

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
        setCity(Array.isArray(rows) ? rows[0] ?? null : null);
      } catch {
        if (!cancelled) setError("Could not load city location.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [cityName]);

  const lat = city?.latitude;
  const lng = city?.longitude;
  const hasCoords =
    lat != null && lng != null &&
    Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Explore</p>
        <h1 className="page-title">
          {cityName ? `${cityName}` : "City map"}
        </h1>
      </header>

      {cityName && <PageNavLinks cityName={cityName} />}

      {cityName && loading && <p className="status-line">Loading map…</p>}
      {cityName && error && (
        <p className="status-line status-error" role="status">{error}</p>
      )}
      {cityName && !loading && !error && !hasCoords && (
        <div className="card card-muted">
          <p className="card-body">No location data found for &ldquo;{cityName}&rdquo;.</p>
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
