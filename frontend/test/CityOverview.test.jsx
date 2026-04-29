import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CityOverview from "../src/pages/CityOverview";

function renderCityOverviewAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cities" element={<CityOverview />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("CityOverview page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("loads city details and weather forecast", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              city: "Boston",
              country: "United States",
              population: 650000,
              latitude: 42.3601,
              longitude: -71.0589,
              safety_index: 60,
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            daily: {
              time: ["2026-04-30", "2026-05-01"],
              temperature_2m_max: [70, 68],
              temperature_2m_min: [54, 52],
            },
          }),
        })
    );

    renderCityOverviewAt("/cities?city=Boston");

    expect(await screen.findByText("Boston")).toBeInTheDocument();
    expect(await screen.findByText("5-day weather forecast")).toBeInTheDocument();
    expect(await screen.findByText(/High 70F \/ Low 54F/)).toBeInTheDocument();
  });

  test("shows guidance when city is not provided", () => {
    renderCityOverviewAt("/cities");
    expect(screen.getByText(/Search for a city from the home page/)).toBeInTheDocument();
  });
});
