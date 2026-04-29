import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Reviews from "../src/pages/Reviews";

function renderReviewsAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reviews" element={<Reviews />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Reviews page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("shows guidance when no city query is present", () => {
    renderReviewsAt("/reviews");
    expect(screen.getByText(/Search for a city from the home page/)).toBeInTheDocument();
  });

  test("loads hotels and renders reviews for selected hotel", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ name: "Hotel Beacon" }, { name: "Riverside Inn" }],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              id: "rev-1",
              title: "Great stay",
              author: "alice",
              overall_rating: 5,
              text: "Very clean and close to downtown.",
            },
          ],
        })
    );

    renderReviewsAt("/reviews?city=Boston");

    expect(await screen.findByLabelText("Hotel:")).toBeInTheDocument();
    expect(await screen.findByText("Great stay")).toBeInTheDocument();
    expect(await screen.findByText(/Overall rating: 5/)).toBeInTheDocument();
  });

  test("shows hotel-loading API error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("request failed")));

    renderReviewsAt("/reviews?city=Boston");

    expect(await screen.findByText(/Could not load hotels for this city/)).toBeInTheDocument();
  });
});
