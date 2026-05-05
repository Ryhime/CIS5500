import SearchBar from "../components/SearchBar";

export default function Home() {
  return (
    <main className="page page-home home-hero">
      <h1 className="home-title">Find your next city.</h1>
      <p className="home-tagline">
        Jump straight to a city, or start from discovery and compare places before you book.
      </p>
      <SearchBar />
      <p className="info-card-muted" style={{ marginTop: "1.35rem", maxWidth: "28rem", marginLeft: "auto", marginRight: "auto" }}>
        Use the bar above to open a city overview. For broader exploration, open{" "}
        <strong>Discover</strong> or <strong>Hotels</strong> from the top navigation.
      </p>
    </main>
  );
}
