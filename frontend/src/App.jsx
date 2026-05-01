import { BrowserRouter, NavLink, Routes, Route, useLocation, Link } from "react-router-dom";
import Home from "./pages/Home";
import CityOverview from "./pages/CityOverview";
import Hotels from "./pages/Hotels";
import Safety from "./pages/Safety";
import Reviews from "./pages/Reviews";
import Map from "./pages/Map";

function Layout() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const city = params.get("city")?.trim();
  const cityQuery = city ? `?city=${encodeURIComponent(city)}` : "";

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-brand" aria-label="Atlas home">
            <span className="app-brand-mark" aria-hidden />
            <span className="app-brand-text">Atlas</span>
          </Link>
          <nav className="app-nav" aria-label="Main">
            <NavLink end to="/">
              Home
            </NavLink>
            <NavLink to={`/cities${cityQuery}`}>Cities</NavLink>
            <NavLink to={`/map${cityQuery}`}>Map</NavLink>
            <NavLink to={`/hotels${cityQuery}`}>Hotels</NavLink>
            <NavLink to={`/safety${cityQuery}`}>Safety</NavLink>
            <NavLink to={`/reviews${cityQuery}`}>Reviews</NavLink>
          </nav>
        </div>
      </header>
      <div className="app-body">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cities" element={<CityOverview />} />
          <Route path="/map" element={<Map />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/reviews" element={<Reviews />} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
