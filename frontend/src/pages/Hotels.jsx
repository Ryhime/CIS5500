import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import HotelList from "../components/HotelList";
import PageNavLinks from "../components/PageNavLinks";

/** Empty string = same origin in dev (Vite proxies /cities and /hotels to the API). */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

/** Per-dimension sorts removed from UI — aggregates are often null/tied; overall + count stay predictable. */
const HOTEL_SORT_OPTIONS = new Set(["overall_desc", "reviews_desc", "name_asc"]);

const TOP_OVERALL_PAGE_SIZE = 5;

export default function Hotels() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const cityParam = params.get("city")?.trim() ?? "";
  const citiesParam = params.get("cities")?.trim() ?? "";
  const navigate = useNavigate();

  // Filter form inputs (user-driven; no auto-fetch)
  const [q, setQ] = useState("");
  const [mode, setMode] = useState(() =>
    citiesParam ? "multi_city" : cityParam ? "single_city" : "all_cities"
  );
  const [cityOptions, setCityOptions] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [multiPickerOpen, setMultiPickerOpen] = useState(false);
  const [draftCities, setDraftCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(cityParam);
  const [selectedCities, setSelectedCities] = useState(() =>
    citiesParam
      ? citiesParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  );
  const [minOverall, setMinOverall] = useState(0);
  const [minRooms, setMinRooms] = useState(0);
  const [minReviews, setMinReviews] = useState(0);
  const [maxOverall, setMaxOverall] = useState(5);
  const [maxRooms, setMaxRooms] = useState(5);
  const [maxReviews, setMaxReviews] = useState(2000);
  const [minCleanliness, setMinCleanliness] = useState(0);
  const [maxCleanliness, setMaxCleanliness] = useState(5);
  const [minService, setMinService] = useState(0);
  const [maxService, setMaxService] = useState(5);
  const [minValue, setMinValue] = useState(0);
  const [maxValue, setMaxValue] = useState(5);
  const [minLocation, setMinLocation] = useState(0);
  const [maxLocation, setMaxLocation] = useState(5);
  const [minSleep, setMinSleep] = useState(0);
  const [maxSleep, setMaxSleep] = useState(5);
  const [sort, setSort] = useState("overall_desc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [showCompare, setShowCompare] = useState(true);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [totalCount, setTotalCount] = useState(null);

  // Shortcut query: top rated hotels (overall) with safety + city population
  const [topOverallRows, setTopOverallRows] = useState([]);
  const [topOverallLoading, setTopOverallLoading] = useState(false);
  const [topOverallError, setTopOverallError] = useState(null);
  const [topOverallPage, setTopOverallPage] = useState(1);
  const [topOverallHasMore, setTopOverallHasMore] = useState(false);

  const primaryCityForNav =
    mode === "single_city"
      ? selectedCity || cityParam
      : mode === "multi_city" && selectedCities.length === 1
        ? selectedCities[0]
        : "";

  const pageTitle = useMemo(() => {
    if (mode === "single_city" && (selectedCity || cityParam)) {
      return `Hotels in ${selectedCity || cityParam}`;
    }
    if (mode === "multi_city" && selectedCities.length > 0) {
      return `Hotels · ${selectedCities.length} cities`;
    }
    return "Hotels";
  }, [mode, selectedCity, cityParam, selectedCities]);

  function clamp(n, lo, hi) {
    const v = Number(n);
    if (!Number.isFinite(v)) return lo;
    return Math.min(hi, Math.max(lo, v));
  }

  function clearFilters() {
    setQ("");
    setMinOverall(0);
    setMaxOverall(5);
    setMinRooms(0);
    setMaxRooms(5);
    setMinReviews(0);
    setMaxReviews(2000);
    setMinCleanliness(0);
    setMaxCleanliness(5);
    setMinService(0);
    setMaxService(5);
    setMinValue(0);
    setMaxValue(5);
    setMinLocation(0);
    setMaxLocation(5);
    setMinSleep(0);
    setMaxSleep(5);
    setSort("overall_desc");
    setPageSize(25);
    setPage(1);
    setRows([]);
    setSubmittedQuery("");
    setTotalCount(null);
    setError(null);
  }

  useEffect(() => {
    if (!HOTEL_SORT_OPTIONS.has(sort)) setSort("overall_desc");
  }, [sort]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCitiesLoading(true);
      try {
        const res = await fetch(`${API_BASE}/cities`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const payload = await res.json();
        const names = (Array.isArray(payload) ? payload : [])
          .map((r) => (typeof r?.city === "string" ? r.city.trim() : ""))
          .filter(Boolean);
        const uniq = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
        if (!cancelled) setCityOptions(uniq);
      } catch {
        if (!cancelled) setCityOptions([]);
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (citiesParam) {
      const list = citiesParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setMode("multi_city");
      setSelectedCities(list);
      setSelectedCity("");
      return;
    }
    if (cityParam) {
      setMode("single_city");
      setSelectedCity(cityParam);
      setSelectedCities([]);
      return;
    }
    setMode("all_cities");
    setSelectedCity("");
    setSelectedCities([]);
  }, [location.search, cityParam, citiesParam]);

  function handleHotelClick(hotel) {
    if (!hotel?.name) return;
    const qs = new URLSearchParams();
    if (hotel.city) qs.set("city", hotel.city);
    else if (mode === "single_city" && selectedCity.trim()) qs.set("city", selectedCity.trim());
    qs.set("hotel", hotel.name);
    navigate(`/reviews?${qs.toString()}`);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTopOverallLoading(true);
      setTopOverallError(null);
      try {
        const offset = (Math.max(1, topOverallPage) - 1) * TOP_OVERALL_PAGE_SIZE;
        const qs = new URLSearchParams({
          limit: String(TOP_OVERALL_PAGE_SIZE + 1),
          offset: String(offset),
        }).toString();
        const res = await fetch(`${API_BASE}/hotels/top-overall?${qs}`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const payload = await res.json();
        const list = Array.isArray(payload) ? payload : [];
        const hasMore = list.length > TOP_OVERALL_PAGE_SIZE;
        const pageRows = list.slice(0, TOP_OVERALL_PAGE_SIZE);
        if (!cancelled) {
          setTopOverallRows(pageRows);
          setTopOverallHasMore(hasMore);
        }
      } catch {
        if (!cancelled) {
          setTopOverallRows([]);
          setTopOverallError("Could not load top rated hotels from the API.");
          setTopOverallHasMore(false);
        }
      } finally {
        if (!cancelled) setTopOverallLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [topOverallPage]);

  const hotelsForList = useMemo(() => {
    const showCity = mode !== "single_city";
    const highlight = {
      overall: minOverall > 0 || maxOverall < 5,
      rooms: minRooms > 0 || maxRooms < 5,
      reviews: minReviews > 0 || maxReviews < 2000,
      cleanliness: minCleanliness > 0 || maxCleanliness < 5,
      service: minService > 0 || maxService < 5,
      value: minValue > 0 || maxValue < 5,
      location: minLocation > 0 || maxLocation < 5,
      sleep: minSleep > 0 || maxSleep < 5,
    };
    return (Array.isArray(rows) ? rows : []).map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      url: r.url ?? null,
      street_address: r.street_address,
      rating: r.avg_overall ?? null,
      review_count: r.review_count ?? null,
      crime_index: r.crime_index ?? null,
      safety_index: r.safety_index ?? null,
      city_population: r.city_population ?? null,
      avg_rooms: r.avg_rooms ?? null,
      avg_cleanliness: r.avg_cleanliness ?? null,
      avg_service: r.avg_service ?? null,
      avg_value: r.avg_value ?? null,
      avg_location: r.avg_location ?? null,
      avg_sleep: r.avg_sleep ?? null,
      show_city: showCity,
      highlight,
    }));
  }, [
    rows,
    mode,
    minOverall,
    maxOverall,
    minRooms,
    maxRooms,
    minReviews,
    maxReviews,
    minCleanliness,
    maxCleanliness,
    minService,
    maxService,
    minValue,
    maxValue,
    minLocation,
    maxLocation,
    minSleep,
    maxSleep,
  ]);

  async function fetchPage(queryBase, nextPage) {
    const qs = new URLSearchParams(queryBase);
    qs.set("limit", String(pageSize));
    qs.set("offset", String((Math.max(1, nextPage) - 1) * pageSize));

    const res = await fetch(`${API_BASE}/hotels/search?${qs.toString()}`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const headerTotal = res.headers?.get?.("X-Total-Count");
    setTotalCount(headerTotal ? Number(headerTotal) : null);
    const payload = await res.json();
    setRows(Array.isArray(payload) ? payload : []);
  }

  async function runSearch(e) {
    e?.preventDefault?.();
    setLoading(true);
    setError(null);
    try {
      if (mode === "single_city" && !selectedCity.trim()) {
        setRows([]);
        setError("Choose a city from the list (or switch scope to All cities).");
        return;
      }
      if (mode === "multi_city" && selectedCities.length === 0) {
        setRows([]);
        setError("Choose at least one city (use Choose cities, then Done).");
        return;
      }

      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (mode === "single_city") qs.set("city", selectedCity.trim());
      if (mode === "multi_city") qs.set("cities", selectedCities.join(", "));
      if (minOverall > 0) qs.set("min_overall", String(minOverall));
      if (minRooms > 0) qs.set("min_rooms", String(minRooms));
      if (minReviews > 0) qs.set("min_reviews", String(minReviews));
      if (maxOverall < 5) qs.set("max_overall", String(maxOverall));
      if (maxRooms < 5) qs.set("max_rooms", String(maxRooms));
      if (maxReviews < 2000) qs.set("max_reviews", String(maxReviews));
      if (minCleanliness > 0) qs.set("min_cleanliness", String(minCleanliness));
      if (maxCleanliness < 5) qs.set("max_cleanliness", String(maxCleanliness));
      if (minService > 0) qs.set("min_service", String(minService));
      if (maxService < 5) qs.set("max_service", String(maxService));
      if (minValue > 0) qs.set("min_value", String(minValue));
      if (maxValue < 5) qs.set("max_value", String(maxValue));
      if (minLocation > 0) qs.set("min_location", String(minLocation));
      if (maxLocation < 5) qs.set("max_location", String(maxLocation));
      if (minSleep > 0) qs.set("min_sleep", String(minSleep));
      if (maxSleep < 5) qs.set("max_sleep", String(maxSleep));
      qs.set("sort", sort);
      const base = qs.toString();
      setSubmittedQuery(base);
      setPage(1);
      await fetchPage(base, 1);

      const next = new URLSearchParams();
      if (mode === "single_city") next.set("city", selectedCity.trim());
      if (mode === "multi_city") next.set("cities", selectedCities.join(", "));
      setParams(next, { replace: true });
    } catch {
      setRows([]);
      setError("Could not load hotels from the API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Stays</p>
        <h1 className="page-title">{pageTitle}</h1>
      </header>

      {primaryCityForNav && <PageNavLinks cityName={primaryCityForNav} />}

      <section className="card" style={{ marginTop: "1rem" }}>
        <div className="card-body">
          <h2 style={{ margin: 0 }}>Hotel finder</h2>
          <p className="info-card-muted" style={{ marginTop: "0.35rem" }}>
            Describe what you want, then run the search. Nothing loads until you submit.
          </p>
          <div className="overhyped-callout" role="note">
            <p className="overhyped-callout-text">Explore</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link className="pill-link" to="/hotels/hidden-gems">
                Hidden gems
              </Link>
              <Link className="pill-link" to="/hotels/overhyped">
                Overhyped hotels
              </Link>
            </div>
          </div>

          <section className="card" style={{ marginTop: "0.9rem" }} aria-label="Top rated hotels">
            <div className="card-body" style={{ paddingTop: "0.75rem" }}>
              <h3 style={{ margin: 0 }}>Top rated hotels</h3>
              <p className="info-card-muted" style={{ marginTop: "0.35rem" }}>
                Ranked by average overall rating, with safety index and city population.
              </p>
              {topOverallLoading && (
                <p className="status-line" role="status" style={{ marginTop: "0.6rem" }}>
                  Loading top rated hotels…
                </p>
              )}
              {!topOverallLoading && topOverallError && (
                <p className="status-line status-error" role="status" style={{ marginTop: "0.6rem" }}>
                  {topOverallError}
                </p>
              )}
              {!topOverallLoading && !topOverallError && topOverallRows.length === 0 && (
                <p className="status-line" style={{ marginTop: "0.6rem" }}>
                  No hotels returned.
                </p>
              )}
              {!topOverallLoading && !topOverallError && topOverallRows.length > 0 && (
                <>
                  <div
                    className="standouts-pager"
                    style={{ marginTop: "0.6rem" }}
                    aria-label="Top rated hotels pagination"
                  >
                    <button
                      type="button"
                      className="standouts-pager-btn"
                      disabled={topOverallPage <= 1 || topOverallLoading}
                      onClick={() => setTopOverallPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </button>
                    <span className="standouts-pager-meta">
                      Page {topOverallPage}
                      {topOverallHasMore ? " · more below" : ""}
                    </span>
                    <button
                      type="button"
                      className="standouts-pager-btn"
                      disabled={!topOverallHasMore || topOverallLoading}
                      onClick={() => setTopOverallPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                  <div style={{ overflowX: "auto", marginTop: "0.6rem" }}>
                    <table className="standouts-table">
                      <thead>
                        <tr>
                          <th scope="col">Hotel</th>
                          <th scope="col">City</th>
                          <th scope="col">Avg rating</th>
                          <th scope="col">Safety</th>
                          <th scope="col">Population</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topOverallRows.map((r, idx) => (
                          <tr key={`${r?.hotel_name ?? "hotel"}-${r?.city ?? ""}-${idx}`}>
                            <td>
                              <button
                                type="button"
                                className="link-button standouts-name-btn"
                                onClick={() => handleHotelClick({ name: r?.hotel_name, city: r?.city })}
                              >
                                {r?.hotel_name ?? "—"}
                              </button>
                            </td>
                            <td>{r?.city ?? "—"}</td>
                            <td>{r?.average_rating != null ? Number(r.average_rating).toFixed(2) : "—"}</td>
                            <td>{r?.safety_index != null ? Number(r.safety_index).toFixed(0) : "—"}</td>
                            <td>{r?.city_population != null ? Number(r.city_population).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </section>

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
                <label htmlFor="hf-mode" style={{ fontWeight: 600 }}>
                  Scope
                </label>
                <select
                  id="hf-mode"
                  className="select-input"
                  value={mode}
                  onChange={(e) => {
                    const next = e.target.value;
                    setMode(next);
                    setError(null);
                    if (next === "all_cities") {
                      setSelectedCity("");
                      setSelectedCities([]);
                    }
                    if (next === "single_city") setSelectedCities([]);
                    if (next === "multi_city") setSelectedCity("");
                    setMultiPickerOpen(false);
                  }}
                >
                  <option value="single_city">Single city</option>
                  <option value="all_cities">All cities</option>
                  <option value="multi_city">Multiple cities</option>
                </select>
              </div>
              <div>
                <label htmlFor="hf-q" style={{ fontWeight: 600 }}>
                  Search (name/address)
                </label>
                <input
                  id="hf-q"
                  className="search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="e.g. beacon, downtown, main st…"
                />
              </div>
              <div>
                <span id="hf-city" style={{ fontWeight: 600, display: "block" }}>
                  {mode === "multi_city" ? "Cities" : "City"}
                </span>
                {mode === "multi_city" ? (
                  <div style={{ marginTop: "0.35rem" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                      {selectedCities.map((name) => (
                        <span
                          key={name}
                          className="pill-link"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            paddingRight: "0.35rem",
                          }}
                        >
                          {name}
                          <button
                            type="button"
                            aria-label={`Remove ${name}`}
                            onClick={() => setSelectedCities((prev) => prev.filter((c) => c !== name))}
                            style={{
                              border: "none",
                              background: "rgba(0,0,0,0.06)",
                              borderRadius: "999px",
                              width: "1.35rem",
                              height: "1.35rem",
                              lineHeight: 1,
                              cursor: "pointer",
                              fontSize: "1rem",
                              padding: 0,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    {!multiPickerOpen && (
                      <button
                        type="button"
                        className="pill-link"
                        style={{ marginTop: "0.5rem" }}
                        disabled={citiesLoading || mode === "all_cities"}
                        onClick={() => {
                          setDraftCities([...selectedCities]);
                          setMultiPickerOpen(true);
                        }}
                      >
                        {selectedCities.length ? "Edit cities" : "Choose cities"}
                      </button>
                    )}
                    {multiPickerOpen && (
                      <div
                        className="card"
                        style={{ marginTop: "0.65rem", padding: "0.75rem 0.9rem" }}
                      >
                        <div
                          style={{
                            maxHeight: "12rem",
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.3rem",
                          }}
                        >
                          {cityOptions.map((name) => (
                            <label
                              key={name}
                              style={{ display: "flex", gap: "0.5rem", alignItems: "center", cursor: "pointer" }}
                            >
                              <input
                                type="checkbox"
                                checked={draftCities.includes(name)}
                                onChange={() => {
                                  setDraftCities((d) =>
                                    d.includes(name)
                                      ? d.filter((x) => x !== name)
                                      : [...d, name].sort((a, b) => a.localeCompare(b))
                                  );
                                }}
                              />
                              {name}
                            </label>
                          ))}
                        </div>
                        <div style={{ marginTop: "0.65rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => {
                              setSelectedCities([...draftCities]);
                              setMultiPickerOpen(false);
                            }}
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            className="pill-link"
                            onClick={() => setMultiPickerOpen(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <select
                    id="hf-city-select"
                    className="select-input"
                    style={{ marginTop: "0.35rem" }}
                    value={mode === "all_cities" ? "" : selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    disabled={mode === "all_cities" || citiesLoading}
                    aria-labelledby="hf-city"
                  >
                    <option value="">{citiesLoading ? "Loading cities…" : "Choose a city…"}</option>
                    {cityOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ fontWeight: 600 }}>
                  Overall rating (min/max)
                </label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                  <input
                    className="search-input"
                    value={String(minOverall)}
                    onChange={(e) => setMinOverall(clamp(e.target.value, 0, maxOverall))}
                    inputMode="decimal"
                    style={{ maxWidth: "6.5rem" }}
                    aria-label="Min overall rating"
                  />
                  <input
                    className="search-input"
                    value={String(maxOverall)}
                    onChange={(e) => setMaxOverall(clamp(e.target.value, minOverall, 5))}
                    inputMode="decimal"
                    style={{ maxWidth: "6.5rem" }}
                    aria-label="Max overall rating"
                  />
                </div>
                <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.5rem" }}>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={minOverall}
                    onChange={(e) => setMinOverall(clamp(e.target.value, 0, maxOverall))}
                    style={{ width: "100%" }}
                    aria-label="Min overall rating slider"
                  />
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={maxOverall}
                    onChange={(e) => setMaxOverall(clamp(e.target.value, minOverall, 5))}
                    style={{ width: "100%" }}
                    aria-label="Max overall rating slider"
                  />
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 600 }}>
                  Review count (min/max)
                </label>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                  <input
                    className="search-input"
                    value={String(minReviews)}
                    onChange={(e) => setMinReviews(clamp(e.target.value, 0, maxReviews))}
                    inputMode="numeric"
                    style={{ maxWidth: "6.5rem" }}
                    aria-label="Min review count"
                  />
                  <input
                    className="search-input"
                    value={String(maxReviews)}
                    onChange={(e) => setMaxReviews(clamp(e.target.value, minReviews, 2000))}
                    inputMode="numeric"
                    style={{ maxWidth: "6.5rem" }}
                    aria-label="Max review count"
                  />
                </div>
                <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.5rem" }}>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="10"
                    value={minReviews}
                    onChange={(e) => setMinReviews(clamp(e.target.value, 0, maxReviews))}
                    style={{ width: "100%" }}
                    aria-label="Min reviews slider"
                  />
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="10"
                    value={maxReviews}
                    onChange={(e) => setMaxReviews(clamp(e.target.value, minReviews, 2000))}
                    style={{ width: "100%" }}
                    aria-label="Max reviews slider"
                  />
                </div>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <details className="hotel-finder-advanced">
                  <summary style={{ fontWeight: 600, cursor: "pointer" }}>
                    Average guest scores (filter by review dimensions)
                  </summary>
                  <div
                    style={{
                      display: "grid",
                      gap: "0.75rem",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      marginTop: "0.85rem",
                    }}
                  >
                    <div style={{ gridColumn: "1 / -1" }}>
                      <span style={{ fontWeight: 600 }}>Rooms rating (min / max)</span>
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                        <input
                          className="search-input"
                          value={String(minRooms)}
                          onChange={(e) => setMinRooms(clamp(e.target.value, 0, maxRooms))}
                          inputMode="decimal"
                          style={{ maxWidth: "6.5rem" }}
                          aria-label="Min rooms rating"
                        />
                        <input
                          className="search-input"
                          value={String(maxRooms)}
                          onChange={(e) => setMaxRooms(clamp(e.target.value, minRooms, 5))}
                          inputMode="decimal"
                          style={{ maxWidth: "6.5rem" }}
                          aria-label="Max rooms rating"
                        />
                      </div>
                    </div>
                    {[
                      ["Cleanliness", minCleanliness, maxCleanliness, setMinCleanliness, setMaxCleanliness],
                      ["Service", minService, maxService, setMinService, setMaxService],
                      ["Value", minValue, maxValue, setMinValue, setMaxValue],
                      ["Location", minLocation, maxLocation, setMinLocation, setMaxLocation],
                      ["Sleep quality", minSleep, maxSleep, setMinSleep, setMaxSleep],
                    ].map(([label, lo, hi, setLo, setHi]) => (
                      <div key={label}>
                        <span style={{ fontWeight: 600 }}>{label} (min / max)</span>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
                          <input
                            className="search-input"
                            value={String(lo)}
                            onChange={(e) => setLo(clamp(e.target.value, 0, hi))}
                            inputMode="decimal"
                            style={{ maxWidth: "6.5rem" }}
                            aria-label={`Min ${label}`}
                          />
                          <input
                            className="search-input"
                            value={String(hi)}
                            onChange={(e) => setHi(clamp(e.target.value, lo, 5))}
                            inputMode="decimal"
                            style={{ maxWidth: "6.5rem" }}
                            aria-label={`Max ${label}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              <div>
                <label htmlFor="hf-sort" style={{ fontWeight: 600 }}>
                  Sort
                </label>
                <select
                  id="hf-sort"
                  className="select-input"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="overall_desc">Overall rating (high → low)</option>
                  <option value="reviews_desc">Review count (high → low)</option>
                  <option value="name_asc">Name (A → Z)</option>
                </select>
              </div>
              <div>
                <label htmlFor="hf-pagesize" style={{ fontWeight: 600 }}>
                  Page size
                </label>
                <select
                  id="hf-pagesize"
                  className="select-input"
                  value={String(pageSize)}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Searching…" : "Search"}
              </button>
              <button
                type="button"
                className="pill-link"
                onClick={() => {
                  setRows([]);
                  setError(null);
                }}
              >
                Clear results
              </button>
              <button type="button" className="pill-link" onClick={clearFilters}>
                Reset filters
              </button>
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
                    setError("Could not load hotels from the API.");
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
                  if (!submittedQuery || rows.length < pageSize) return;
                  const next = page + 1;
                  setLoading(true);
                  setError(null);
                  try {
                    await fetchPage(submittedQuery, next);
                    setPage(next);
                  } catch {
                    setError("Could not load hotels from the API.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={rows.length < pageSize || !submittedQuery || loading}
              >
                Next
              </button>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={showCompare}
                  onChange={(e) => setShowCompare(e.target.checked)}
                />
                Show comparison metrics
              </label>
            </div>
          </form>
        </div>
      </section>

      {loading && <p className="status-line">Loading…</p>}
      {error && (
        <p className="status-line status-error" role="status">
          {error}
        </p>
      )}
      {rows.length === 0 && !loading && !error && (
        <div className="card card-muted">
          <p className="card-body">
            Use the hotel finder above to run a search.
          </p>
        </div>
      )}
      {rows.length > 0 && !loading && (
        <>
          <p className="status-line">
            Click a hotel to open its reviews.
            {totalCount != null && (
              <> · Showing {(page - 1) * pageSize + 1}-{(page - 1) * pageSize + rows.length} out of {Number(totalCount).toLocaleString()}</>
            )}
          </p>
          <HotelList
            hotels={hotelsForList}
            onHotelClick={handleHotelClick}
            showCompare={showCompare}
          />
        </>
      )}
    </main>
  );
}
