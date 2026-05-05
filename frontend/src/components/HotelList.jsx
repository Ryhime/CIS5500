function Metric({ label, value, format, highlighted }) {
  if (value == null) return null;
  const v = Number(value);
  if (!Number.isFinite(v)) return null;
  return (
    <span
      className="hotel-metric"
      style={{
        display: "inline-flex",
        gap: "0.35rem",
        alignItems: "baseline",
        padding: highlighted ? "0.1rem 0.35rem" : undefined,
        borderRadius: highlighted ? "0.5rem" : undefined,
        background: highlighted ? "rgba(255, 214, 102, 0.28)" : undefined,
      }}
    >
      <strong>{label}</strong>
      <span>{format ? format(v) : v}</span>
    </span>
  );
}

function listingWebsiteHref(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function cityHoverTitle(h) {
  const parts = [];
  if (h.safety_index != null && Number.isFinite(Number(h.safety_index))) {
    parts.push(`Safety index: ${Number(h.safety_index).toFixed(1)}`);
  }
  if (h.crime_index != null && Number.isFinite(Number(h.crime_index))) {
    parts.push(`Crime index: ${Number(h.crime_index).toFixed(2)}`);
  }
  if (h.city_population != null && Number.isFinite(Number(h.city_population))) {
    parts.push(`Population: ${Math.round(Number(h.city_population)).toLocaleString()}`);
  }
  return parts.length ? parts.join(" · ") : undefined;
}

export default function HotelList({ hotels = [], onHotelClick, showCompare = false }) {
  if (!hotels.length) {
    return <p className="status-line">No hotels to show.</p>;
  }

  return (
    <ul className="hotel-list">
      {hotels.map((h) => {
        const tip = cityHoverTitle(h);
        const tripUrl = listingWebsiteHref(h.url);
        return (
          <li key={h.id ?? h.name} className="hotel-row card">
            <div className="hotel-row-top">
              <div className="hotel-row-names">
                <button
                  type="button"
                  className="hotel-row-namebtn"
                  onClick={() => onHotelClick?.(h)}
                >
                  <span className="hotel-row-title">{h.name}</span>
                </button>
                {h.show_city && h.city && (
                  <span
                    className={`hotel-city-flag${tip ? " hotel-city-flag--tip" : ""}`}
                    title={tip}
                  >
                    {h.city}
                  </span>
                )}
              </div>
              <div className="hotel-row-scores">
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {tripUrl && (
                    <a
                      href={tripUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hotel-site-link"
                      aria-label={`${h.name}: listing website (opens in new tab)`}
                      title="Listing website"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span aria-hidden="true" className="hotel-globe-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M2 12h20M12 2c2.8 3.4 2.8 8.6 0 12-2.8-3.4-2.8-8.6 0-12Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </a>
                  )}
                  {h.rating != null && (
                    <span className="hotel-row-rating">{Number(h.rating).toFixed(1)} ★</span>
                  )}
                  {h.review_count != null && (
                    <span className="hotel-row-meta">
                      {Math.round(Number(h.review_count)).toLocaleString()} reviews
                    </span>
                  )}
                </div>
              </div>
            </div>
            {showCompare && (
              <div className="hotel-row-metrics">
                <Metric label="Rooms" value={h.avg_rooms} format={(v) => v.toFixed(1)} highlighted={h.highlight?.rooms} />
                <Metric label="Clean" value={h.avg_cleanliness} format={(v) => v.toFixed(1)} highlighted={h.highlight?.cleanliness} />
                <Metric label="Service" value={h.avg_service} format={(v) => v.toFixed(1)} highlighted={h.highlight?.service} />
                <Metric label="Value" value={h.avg_value} format={(v) => v.toFixed(1)} highlighted={h.highlight?.value} />
                <Metric label="Location" value={h.avg_location} format={(v) => v.toFixed(1)} highlighted={h.highlight?.location} />
                <Metric label="Sleep" value={h.avg_sleep} format={(v) => v.toFixed(1)} highlighted={h.highlight?.sleep} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
