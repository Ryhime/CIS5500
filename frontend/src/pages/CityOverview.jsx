import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import CityCard from "../components/CityCard";
import CityLeafletMap from "../components/CityLeafletMap";
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

  const [mapHotels, setMapHotels] = useState([]);
  const [mapHotelsLoading, setMapHotelsLoading] = useState(false);

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
    if (!cityName) {
      setMapHotels([]);
      return;
    }
    let cancelled = false;
    const hotelsUrl = `${API_BASE}/cities/${encodeURIComponent(cityName)}/hotels?geocode=1`;
    (async () => {
      setMapHotelsLoading(true);
      try {
        const res = await fetch(hotelsUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = await res.json();
        if (cancelled) return;
        setMapHotels(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setMapHotels([]);
      } finally {
        if (!cancelled) setMapHotelsLoading(false);
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

  const hotelMarkersForMap = useMemo(
    () =>
      mapHotels.filter(
        (h) =>
          h.map_latitude != null &&
          h.map_longitude != null &&
          Number.isFinite(Number(h.map_latitude)) &&
          Number.isFinite(Number(h.map_longitude))
      ),
    [mapHotels]
  );

  const mapCaption = useMemo(() => {
    const n = mapHotels.length;
    const geocoded = mapHotels.filter((h) => h.map_location_approximate === false).length;
    const approx = mapHotels.filter((h) => h.map_location_approximate === true).length;
    const parts = [
      `Orange dot: city center · Blue pins: ${n} hotel${n === 1 ? "" : "s"}.`,
    ];
    if (geocoded > 0) {
      parts.push(
        ` ${geocoded} pin${geocoded === 1 ? "" : "s"} placed from street address (OpenStreetMap Nominatim).`
      );
    }
    if (approx > 0) {
      parts.push(
        ` ${approx} fallback pin${approx === 1 ? "" : "s"} near the city center when geocoding did not return a match.`
      );
    }
    return parts.join("");
  }, [mapHotels]);

  return (
    <main className="page">
      <header className="page-head">
        <p className="page-kicker">Destination</p>
        <h1 className="page-title">
          {cityName ? cityName : "City overview"}
        </h1>
      </header>

      {cityName && <PageNavLinks cityName={cityName} />}

      {!cityName && (
        <div className="card card-muted" style={{ marginTop: "1rem" }}>
          <p className="card-body">
            Search for a city from the home page to view details, map, and local safety stats.
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
          <article className="card info-card" style={{ maxWidth: "100%", marginTop: "1rem" }}>
            <CityCard city={city} />
          </article>

          {hasCoords && (
            <section className="map-section overview-map" aria-label="City map" style={{ marginTop: "1.25rem" }}>
              <h2 className="weather-title" style={{ marginBottom: "0.65rem" }}>
                Map
              </h2>
              {mapHotelsLoading && (
                <p className="status-line" role="status">
                  Loading hotel pins (geocoding uses ~1 second per unique address the first time)…
                </p>
              )}
              <CityLeafletMap
                lat={Number(city.latitude)}
                lng={Number(city.longitude)}
                label={city?.city ? `${city.city}` : cityName}
                hotelMarkers={hotelMarkersForMap}
              />
              <p className="map-meta">{mapCaption}</p>
              <p className="map-meta" style={{ marginTop: "0.25rem" }}>
                {Number(city.latitude).toFixed(4)}°, {Number(city.longitude).toFixed(4)}°
              </p>
            </section>
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
