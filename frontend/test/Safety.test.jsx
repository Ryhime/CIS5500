import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Safety from "../src/pages/Safety";

function renderSafetyAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/safety" element={<Safety />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Safety page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("shows guidance when no city query is present", () => {
    renderSafetyAt("/safety");
    expect(screen.getByText(/Search for a city from the home page/)).toBeInTheDocument();
  });

  test("renders safety data for selected city", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          city: "Boston",
          country: "United States",
          safety_index: 61,
          crime_index: 39,
        },
      ],
    }));

    renderSafetyAt("/safety?city=Boston");

    expect(await screen.findByText("Boston, United States")).toBeInTheDocument();
    expect(await screen.findByText(/Safety index: 61/)).toBeInTheDocument();
  });

  test("shows API error state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("request failed")));

    renderSafetyAt("/safety?city=Boston");

    expect(await screen.findByText(/Could not load safety data from the API/)).toBeInTheDocument();
  });
});
