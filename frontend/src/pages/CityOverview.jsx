import CityCard from "../components/CityCard";

const MOCK_CITIES = [
  {
    city: "San Francisco",
    country: "United States",
    population: 870000,
    safety_index: 72.4,
  },
  {
    city: "Paris",
    country: "France",
    population: 2100000,
    safety_index: 68.1,
  },
];

export default function CityOverview() {
  return (
    <div>
      <h1>City overview</h1>
      <p>Snapshot of cities (mock data until API is wired).</p>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {MOCK_CITIES.map((c) => (
          <li key={c.city} style={{ marginBottom: "1rem" }}>
            <CityCard city={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}
