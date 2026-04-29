import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Hotels from "../src/pages/Hotels";

function renderHotelsAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/hotels" element={<Hotels />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Hotels page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("shows guidance when no city query is present", () => {
    renderHotelsAt("/hotels");
    expect(screen.getByText(/Enter a city on the home page/)).toBeInTheDocument();
  });

  test("renders hotels from API response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: "Hotel Beacon", average_rating: 4.5 },
        { name: "Riverside Inn", average_rating: 4.2 },
      ],
    }));

    renderHotelsAt("/hotels?city=Boston");

    expect(await screen.findByText(/Hotel Beacon/)).toBeInTheDocument();
    expect(await screen.findByText(/Riverside Inn/)).toBeInTheDocument();
  });

  test("falls back to mock hotels on API failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network down")));

    renderHotelsAt("/hotels?city=Boston");

    expect(await screen.findByText(/Could not reach the API/)).toBeInTheDocument();
    expect(await screen.findByText(/Hotel Beacon/)).toBeInTheDocument();
  });
});
