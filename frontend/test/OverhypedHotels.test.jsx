import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OverhypedHotels from "../src/pages/OverhypedHotels";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/hotels/overhyped"]}>
      <Routes>
        <Route path="/hotels/overhyped" element={<OverhypedHotels />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("OverhypedHotels page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("loads and shows rows from API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { name: "Busy Inn", city: "Chicago", review_count: 120, avg_rating: 2.4 },
        ],
      })
    );
    renderPage();
    expect(await screen.findByRole("heading", { name: /Overhyped hotels/i })).toBeInTheDocument();
    expect(await screen.findByText("Busy Inn")).toBeInTheDocument();
    expect(screen.getByText("Chicago")).toBeInTheDocument();
  });

  test("shows error when API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "db down" }),
      })
    );
    renderPage();
    expect(await screen.findByText(/HTTP 500.*db down/)).toBeInTheDocument();
  });
});
