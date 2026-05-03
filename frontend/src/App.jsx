import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CityOverview from "./pages/CityOverview";
import Hotels from "./pages/Hotels";
import Safety from "./pages/Safety";
import Reviews from "./pages/Reviews";
import Map from "./pages/Map";

function Layout() {
  return (
    <>
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
