export default function CityCard({ city }) {
  if (!city) return null;

  return (
    <article
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: "1rem",
        maxWidth: "28rem",
      }}
    >
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>
        {city.city}
      </h2>
      <p style={{ margin: "0.25rem 0" }}>{city.country}</p>
      <p style={{ margin: "0.25rem 0" }}>
        Population: {city.population?.toLocaleString?.() ?? city.population}
      </p>
      {city.safety_index != null && (
        <p style={{ margin: "0.25rem 0" }}>
          Safety index: {city.safety_index}
        </p>
      )}
    </article>
  );
}
