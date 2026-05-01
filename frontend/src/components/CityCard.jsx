export default function CityCard({ city }) {
  if (!city) return null;

  return (
    <div className="info-card-inner">
      <h2 className="info-card-title">{city.city}</h2>
      <p className="info-card-muted">{city.country}</p>
      <div className="stat-grid">
        <div className="stat-pill">
          <strong>Population</strong>
          {city.population?.toLocaleString?.() ?? city.population ?? "—"}
        </div>
        {city.safety_index != null && (
          <div className="stat-pill">
            <strong>Safety index</strong>
            <span className="info-row-strong">{city.safety_index}</span>
          </div>
        )}
        {city.crime_index != null && (
          <div className="stat-pill">
            <strong>Crime index</strong>
            {city.crime_index}
          </div>
        )}
      </div>
      {city.latitude != null && city.longitude != null && (
        <p className="info-row info-card-muted" style={{ marginTop: "0.85rem" }}>
          {Number(city.latitude).toFixed(3)}°, {Number(city.longitude).toFixed(3)}°
        </p>
      )}
    </div>
  );
}
