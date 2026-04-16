import { BrowserRouter, NavLink, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CityOverview from "./pages/CityOverview";
import Hotels from "./pages/Hotels";
import Safety from "./pages/Safety";
import Reviews from "./pages/Reviews";

function Layout() {
  return (
    <>
      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "center",
          padding: "1rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <NavLink to="/">Home</NavLink>
        <NavLink to="/cities">Cities</NavLink>
        <NavLink to="/hotels">Hotels</NavLink>
        <NavLink to="/safety">Safety</NavLink>
        <NavLink to="/reviews">Reviews</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cities" element={<CityOverview />} />
        <Route path="/hotels" element={<Hotels />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/reviews" element={<Reviews />} />
      </Routes>
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