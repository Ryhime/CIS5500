import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageNavLinks from "../components/PageNavLinks";

/** Empty string = same origin in dev (Vite proxies API routes). */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function Reviews() {
  const [params] = useSearchParams();
  const cityName = params.get("city")?.trim() ?? "";
  const requestedHotel = params.get("hotel")?.trim() ?? "";

  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState("");
  const [reviews, setReviews] = useState([]);
  const [minOverall, setMinOverall] = useState(0);
  const [maxOverall, setMaxOverall] = useState(5);
  const [onlyWithText, setOnlyWithText] = useState(true);
  const [sort, setSort] = useState("date_desc"); // date_desc | rating_desc | helpful_desc
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [error, setError] = useState(null);

  function clamp(n, lo, hi) {
    const v = Number(n);
    if (!Number.isFinite(v)) return lo;
    return Math.min(hi, Math.max(lo, v));
  }

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
        if (requestedHotel && names.includes(requestedHotel)) {
          setSelectedHotel(requestedHotel);
        } else if (names.length > 0) {
          setSelectedHotel(names[0]);
        }
      } catch {
        if (!cancelled) setError("Could not load hotels for this city.");
      } finally {
        if (!cancelled) setLoadingHotels(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityName, requestedHotel]);

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
      setPage(1);
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

  function parseDateValue(text) {
    if (!text) return null;
    const t = Date.parse(text);
    return Number.isFinite(t) ? t : null;
  }

  const { displayReviews, totalCount } = useMemo(() => {
    const filtered = (Array.isArray(reviews) ? reviews : []).filter((r) => {
      const passesOverall =
        minOverall <= 0 ||
        (r?.overall_rating != null && Number(r.overall_rating) >= minOverall);
      const passesMax =
        maxOverall >= 5 ||
        (r?.overall_rating != null && Number(r.overall_rating) <= maxOverall);
      const passesText = !onlyWithText || Boolean(String(r?.text ?? "").trim());
      return passesOverall && passesMax && passesText;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "rating_desc") {
        const ar = a?.overall_rating == null ? -Infinity : Number(a.overall_rating);
        const br = b?.overall_rating == null ? -Infinity : Number(b.overall_rating);
        if (br !== ar) return br - ar;
      } else if (sort === "helpful_desc") {
        const ah = a?.num_helpful_votes == null ? -Infinity : Number(a.num_helpful_votes);
        const bh = b?.num_helpful_votes == null ? -Infinity : Number(b.num_helpful_votes);
        if (bh !== ah) return bh - ah;
      } else {
        const ad = parseDateValue(a?.date);
        const bd = parseDateValue(b?.date);
        const as = ad == null ? -Infinity : ad;
        const bs = bd == null ? -Infinity : bd;
        if (bs !== as) return bs - as;
      }
      return String(a?.title ?? "").localeCompare(String(b?.title ?? ""));
    });
    const start = (Math.max(1, page) - 1) * pageSize;
    return { displayReviews: sorted.slice(start, start + pageSize), totalCount: sorted.length };
  }, [reviews, minOverall, maxOverall, onlyWithText, sort, page, pageSize]);

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Guest voice</p>
        <h1 className="page-title">
          {cityName ? `Reviews · ${cityName}` : "Reviews"}
        </h1>
      </header>



      {cityName && <PageNavLinks cityName={cityName} />}

      {!cityName && (
        <div className="card card-muted" style={{ marginTop: "1rem" }}>
          <p className="card-body">
            Open reviews from a city: use the home search, <strong>Discover</strong>, or the <strong>Hotels</strong> page and choose a hotel — that opens this tab with the right city and hotel.
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

      {selectedHotel && (
        <section className="card" style={{ marginTop: "1rem" }}>
          <div className="card-body">
            <h2 style={{ margin: 0 }}>Review filters</h2>
            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                marginTop: "0.9rem",
              }}
            >
              <div>
                <label style={{ fontWeight: 600 }}>Overall rating (min/max)</label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                  <input
                    className="search-input"
                    value={String(minOverall)}
                    onChange={(e) => {
                      setMinOverall(clamp(e.target.value, 0, maxOverall));
                      setPage(1);
                    }}
                    inputMode="decimal"
                    style={{ maxWidth: "6.5rem" }}
                    aria-label="Min overall rating"
                  />
                  <input
                    className="search-input"
                    value={String(maxOverall)}
                    onChange={(e) => {
                      setMaxOverall(clamp(e.target.value, minOverall, 5));
                      setPage(1);
                    }}
                    inputMode="decimal"
                    style={{ maxWidth: "6.5rem" }}
                    aria-label="Max overall rating"
                  />
                </div>
                <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.5rem" }}>
                  <input
                    id="rev-min"
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={minOverall}
                    onChange={(e) => {
                      setMinOverall(clamp(e.target.value, 0, maxOverall));
                      setPage(1);
                    }}
                    style={{ width: "100%" }}
                    aria-label="Min overall slider"
                  />
                  <input
                    id="rev-max"
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={maxOverall}
                    onChange={(e) => {
                      setMaxOverall(clamp(e.target.value, minOverall, 5));
                      setPage(1);
                    }}
                    style={{ width: "100%" }}
                    aria-label="Max overall slider"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="rev-sort" style={{ fontWeight: 600 }}>
                  Sort
                </label>
                <select
                  id="rev-sort"
                  className="select-input"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="date_desc">Most recent</option>
                  <option value="rating_desc">Highest overall rating</option>
                  <option value="helpful_desc">Most helpful votes</option>
                </select>
              </div>
              <div>
                <label htmlFor="rev-pagesize" style={{ fontWeight: 600 }}>
                  Page size
                </label>
                <select
                  id="rev-pagesize"
                  className="select-input"
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  id="rev-textonly"
                  type="checkbox"
                  checked={onlyWithText}
                  onChange={(e) => setOnlyWithText(e.target.checked)}
                />
                <label htmlFor="rev-textonly" style={{ fontWeight: 600 }}>
                  Only reviews with text
                </label>
              </div>
            </div>
            <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button
                type="button"
                className="pill-link"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span className="status-line" style={{ margin: 0 }}>
                Page {page}
              </span>
              <button
                type="button"
                className="pill-link"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= totalCount}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
      {selectedHotel && loadingReviews && (
        <p className="status-line">Loading reviews…</p>
      )}
      {selectedHotel && !loadingReviews && !error && displayReviews.length === 0 && (
        <p className="status-line">
          No reviews found for &ldquo;{selectedHotel}&rdquo;.
        </p>
      )}
      {displayReviews.length > 0 && (
        <ul className="review-list">
          {displayReviews.map((r, idx) => (
            <li key={r.id ?? `rev-${idx}`} className="review-card">
              <h3>{r.title || "Untitled review"}</h3>
              <div className="review-meta">
                {r.author || "Unknown"}
                {r.date ? ` · ${r.date}` : ""}
              </div>
              {r.overall_rating != null && (
                <div className="review-rating">Overall {r.overall_rating}</div>
              )}
              {r.num_helpful_votes != null && (
                <div className="review-meta">Helpful votes: {r.num_helpful_votes}</div>
              )}
              <div className="stat-grid" style={{ marginTop: "0.6rem" }}>
                {r.cleanliness_rating != null && (
                  <div className="stat-pill">
                    <strong>Cleanliness</strong> {r.cleanliness_rating}
                  </div>
                )}
                {r.service_rating != null && (
                  <div className="stat-pill">
                    <strong>Service</strong> {r.service_rating}
                  </div>
                )}
                {r.value_rating != null && (
                  <div className="stat-pill">
                    <strong>Value</strong> {r.value_rating}
                  </div>
                )}
                {r.location_rating != null && (
                  <div className="stat-pill">
                    <strong>Location</strong> {r.location_rating}
                  </div>
                )}
                {r.sleep_quality_rating != null && (
                  <div className="stat-pill">
                    <strong>Sleep</strong> {r.sleep_quality_rating}
                  </div>
                )}
                {r.rooms_rating != null && (
                  <div className="stat-pill">
                    <strong>Rooms</strong> {r.rooms_rating}
                  </div>
                )}
              </div>
              {r.text && <p className="review-text">{r.text}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
