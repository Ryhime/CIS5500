import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

/** Empty string = same origin in dev (Vite proxies API routes). */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function Reviews() {
  const [params] = useSearchParams();
  const cityName = params.get("city")?.trim() ?? "";

  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState("");
  const [reviews, setReviews] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cityName) return;
    let cancelled = false;
    const url = `${API_BASE}/cities/${encodeURIComponent(cityName)}/hotels`;

    (async () => {
      setLoadingHotels(true);
      setError(null);
      setHotels([]);
      setSelectedHotel("");
      setReviews([]);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const rows = await res.json();
        if (cancelled) return;
        const names = (Array.isArray(rows) ? rows : [])
          .map((row) => row.name)
          .filter(Boolean);
        setHotels(names);
        if (names.length > 0) setSelectedHotel(names[0]);
      } catch {
        if (!cancelled) setError("Could not load hotels for this city.");
      } finally {
        if (!cancelled) setLoadingHotels(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityName]);

  useEffect(() => {
    if (!selectedHotel) return;
    let cancelled = false;
    const url = `${API_BASE}/hotels/${encodeURIComponent(selectedHotel)}/reviews`;

    (async () => {
      setLoadingReviews(true);
      setError(null);
      setReviews([]);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const rows = await res.json();
        if (cancelled) return;
        setReviews(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setError("Could not load reviews for the selected hotel.");
      } finally {
        if (!cancelled) setLoadingReviews(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedHotel]);

  return (
    <div>
      <h1>Reviews{cityName ? ` in ${cityName}` : ""}</h1>
      <p>
        <Link to="/">← Back to search</Link>
      </p>
      {cityName && (
        <p>
          <Link to={`/cities?city=${encodeURIComponent(cityName)}`}>← Back to city overview</Link>
        </p>
      )}
      {!cityName && <p>Search for a city from the home page to view hotel reviews.</p>}
      {cityName && loadingHotels && <p>Loading hotels...</p>}
      {cityName && error && <p role="status">{error}</p>}
      {cityName && !loadingHotels && !error && hotels.length === 0 && (
        <p>No hotels found for "{cityName}".</p>
      )}
      {hotels.length > 0 && (
        <>
          <label htmlFor="hotel-select">Hotel:</label>{" "}
          <select
            id="hotel-select"
            value={selectedHotel}
            onChange={(e) => setSelectedHotel(e.target.value)}
          >
            {hotels.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </>
      )}
      {selectedHotel && loadingReviews && <p>Loading reviews...</p>}
      {selectedHotel && !loadingReviews && !error && reviews.length === 0 && (
        <p>No reviews found for "{selectedHotel}".</p>
      )}
      {reviews.length > 0 && (
        <ul style={{ paddingLeft: "1rem" }}>
          {reviews.slice(0, 20).map((r) => (
            <li key={r.id} style={{ marginBottom: "0.75rem" }}>
              <strong>{r.title || "Untitled review"}</strong>
              <div>By: {r.author || "Unknown"}{r.date ? ` on ${r.date}` : ""}</div>
              {r.overall_rating != null && <div>Overall rating: {r.overall_rating}</div>}
              {r.text && <div>{r.text}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
