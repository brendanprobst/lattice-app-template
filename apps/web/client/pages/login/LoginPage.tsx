"use client";

import { useAuth } from "@client/auth";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Separator } from "@client/components/ui/separator";
import { safeNextPath } from "@client/lib/safeNextPath";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Provider } from "@supabase/supabase-js";

type Mode = "sign-in" | "sign-up";

const DEFAULT_OAUTH_PROVIDER = "google";

function getOauthProvider() {
  return (process.env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER || DEFAULT_OAUTH_PROVIDER) as Provider;
}

function BackToProjectHomeLink() {
  return (
    <Link
      href="/"
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      Back to project home page
    </Link>
  );
}

export function LoginPage() {
  const {
    user,
    loading,
    configError,
    signInWithOAuth,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const destination = useMemo(() => safeNextPath(nextParam), [nextParam]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("sign-in");

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const operation = mode === "sign-in"
      ? signInWithPassword(email, password)
      : signUpWithPassword(email, password);
    const error = await operation;

    if (error) {
      setMessage(error.message);
    } else if (mode === "sign-up") {
      setMessage("Account created. Check your email if confirmation is required, then sign in.");
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
      <main className="bg-background min-h-screen px-4 py-10">
        <div className="mx-auto max-w-md">
          <BackToProjectHomeLink />
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">Authentication</Badge>
              <CardTitle className="text-2xl">Signed in</CardTitle>
              <CardDescription>
                {user.email ?? user.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button type="button" onClick={() => router.push(destination)}>
                Continue to app
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void signOut()}
              >
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen px-4 py-10">
      <div className="mx-auto max-w-md">
        <BackToProjectHomeLink />
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

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "sign-in" ? "default" : "outline"}
                onClick={() => setMode("sign-in")}
                type="button"
              >
                Sign in
              </Button>
              <Button
                variant={mode === "sign-up" ? "default" : "outline"}
                onClick={() => setMode("sign-up")}
                type="button"
              >
                Create account
              </Button>
            </div>

            <form className="space-y-3" onSubmit={handleEmailSubmit}>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button className="w-full" disabled={busy || loading} type="submit">
                {busy ? <Loader2 className="animate-spin" /> : null}
                {mode === "sign-in" ? "Sign in with email" : "Create account with email"}
              </Button>
            </form>

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
      </div>
    </main>
  );
}
