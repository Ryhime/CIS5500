import SearchBar from "../components/SearchBar";

export default function Home() {
  return (
    <div style={{ padding: "1rem" }}>
      <h1>Travel App</h1>
      <p style={{ marginBottom: "1rem" }}>Search for a city to get started.</p>
      <SearchBar />
    </div>
  );
}