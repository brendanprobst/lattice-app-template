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
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type SubmitEvent, useMemo, useState } from "react";
import { AuthPageShell } from "./AuthPageShell";
import { getOauthProvider } from "./oauth";
import { SignedInCard } from "./SignedInCard";

export function SignUpPage() {
  const { user, loading, configError, signInWithOAuth, signUpWithPassword, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const destination = useMemo(() => safeNextPath(nextParam), [nextParam]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage(null);
    setInfoMessage(null);
    const error = await signUpWithPassword(email, password);
    if (error) {
      setErrorMessage(error.message);
    } else {
      setInfoMessage("Account created. Check your email if confirmation is required, then sign in.");
    }
    setBusy(false);
  }

  async function handleSocialSignIn() {
    setBusy(true);
    setErrorMessage(null);
    setInfoMessage(null);
    const error = await signInWithOAuth(getOauthProvider());
    if (error) {
      setErrorMessage(error.message);
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
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Sign up with email or {getOauthProvider()}. Same security model as sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configError || errorMessage ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Authentication note</AlertTitle>
              <AlertDescription>{configError || errorMessage}</AlertDescription>
            </Alert>
          ) : null}
          {infoMessage ? (
            <Alert variant="default">
              <CheckCircle2 />
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>{infoMessage}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="sign-up-email">Email</Label>
              <Input
                id="sign-up-email"
                name="email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sign-up-password">Password</Label>
              <Input
                id="sign-up-password"
                name="password"
                type="password"
                value={password}
                autoComplete="new-password"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button className="w-full" disabled={busy || loading} type="submit">
              {busy ? <Loader2 className="animate-spin" /> : null}
              Create account with email
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-sm">
            Already have an account?{" "}
            <Link
              href={nextParam ? `${authPaths.signIn}?next=${encodeURIComponent(nextParam)}` : authPaths.signIn}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              Sign in
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
