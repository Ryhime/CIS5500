import SafetyCard from "../components/SafetyCard";

const MOCK_SAFETY = [
  { city: "Irvine", country: "United States", safety_index: 85.3 },
  { city: "Tokyo", country: "Japan", safety_index: 82.1 },
];

export default function Safety() {
  return (
    <div>
      <h1>Safety</h1>
      <p>City safety highlights (mock data; target API: GET /cities/safest).</p>
      {MOCK_SAFETY.map((row) => (
        <SafetyCard key={row.city} data={row} />
      ))}
    </div>
  );
}
