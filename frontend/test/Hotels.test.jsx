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

  test("shows guidance before running a search", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        json: async () => [],
      })
    );
    renderHotelsAt("/hotels");
    expect(screen.getByText(/Use the hotel finder above to run a search/)).toBeInTheDocument();
  });

  test("renders hotels from API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ city: "Boston" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: { get: () => null },
          json: async () => [
            { id: 1, name: "Hotel Beacon", city: "Boston", avg_overall: 4.5 },
            { id: 2, name: "Riverside Inn", city: "Boston", avg_overall: 4.2 },
          ],
        })
    );

    renderHotelsAt("/hotels?city=Boston");

    await screen.findByRole("heading", { name: /Hotel finder/i });
    screen.getByRole("button", { name: "Search" }).click();

    expect(await screen.findByText(/Hotel Beacon/)).toBeInTheDocument();
    expect(await screen.findByText(/Riverside Inn/)).toBeInTheDocument();
  });

  test("falls back to mock hotels on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ city: "Boston" }],
        })
        .mockRejectedValueOnce(new Error("network down"))
    );

    renderHotelsAt("/hotels?city=Boston");

    await screen.findByRole("heading", { name: /Hotel finder/i });
    screen.getByRole("button", { name: "Search" }).click();

    expect(await screen.findByText(/Could not load hotels from the API/)).toBeInTheDocument();
  });
});
