"use client";

import { useAuth } from "@client/auth";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Badge } from "@client/components/ui/badge";
import { Button, buttonVariants } from "@client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { authPaths } from "@client/lib/constants/authPaths";
import { safeNextPath } from "@client/lib/safeNextPath";
import { cn } from "@client/lib/utils";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type SubmitEvent, useMemo, useState } from "react";

function BackToSignInLink() {
  return (
    <Link
      href={authPaths.signIn}
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      Back to sign in
    </Link>
  );
}

export function ResetPasswordPage() {
  const { user, loading, configError, updatePassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const destination = useMemo(() => safeNextPath(nextParam), [nextParam]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setBusy(true);
    const error = await updatePassword(password);
    if (error) {
      setMessage(error.message);
    } else {
      router.replace(destination);
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4">
        <Loader2 className="text-muted-foreground size-8 animate-spin" aria-hidden />
        <p className="text-muted-foreground mt-3 text-sm font-medium">Verifying reset link…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="bg-background min-h-screen px-4 py-10">
        <div className="mx-auto max-w-md">
          <BackToSignInLink />
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">Authentication</Badge>
              <CardTitle className="text-2xl">Reset link invalid</CardTitle>
              <CardDescription>
                This password reset link is missing, expired, or was already used. Request a new one from the forgot-password flow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={authPaths.forgotPassword} className={cn(buttonVariants(), "w-full")}>
                Request a new reset link
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen px-4 py-10">
      <div className="mx-auto max-w-md">
        <BackToSignInLink />
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">Authentication</Badge>
            <CardTitle className="text-2xl">Choose a new password</CardTitle>
            <CardDescription>
              Enter a new password for your account. You will stay signed in after you save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Configuration</AlertTitle>
                <AlertDescription>{configError}</AlertDescription>
              </Alert>
            ) : null}
            {message ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Could not update password</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            ) : null}

            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  name="new-password"
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={busy || loading || !!configError}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  value={confirm}
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                  disabled={busy || loading || !!configError}
                />
              </div>
              <Button className="w-full" disabled={busy || loading || !!configError} type="submit">
                {busy ? <Loader2 className="animate-spin" /> : null}
                Save new password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
