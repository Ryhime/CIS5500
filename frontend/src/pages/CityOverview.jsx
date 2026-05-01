import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CityCard from "../components/CityCard";
import PageNavLinks from "../components/PageNavLinks";

/** Empty string = same origin in dev (Vite proxies API routes). */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export default function CityOverview() {
  const [params] = useSearchParams();
  const cityName = params.get("city")?.trim() ?? "";

  const [city, setCity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(null);

  useEffect(() => {
    if (!cityName) return;

    let cancelled = false;
    const url = `${API_BASE}/cities/${encodeURIComponent(cityName)}`;

    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setCity(null);
      try {
        const res = await fetch(url);
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            if (body?.error) detail += `: ${body.error}`;
          } catch {
            /* ignore parse errors */
          }
          throw new Error(detail);
        }
        const rows = await res.json();
        if (cancelled) return;
        const firstRow = Array.isArray(rows) ? rows[0] : null;
        setCity(firstRow ?? null);
      } catch (e) {
        if (!cancelled) {
          const hint =
            e instanceof Error
              ? e.message
              : "Network or server unreachable.";
          const dev = import.meta.env.DEV ? ` (${hint})` : "";
          setError(`Could not load city overview from the API.${dev}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cityName]);

  useEffect(() => {
    if (!city?.latitude || !city?.longitude) return;
    let cancelled = false;
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(city.latitude));
    weatherUrl.searchParams.set("longitude", String(city.longitude));
    weatherUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
    weatherUrl.searchParams.set("temperature_unit", "fahrenheit");
    weatherUrl.searchParams.set("timezone", "auto");
    weatherUrl.searchParams.set("forecast_days", "5");

    (async () => {
      setWeatherLoading(true);
      setWeatherError(null);
      setForecast([]);
      try {
        const res = await fetch(weatherUrl.toString());
        if (!res.ok) throw new Error(`Weather request failed (${res.status})`);
        const payload = await res.json();
        if (cancelled) return;
        const daily = payload?.daily;
        const entries = (daily?.time ?? []).map((date, idx) => ({
          date,
          max: daily?.temperature_2m_max?.[idx],
          min: daily?.temperature_2m_min?.[idx],
        }));
        setForecast(entries);
      } catch {
        if (!cancelled) setWeatherError("Could not load weather forecast right now.");
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [city]);

  function formatForecastDate(dateText) {
    const d = new Date(dateText);
    if (Number.isNaN(d.getTime())) return dateText;
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }

  const hasCoords =
    city?.latitude != null &&
    city?.longitude != null &&
    Number.isFinite(Number(city.latitude)) &&
    Number.isFinite(Number(city.longitude));

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Destination</p>
        <h1 className="page-title">
          {cityName ? cityName : "City overview"}
        </h1>
        <p className="page-lede">
          Snapshot from your database: population, safety signals, and a local
          forecast when coordinates are available.
        </p>
      </header>

      <nav className="page-nav" aria-label="Section">
        <Link className="link-back" to="/">
          Home
        </Link>
      </nav>

      {cityName && <PageNavLinks cityName={cityName} />}

      {!cityName && (
        <div className="card card-muted">
          <p className="card-body">
            Search for a city from the home page to view details.
          </p>
        </div>
      )}
      {cityName && loading && <p className="status-line">Loading…</p>}
      {cityName && error && (
        <p className="status-line status-error" role="status">
          {error}
        </p>
      )}
      {cityName && !loading && !error && !city && (
        <div className="card card-muted">
          <p className="card-body">
            No city details found for &ldquo;{cityName}&rdquo;.
          </p>
        </div>
      )}
      {city && (
        <>
          <article className="card info-card" style={{ maxWidth: "100%" }}>
            <CityCard city={city} />
          </article>

          {hasCoords && (
            <p style={{ marginTop: "1.25rem" }}>
              <Link
                className="pill-link"
                to={`/map?city=${encodeURIComponent(cityName)}`}
              >
                Open full map
              </Link>
            </p>
          )}

          <section className="weather-section" aria-label="Weather forecast">
            <h2 className="weather-title">5-day weather</h2>
            {weatherLoading && <p className="status-line">Loading weather…</p>}
            {!weatherLoading && weatherError && (
              <p className="status-line status-error" role="status">
                {weatherError}
              </p>
            )}
            {!weatherLoading && !weatherError && forecast.length === 0 && (
              <p className="status-line">No weather forecast available.</p>
            )}
            {!weatherLoading && !weatherError && forecast.length > 0 && (
              <ul className="weather-list">
                {forecast.map((day) => (
                  <li key={day.date} className="weather-row">
                    <span>{formatForecastDate(day.date)}</span>
                    <span>
                      High {day.max ?? "N/A"}°F · Low {day.min ?? "N/A"}°F
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
