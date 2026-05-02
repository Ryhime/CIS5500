import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import HotelList from "../components/HotelList";
import PageNavLinks from "../components/PageNavLinks";

const MOCK_HOTELS = [
  { name: "Hotel Beacon", rating: 4.5 },
  { name: "Example Inn", rating: 4.2 },
];

/** Empty string = same origin in dev (Vite proxies /cities and /hotels to the API). */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function Hotels() {
  const [params] = useSearchParams();
  const city = params.get("city")?.trim() ?? "";

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usedMock, setUsedMock] = useState(false);

  useEffect(() => {
    if (!city) return;

    let cancelled = false;
    const url = `${API_BASE}/cities/${encodeURIComponent(city)}/hotels/average_ratings`;

    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setUsedMock(false);

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const rows = await res.json();
        if (cancelled) return;
        const normalized = (Array.isArray(rows) ? rows : []).map((row) => ({
          name: row.name,
          rating: row.average_rating ?? row.rating ?? null,
        }));
        setHotels(normalized.length ? normalized : MOCK_HOTELS);
        setUsedMock(!normalized.length);
      } catch {
        if (cancelled) return;
        setHotels(MOCK_HOTELS);
        setUsedMock(true);
        setError("Could not reach the API; showing mock hotels.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [city]);

  const displayHotels = city ? hotels : [];

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Stays</p>
        <h1 className="page-title">
          {city ? `Hotels in ${city}` : "Hotels"}
        </h1>
        <p className="page-lede">
          Average guest ratings from your reviews data, sorted for each city.
        </p>
      </header>



      {city && <PageNavLinks cityName={city} />}

      {city && loading && <p className="status-line">Loading…</p>}
      {city && error && (
        <p className="status-line status-error" role="status">
          {error}
        </p>
      )}
      {!city && (
        <div className="card card-muted">
          <p className="card-body">
            Enter a city on the home page to load hotels for that city.
          </p>
        </div>
      )}
      {city && !loading && usedMock && !error && (
        <p className="status-line">No rows returned; showing sample hotels.</p>
      )}
      {city && !loading && <HotelList hotels={displayHotels} />}
    </main>
  );
}
