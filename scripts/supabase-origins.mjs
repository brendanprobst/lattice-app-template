/**
 * Compare public Supabase origins without printing values.
 * Used by deploy:check and standup leftover copy.
 */

export function normalizeSupabaseOrigin(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return "";
  }
}

export function supabaseOriginsMatch(left, right) {
  const a = normalizeSupabaseOrigin(left);
  const b = normalizeSupabaseOrigin(right);
  return Boolean(a && b && a === b);
}

export function supabaseProjectRef(url) {
  const origin = normalizeSupabaseOrigin(url);
  const match = origin.match(/^https:\/\/([a-z0-9]+)\.supabase\.co$/i);
  return match ? match[1] : "";
}

export function authLeftoverLines({ env, siteOrigin = "", projectRef = "" } = {}) {
  const host = siteOrigin || "<this env's https origin>";
  const ref = projectRef || "<this-project-ref>";
  return [
    `Leftover (Auth) — ${env} Supabase project only (not another env's keys):`,
    `  1. Settings → API: this project's URL + publishable key → apps/web/.env.${env}, terraform.tfvars, Infisical /shared`,
    `  2. Authentication → URL configuration: Site URL ${host} and ${host}/**`,
    `  3. Providers → Google: paste the Google Cloud Client ID/secret. Authorized JS origin https://${ref}.supabase.co. Redirect https://${ref}.supabase.co/auth/v1/callback`,
    `  See docs/playbooks/google-sso.md then: npm run deploy:check -- --env ${env}`,
  ];
}
