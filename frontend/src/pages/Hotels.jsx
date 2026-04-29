import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import HotelList from "../components/HotelList";

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
    <div>
      <h1>Hotels{city ? ` in ${city}` : ""}</h1>
      <p>
        <Link to="/">← Back to search</Link>
      </p>
      {city && (
        <p>
          <Link to={`/cities?city=${encodeURIComponent(city)}`}>← Back to city overview</Link>
        </p>
      )}
      {loading && <p>Loading…</p>}
      {city && error && <p role="status">{error}</p>}
      {!city && (
        <p>Enter a city on the home page to load hotels for that city.</p>
      )}
      {city && !loading && usedMock && !error && (
        <p>No rows returned; showing sample hotels.</p>
      )}
      {city && <HotelList hotels={displayHotels} />}
    </div>
  );
}
