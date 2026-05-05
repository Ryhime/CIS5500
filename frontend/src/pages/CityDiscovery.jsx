import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function CityDiscovery() {
  const navigate = useNavigate();

  const [minPop, setMinPop] = useState(0);
  const [maxPop, setMaxPop] = useState(10000000);
  const [minSafety, setMinSafety] = useState(0);
  const [maxCrime, setMaxCrime] = useState(100);
  const [sort, setSort] = useState("safety_desc");

  const pageSize = 25;
  const [page, setPage] = useState(1);
  const [submittedQuery, setSubmittedQuery] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pickedCities, setPickedCities] = useState(() => new Set());

  const hasNext = rows.length === pageSize;

  function clamp(n, lo, hi) {
    const v = Number(n);
    if (!Number.isFinite(v)) return lo;
    return Math.min(hi, Math.max(lo, v));
  }

  async function fetchPage(queryBase, nextPage) {
    const qs = new URLSearchParams(queryBase);
    qs.set("limit", String(pageSize));
    qs.set("offset", String((Math.max(1, nextPage) - 1) * pageSize));
    const res = await fetch(`${API_BASE}/cities/search?${qs.toString()}`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const payload = await res.json();
    setRows(Array.isArray(payload) ? payload : []);
  }

  async function runSearch(e) {
    e?.preventDefault?.();
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (minPop > 0) qs.set("min_population", String(minPop));
      if (maxPop < 10000000) qs.set("max_population", String(maxPop));
      if (minSafety > 0) qs.set("min_safety", String(minSafety));
      if (maxCrime < 100) qs.set("max_crime", String(maxCrime));
      qs.set("sort", sort);
      const base = qs.toString();
      setSubmittedQuery(base);
      setPickedCities(new Set());
      setPage(1);
      await fetchPage(base, 1);
    } catch {
      setRows([]);
      setError("Could not load cities from the API.");
    } finally {
      setLoading(false);
    }
  }

  const headerSummary = useMemo(() => {
    const parts = [];
    if (minPop > 0) parts.push(`pop ≥ ${minPop.toLocaleString()}`);
    if (maxPop < 10000000) parts.push(`pop ≤ ${maxPop.toLocaleString()}`);
    if (minSafety > 0) parts.push(`safety ≥ ${minSafety}`);
    if (maxCrime < 100) parts.push(`crime ≤ ${maxCrime}`);
    return parts.length ? parts.join(" · ") : "No filters applied";
  }, [minPop, maxPop, minSafety, maxCrime]);

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Decide where to go</p>
        <h1 className="page-title">City discovery</h1>
      </header>

      <section className="card" style={{ marginTop: "1rem" }}>
        <div className="card-body">
          <h2 style={{ margin: 0 }}>Find a city</h2>
          <p className="info-card-muted" style={{ marginTop: "0.35rem" }}>
            Filter cities by population and safety/crime. Results only load when you search.
          </p>

          <form onSubmit={runSearch}>
            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                marginTop: "0.9rem",
              }}
            >
              <div>
                <label style={{ fontWeight: 600 }}>Population (min/max)</label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                  <input
                    className="search-input"
                    value={String(minPop)}
                    onChange={(e) => setMinPop(clamp(e.target.value, 0, maxPop))}
                    inputMode="numeric"
                    style={{ maxWidth: "8.5rem" }}
                    aria-label="Min population"
                  />
                  <input
                    className="search-input"
                    value={String(maxPop)}
                    onChange={(e) => setMaxPop(clamp(e.target.value, minPop, 10000000))}
                    inputMode="numeric"
                    style={{ maxWidth: "8.5rem" }}
                    aria-label="Max population"
                  />
                </div>
                <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.5rem" }}>
                  <input
                    id="cd-minpop"
                    type="range"
                    min="0"
                    max="10000000"
                    step="50000"
                    value={minPop}
                    onChange={(e) => setMinPop(clamp(e.target.value, 0, maxPop))}
                    style={{ width: "100%" }}
                    aria-label="Min population slider"
                  />
                  <input
                    id="cd-maxpop"
                    type="range"
                    min="0"
                    max="10000000"
                    step="50000"
                    value={maxPop}
                    onChange={(e) => setMaxPop(clamp(e.target.value, minPop, 10000000))}
                    style={{ width: "100%" }}
                    aria-label="Max population slider"
                  />
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 600 }}>Safety / Crime</label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                  <input
                    className="search-input"
                    value={String(minSafety)}
                    onChange={(e) => setMinSafety(clamp(e.target.value, 0, 100))}
                    inputMode="numeric"
                    style={{ maxWidth: "6.5rem" }}
                    aria-label="Min safety index"
                  />
                  <input
                    className="search-input"
                    value={String(maxCrime)}
                    onChange={(e) => setMaxCrime(clamp(e.target.value, 0, 100))}
                    inputMode="numeric"
                    style={{ maxWidth: "6.5rem" }}
                    aria-label="Max crime index"
                  />
                </div>
                <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.5rem" }}>
                  <input
                    id="cd-safety"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={minSafety}
                    onChange={(e) => setMinSafety(clamp(e.target.value, 0, 100))}
                    style={{ width: "100%" }}
                    aria-label="Min safety slider"
                  />
                  <input
                    id="cd-crime"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={maxCrime}
                    onChange={(e) => setMaxCrime(clamp(e.target.value, 0, 100))}
                    style={{ width: "100%" }}
                    aria-label="Max crime slider"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cd-sort" style={{ fontWeight: 600 }}>
                  Sort
                </label>
                <select
                  id="cd-sort"
                  className="select-input"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="safety_desc">Safety (high → low)</option>
                  <option value="crime_asc">Crime (low → high)</option>
                  <option value="population_desc">Population (high → low)</option>
                  <option value="hotels_desc">Hotel count (high → low)</option>
                  <option value="avg_rating_desc">Avg hotel rating (high → low)</option>
                </select>
              </div>

            </div>

            <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Searching…" : "Search"}
              </button>
              <span className="status-line" style={{ margin: 0 }}>
                {headerSummary}
              </span>

              <button
                type="button"
                className="pill-link"
                onClick={async () => {
                  if (!submittedQuery || page <= 1) return;
                  const next = Math.max(1, page - 1);
                  setLoading(true);
                  setError(null);
                  try {
                    await fetchPage(submittedQuery, next);
                    setPage(next);
                  } catch {
                    setError("Could not load cities from the API.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={page <= 1 || !submittedQuery || loading}
              >
                Prev
              </button>
              <span className="status-line" style={{ margin: 0 }}>
                Page {page}
              </span>
              <button
                type="button"
                className="pill-link"
                onClick={async () => {
                  if (!submittedQuery || !hasNext) return;
                  const next = page + 1;
                  setLoading(true);
                  setError(null);
                  try {
                    await fetchPage(submittedQuery, next);
                    setPage(next);
                  } catch {
                    setError("Could not load cities from the API.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={!hasNext || !submittedQuery || loading}
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </section>

      {error && (
        <p className="status-line status-error" role="status">
          {error}
        </p>
      )}
      {loading && <p className="status-line">Loading…</p>}

      {!loading && !error && rows.length === 0 && (
        <div className="card card-muted" style={{ marginTop: "1rem" }}>
          <p className="card-body">Run a search to see city results.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <section className="card" style={{ marginTop: "1rem" }}>
          <div className="card-body">
            <h2 style={{ margin: 0 }}>Results</h2>
            <div style={{ marginTop: "0.65rem", display: "flex", gap: "0.65rem", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="btn-primary"
                disabled={pickedCities.size === 0}
                onClick={() => {
                  const list = Array.from(pickedCities);
                  const qs = new URLSearchParams();
                  qs.set("cities", list.join(", "));
                  navigate(`/hotels?${qs.toString()}`);
                }}
              >
                Open hotels for {pickedCities.size} selected {pickedCities.size === 1 ? "city" : "cities"}
              </button>
              <button
                type="button"
                className="pill-link"
                disabled={pickedCities.size === 0}
                onClick={() => setPickedCities(new Set())}
              >
                Clear selection
              </button>
            </div>
            <ul style={{ marginTop: "0.75rem", paddingLeft: "1.25rem", listStyle: "none" }}>
              {rows.map((r) => (
                <li key={r.city} style={{ marginBottom: "0.65rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={pickedCities.has(r.city)}
                    onChange={() => {
                      setPickedCities((prev) => {
                        const next = new Set(prev);
                        if (next.has(r.city)) next.delete(r.city);
                        else next.add(r.city);
                        return next;
                      });
                    }}
                    aria-label={`Select ${r.city} for hotel compare`}
                  />
                  <div>
                    <button
                      type="button"
                      className="pill-link"
                      style={{ padding: 0, border: "none", background: "none", cursor: "pointer" }}
                      onClick={() => navigate(`/cities?city=${encodeURIComponent(r.city)}`)}
                    >
                      <strong>{r.city}</strong>
                    </button>
                    <span className="info-card-muted">
                      {" "}
                      · pop {Math.round(Number(r.population ?? 0)).toLocaleString()}
                      {" "}
                      · crime {Number(r.crime_index ?? 0).toFixed(2)}
                      {" "}
                      · safety {Number(r.safety_index ?? 0).toFixed(2)}
                      {" "}
                      · hotels {r.hotel_count ?? 0}
                      {r.avg_hotel_rating != null
                        ? ` · avg hotel rating ${Number(r.avg_hotel_rating).toFixed(2)}`
                        : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}

