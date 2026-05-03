import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SafetyCard from "../components/SafetyCard";
import PageNavLinks from "../components/PageNavLinks";

/** Empty string = same origin in dev (Vite proxies API routes). */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function Safety() {
  const [params] = useSearchParams();
  const cityName = params.get("city")?.trim() ?? "";

  const [data, setData] = useState(null);
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
      setData(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const rows = await res.json();
        if (cancelled) return;
        setData(Array.isArray(rows) ? rows[0] ?? null : null);
      } catch {
        if (!cancelled) setError("Could not load safety data from the API.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityName]);

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Risk context</p>
        <h1 className="page-title">
          {cityName ? `Safety · ${cityName}` : "Safety"}
        </h1>
        <p className="page-lede">
          Safety and crime indices from your joined city dataset.
        </p>
      </header>



      {cityName && <PageNavLinks cityName={cityName} />}

      {!cityName && (
        <div className="card card-muted">
          <p className="card-body">
            Search for a city from the home page to view safety details.
          </p>
        </div>
      )}
      {cityName && loading && <p className="status-line">Loading…</p>}
      {cityName && error && (
        <p className="status-line status-error" role="status">
          {error}
        </p>
      )}
      {cityName && !loading && !error && !data && (
        <div className="card card-muted">
          <p className="card-body">
            No safety details found for &ldquo;{cityName}&rdquo;.
          </p>
        </div>
      )}
      {data && (
        <div className="card" style={{ maxWidth: "28rem" }}>
          <SafetyCard data={data} />
        </div>
      )}
    </main>
  );
}
