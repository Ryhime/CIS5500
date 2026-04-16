export default function SafetyCard({ data }) {
  if (!data) return null;

  return (
    <article
      style={{
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: "1rem",
        marginBottom: "0.75rem",
        maxWidth: "24rem",
      }}
    >
      <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>
        {data.city}, {data.country}
      </h2>
      <p style={{ margin: 0 }}>Safety index: {data.safety_index}</p>
    </article>
  );
}
