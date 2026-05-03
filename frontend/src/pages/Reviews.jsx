import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageNavLinks from "../components/PageNavLinks";

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
      await Promise.resolve();
      if (cancelled) return;
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
      await Promise.resolve();
      if (cancelled) return;
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
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Guest voice</p>
        <h1 className="page-title">
          {cityName ? `Reviews · ${cityName}` : "Reviews"}
        </h1>
        <p className="page-lede">
          Pick a hotel in this city, then load real review rows from the API.
        </p>
      </header>



      {cityName && <PageNavLinks cityName={cityName} />}

      {!cityName && (
        <div className="card card-muted">
          <p className="card-body">
            Search for a city from the home page to view hotel reviews.
          </p>
        </div>
      )}
      {cityName && loadingHotels && <p className="status-line">Loading hotels…</p>}
      {cityName && error && (
        <p className="status-line status-error" role="status">
          {error}
        </p>
      )}
      {cityName && !loadingHotels && !error && hotels.length === 0 && (
        <div className="card card-muted">
          <p className="card-body">
            No hotels found for &ldquo;{cityName}&rdquo;.
          </p>
        </div>
      )}
      {hotels.length > 0 && (
        <div className="reviews-toolbar">
          <label htmlFor="hotel-select">Hotel</label>
          <select
            id="hotel-select"
            className="select-input"
            value={selectedHotel}
            onChange={(e) => setSelectedHotel(e.target.value)}
          >
            {hotels.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}
      {selectedHotel && loadingReviews && (
        <p className="status-line">Loading reviews…</p>
      )}
      {selectedHotel && !loadingReviews && !error && reviews.length === 0 && (
        <p className="status-line">
          No reviews found for &ldquo;{selectedHotel}&rdquo;.
        </p>
      )}
      {reviews.length > 0 && (
        <ul className="review-list">
          {reviews.slice(0, 20).map((r, idx) => (
            <li key={r.id ?? `rev-${idx}`} className="review-card">
              <h3>{r.title || "Untitled review"}</h3>
              <div className="review-meta">
                {r.author || "Unknown"}
                {r.date ? ` · ${r.date}` : ""}
              </div>
              {r.overall_rating != null && (
                <div className="review-rating">Overall {r.overall_rating}</div>
              )}
              {r.text && <p className="review-text">{r.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
