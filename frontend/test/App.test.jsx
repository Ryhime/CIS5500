import { render, screen } from "@testing-library/react";
import App from "../src/App";

describe("App routing smoke tests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, "", "/");
  });

  test("renders home route", () => {
    window.history.pushState({}, "", "/");
    render(<App />);
    expect(screen.getByText("Travel App")).toBeInTheDocument();
  });

  test("renders cities route", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));
    window.history.pushState({}, "", "/cities");
    render(<App />);
    expect(screen.getByText("City overview")).toBeInTheDocument();
  });

  test("renders hotels route", () => {
    window.history.pushState({}, "", "/hotels");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Hotels" })).toBeInTheDocument();
  });

  test("renders safety route", () => {
    window.history.pushState({}, "", "/safety");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Safety" })).toBeInTheDocument();
  });

  test("renders reviews route", () => {
    window.history.pushState({}, "", "/reviews");
    render(<App />);
    expect(screen.getByRole("heading", { name: "Reviews" })).toBeInTheDocument();
  });
});
