"use client";

import { useAuth } from "@client/auth";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Separator } from "@client/components/ui/separator";
import { authPaths } from "@client/lib/constants/authPaths";
import { safeNextPath } from "@client/lib/safeNextPath";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type SubmitEvent, useMemo, useState } from "react";
import { AuthPageShell } from "./AuthPageShell";
import { getOauthProvider } from "./oauth";
import { SignedInCard } from "./SignedInCard";

export function SignInPage() {
  const { user, loading, configError, signInWithOAuth, signInWithPassword, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const destination = useMemo(() => safeNextPath(nextParam), [nextParam]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const error = await signInWithPassword(email, password);
    if (error) {
      setMessage(error.message);
    } else {
      router.replace(destination);
    }
    setBusy(false);
  }

  async function handleSocialSignIn() {
    setBusy(true);
    setMessage(null);
    const error = await signInWithOAuth(getOauthProvider());
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  if (!loading && user) {
    return (
      <AuthPageShell>
        <SignedInCard
          user={user}
          onContinue={() => router.push(destination)}
          onSignOut={() => void signOut()}
        />
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Authentication</Badge>
          <CardTitle className="text-2xl">Sign in to Lattice App Smoke Test</CardTitle>
          <CardDescription>
            Security-first auth: Supabase handles identity, API handles authorization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message || configError ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Authentication note</AlertTitle>
              <AlertDescription>{configError || message}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="sign-in-email">Email</Label>
              <Input
                id="sign-in-email"
                name="email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="sign-in-password">Password</Label>
                <Link
                  href={nextParam ? `${authPaths.forgotPassword}?next=${encodeURIComponent(nextParam)}` : authPaths.forgotPassword}
                  className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="sign-in-password"
                name="password"
                type="password"
                value={password}
                autoComplete="current-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button className="w-full" disabled={busy || loading} type="submit">
              {busy ? <Loader2 className="animate-spin" /> : null}
              Sign in with email
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-sm">
            No account?{" "}
            <Link
              href={nextParam ? `${authPaths.signUp}?next=${encodeURIComponent(nextParam)}` : authPaths.signUp}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>

          <Separator />

          <Button
            className="w-full"
            variant="outline"
            type="button"
            disabled={busy || loading}
            onClick={handleSocialSignIn}
          >
            {busy ? <Loader2 className="animate-spin" /> : null}
            Continue with {getOauthProvider()}
          </Button>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
