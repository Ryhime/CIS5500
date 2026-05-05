export default function SafetyCard({ data }) {
  if (!data) return null;

  return (
    <div className="info-card-inner" style={{ padding: "1.15rem 1.35rem" }}>
      <h2 className="info-card-title">{data.city}</h2>
      <div className="stat-grid" style={{ marginTop: "0.75rem" }}>
        {data.safety_index != null && (
          <div className="stat-pill">
            <strong>Safety index</strong>
            <span className="info-row-strong">{data.safety_index}</span>
          </div>
        )}
        {data.crime_index != null && (
          <div className="stat-pill">
            <strong>Crime index</strong>
            {data.crime_index}
          </div>
        )}
        {data.population != null && (
          <div className="stat-pill">
            <strong>Population</strong>
            {Math.round(data.population).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
