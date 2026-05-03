import SearchBar from "../components/SearchBar";

export default function Home() {
  return (
    <main className="page page-home home-hero">
<h1 className="home-title">Find your next city.</h1>
      <p className="home-tagline">
        Pick a destination and we'll show you hotels, safety stats, reviews, and a map.
      </p>
      <SearchBar />
    </main>
  );
}
