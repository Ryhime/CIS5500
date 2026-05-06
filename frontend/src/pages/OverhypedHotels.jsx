import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

/** Empty string = same origin in dev (Vite proxies /hotels to the API). */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function OverhypedHotels() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/hotels/overhyped`);
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            if (body?.error) detail += `: ${body.error}`;
          } catch {
            /* ignore */
          }
          throw new Error(detail);
        }
        const data = await res.json();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setError(e?.message ?? "Could not load data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function goToReviews(name, city) {
    const qs = new URLSearchParams();
    if (city) qs.set("city", String(city));
    qs.set("hotel", name);
    navigate(`/reviews?${qs.toString()}`);
  }

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Stays</p>
        <h1 className="page-title">Overhyped hotels</h1>
        <p className="info-card-muted" style={{ marginTop: "0.35rem" }}>
          many reviews, low average overall rating.
        </p>
      </header>

      <p style={{ marginTop: "0.75rem" }}>
        <Link className="pill-link" to="/hotels">
          Hotel finder
        </Link>
      </p>

      {loading && (
        <p className="status-line" role="status" style={{ marginTop: "1rem" }}>
          Loading…
        </p>
      )}
      {!loading && error && (
        <p className="status-line status-error" role="status" style={{ marginTop: "1rem" }}>
          {error}
        </p>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="status-line" style={{ marginTop: "1rem" }}>
          No hotels matched these criteria.
        </p>
      )}
      {!loading && !error && rows.length > 0 && (
        <section className="card" style={{ marginTop: "1.25rem" }} aria-label="Overhyped hotels results">
          <div className="card-body" style={{ paddingTop: "0.75rem" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="standouts-table">
                <thead>
                  <tr>
                    <th scope="col">Hotel</th>
                    <th scope="col">City</th>
                    <th scope="col">Reviews</th>
                    <th scope="col">Avg rating</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={`${row.name}-${row.city}-${idx}`}>
                      <td>
                        <button
                          type="button"
                          className="link-button standouts-name-btn"
                          onClick={() => goToReviews(row.name, row.city)}
                        >
                          {row.name}
                        </button>
                      </td>
                      <td>{row.city ?? "—"}</td>
                      <td>{row.review_count != null ? Number(row.review_count).toLocaleString() : "—"}</td>
                      <td>{row.avg_rating != null ? Number(row.avg_rating).toFixed(2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
