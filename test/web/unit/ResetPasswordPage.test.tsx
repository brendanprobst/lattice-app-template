import type { AuthContextValue } from "@client/auth/authTypes";
import { useAuth } from "@client/auth";
import { ResetPasswordPage } from "@client/pages/auth";
import { render, screen } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@client/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUser = { id: "u1", email: "you@example.com" } as User;

function baseAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
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
    ...overrides,
  };
}

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(baseAuth());
  });

  it("shows a spinner while session is loading", () => {
    vi.mocked(useAuth).mockReturnValue(baseAuth({ loading: true }));
    render(<ResetPasswordPage />);
    expect(screen.getByText(/verifying reset link/i)).toBeInTheDocument();
  });

  it("shows invalid link when there is no session after load", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText(/reset link invalid/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new reset link/i })).toHaveAttribute(
      "href",
      "/auth/forgot-password",
    );
    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute("href", "/auth/sign-in");
  });

  it("shows the new password form when a session exists", () => {
    vi.mocked(useAuth).mockReturnValue(baseAuth({ user: mockUser }));
    render(<ResetPasswordPage />);
    expect(screen.getByText(/choose a new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });
});
