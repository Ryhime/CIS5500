import { BrowserRouter, Routes, Route } from "react-router-dom";
import GlobalNav from "./components/GlobalNav";
import Home from "./pages/Home";
import CityOverview from "./pages/CityOverview";
import CityDiscovery from "./pages/CityDiscovery";
import Hotels from "./pages/Hotels";
import Reviews from "./pages/Reviews";
import LegacyCityRedirect from "./pages/LegacyCityRedirect";

function Layout() {
  return (
    <>
      <GlobalNav />
      <div className="app-body">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<CityDiscovery />} />
          <Route path="/cities" element={<CityOverview />} />
          <Route path="/map" element={<LegacyCityRedirect />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/safety" element={<LegacyCityRedirect />} />
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
