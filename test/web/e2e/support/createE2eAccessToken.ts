import jwt from "jsonwebtoken";
import {
  E2E_JWT_ISSUER,
  E2E_JWT_SECRET,
  E2E_USER_EMAIL,
  E2E_USER_ID,
} from "./e2eAuthConstants";

/** HS256 access token compatible with `requireSupabaseAuth` when `SUPABASE_JWT_SECRET` matches. */
export function createE2eAccessToken(): string {
  return jwt.sign(
    {
      sub: E2E_USER_ID,
      email: E2E_USER_EMAIL,
      role: "authenticated",
      iss: E2E_JWT_ISSUER,
      aud: "authenticated",
    },
    E2E_JWT_SECRET,
    { algorithm: "HS256", expiresIn: "1h" },
  );
}
