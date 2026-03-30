import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomePage, HOME_LANDING_HERO_TITLE } from "@client/pages/home";

describe("HomePage", () => {
  it("renders template hero and API URL from env", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: HOME_LANDING_HERO_TITLE }),
    ).toBeInTheDocument();
    expect(screen.getByText("http://127.0.0.1:3000")).toBeInTheDocument();
  });

  it("links to the UI gallery", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /UI component gallery/i })).toHaveAttribute(
      "href",
      "/ui",
    );
  });

  it("links to the login flow demo", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /login demo/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
