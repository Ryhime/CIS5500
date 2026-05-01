import SearchBar from "../components/SearchBar";

export default function Home() {
  return (
    <main className="page page-home home-hero">
      <div className="home-brand-line" aria-hidden>
        <span className="app-brand-mark" />
      </div>
      <h1 className="home-title">Plan with context, not guesswork</h1>
      <p className="home-tagline">
        Search a destination to explore population, safety, hotels, reviews, and
        an interactive map powered by your team API.
      </p>
      <SearchBar />
    </main>
  );
}
