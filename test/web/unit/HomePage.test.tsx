import type { AuthContextValue } from "@client/auth/authTypes";
import { useAuth } from "@client/auth";
import { HomePage, HOME_LANDING_HERO_TITLE } from "@client/pages/home";
import { render, screen } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

const mockUser = { id: "u1", email: "you@example.com" } as User;

function authLoggedOut(): AuthContextValue {
  return {
    user: null,
    session: null,
    loading: false,
    configError: null,
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    requestPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    getAccessToken: vi.fn(),
  };
}

function authSignedIn(user: User = mockUser): AuthContextValue {
  return {
    ...authLoggedOut(),
    user,
    session: {} as AuthContextValue["session"],
  };
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authLoggedOut());
  });

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
      "/auth/sign-in?next=%2Fthings",
    );
  });

  it("shows CRUD demo when signed in", () => {
    vi.mocked(useAuth).mockReturnValue(authSignedIn());
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "CRUD demo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open things/i })).toHaveAttribute("href", "/things");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });
});
