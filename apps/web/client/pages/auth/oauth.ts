import type { Provider } from "@supabase/supabase-js";

const DEFAULT_OAUTH_PROVIDER = "google";

export function getOauthProvider() {
  return (process.env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER || DEFAULT_OAUTH_PROVIDER) as Provider;
}
