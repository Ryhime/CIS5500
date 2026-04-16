export default function HotelList({ hotels = [] }) {
  if (!hotels.length) {
    return <p>No hotels to show.</p>;
  }

  return (
    <ul>
      {hotels.map((h) => (
        <li key={h.name}>
          <strong>{h.name}</strong>
          {h.rating != null && (
            <>
              {" "}
              — rating: {h.rating}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
