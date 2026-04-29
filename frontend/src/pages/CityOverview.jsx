import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CityCard from "../components/CityCard";

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
      setLoading(true);
      setError(null);
      setCity(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const rows = await res.json();
        if (cancelled) return;
        const firstRow = Array.isArray(rows) ? rows[0] : null;
        setCity(firstRow ?? null);
      } catch {
        if (cancelled) return;
        setError("Could not load city overview from the API.");
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
        if (cancelled) return;
        setWeatherError("Could not load weather forecast right now.");
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

  return (
    <div>
      <h1>City overview{cityName ? `: ${cityName}` : ""}</h1>
      <p>
        <Link to="/">← Back to search</Link>
      </p>
      {!cityName && <p>Search for a city from the home page to view details.</p>}
      {cityName && loading && <p>Loading...</p>}
      {cityName && error && <p role="status">{error}</p>}
      {cityName && !loading && !error && !city && (
        <p>No city details found for "{cityName}".</p>
      )}
      {city && (
        <>
          <p style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link to={`/hotels?city=${encodeURIComponent(cityName)}`}>View hotels</Link>
            <Link to={`/safety?city=${encodeURIComponent(cityName)}`}>View safety</Link>
            <Link to={`/reviews?city=${encodeURIComponent(cityName)}`}>View reviews</Link>
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li style={{ marginBottom: "1rem" }}>
              <CityCard city={city} />
            </li>
          </ul>
          <section aria-label="Weather forecast" style={{ maxWidth: "34rem", margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.15rem", marginBottom: "0.5rem" }}>5-day weather forecast</h2>
            {weatherLoading && <p>Loading weather...</p>}
            {!weatherLoading && weatherError && <p role="status">{weatherError}</p>}
            {!weatherLoading && !weatherError && forecast.length === 0 && (
              <p>No weather forecast available.</p>
            )}
            {!weatherLoading && !weatherError && forecast.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {forecast.map((day) => (
                  <li
                    key={day.date}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      border: "1px solid #ccc",
                      borderRadius: "8px",
                      padding: "0.6rem 0.8rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span>{formatForecastDate(day.date)}</span>
                    <span>
                      High {day.max ?? "N/A"}F / Low {day.min ?? "N/A"}F
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
