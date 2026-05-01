export default function HotelList({ hotels = [] }) {
  if (!hotels.length) {
    return <p className="status-line">No hotels to show.</p>;
  }

  return (
    <ul className="hotel-list">
      {hotels.map((h) => (
        <li key={h.name}>
          <span className="name">{h.name}</span>
          {h.rating != null && (
            <span className="rating">{Number(h.rating).toFixed(1)} ★ avg</span>
          )}
        </li>
      ))}
    </ul>
  );
}
