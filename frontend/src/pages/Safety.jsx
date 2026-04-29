import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SafetyCard from "../components/SafetyCard";

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
    <div>
      <h1>Safety{cityName ? `: ${cityName}` : ""}</h1>
      <p>
        <Link to="/">← Back to search</Link>
      </p>
      {cityName && (
        <p>
          <Link to={`/cities?city=${encodeURIComponent(cityName)}`}>← Back to city overview</Link>
        </p>
      )}
      {!cityName && <p>Search for a city from the home page to view safety details.</p>}
      {cityName && loading && <p>Loading...</p>}
      {cityName && error && <p role="status">{error}</p>}
      {cityName && !loading && !error && !data && <p>No safety details found for "{cityName}".</p>}
      {data && <SafetyCard data={data} />}
    </div>
  );
}
