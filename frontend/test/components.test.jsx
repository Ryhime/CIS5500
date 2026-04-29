import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../src/pages/Home";
import CityCard from "../src/components/CityCard";
import HotelList from "../src/components/HotelList";
import SafetyCard from "../src/components/SafetyCard";

describe("UI components", () => {
  test("CityCard renders key city details", () => {
    render(
      <CityCard
        city={{
          city: "New York",
          country: "United States",
          population: 8804190,
          safety_index: 52.1,
        }}
      />
    );

    expect(screen.getByText("New York")).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText(/Population:/)).toBeInTheDocument();
    expect(screen.getByText(/Safety index:/)).toBeInTheDocument();
  });

  test("HotelList renders fallback when empty", () => {
    render(<HotelList hotels={[]} />);
    expect(screen.getByText("No hotels to show.")).toBeInTheDocument();
  });

  test("HotelList renders provided hotels", () => {
    render(
      <HotelList
        hotels={[
          { name: "Hotel Beacon", rating: 4.5 },
          { name: "Riverside Inn", rating: 4.2 },
        ]}
      />
    );

    expect(screen.getByText(/Hotel Beacon/)).toBeInTheDocument();
    expect(screen.getByText(/Riverside Inn/)).toBeInTheDocument();
  });

  test("SafetyCard renders city and safety index", () => {
    render(<SafetyCard data={{ city: "Boston", country: "United States", safety_index: 61 }} />);
    expect(screen.getByText("Boston, United States")).toBeInTheDocument();
    expect(screen.getByText(/Safety index: 61/)).toBeInTheDocument();
  });

  test("Home page renders search prompt and action", () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText("Travel App")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search city" })).toBeInTheDocument();
    expect(screen.getByLabelText("City name")).toBeInTheDocument();
  });
});
