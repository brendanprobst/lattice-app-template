/** Browser routes for Supabase auth flows (see `app/auth/`). */
export const authPaths = {
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
} as const;
