"use client";

import { useAuth } from "@client/auth";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { authPaths } from "@client/lib/constants/authPaths";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type SubmitEvent, useState } from "react";
import { AuthPageShell } from "./AuthPageShell";

export function ForgotPasswordPage() {
  const { loading, configError, requestPasswordReset } = useAuth();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const backToSignIn = nextParam
    ? `${authPaths.signIn}?next=${encodeURIComponent(nextParam)}`
    : authPaths.signIn;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setSuccessHint(null);
    const error = await requestPasswordReset(email);
    if (error) {
      setMessage(error.message);
    } else {
      setSuccessHint(
        "If an account exists for that email, you will receive a password reset link shortly.",
      );
    }
    setBusy(false);
  }

  return (
    <AuthPageShell>
      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Authentication</Badge>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>
            We will email you a link to choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configError || message ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Could not send email</AlertTitle>
              <AlertDescription>{configError || message}</AlertDescription>
            </Alert>
          ) : null}
          {successHint ? (
            <Alert variant="default">
              <CheckCircle2 />
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>{successHint}</AlertDescription>
            </Alert>
          ) : null}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <Button className="w-full" disabled={busy || loading} type="submit">
              {busy ? <Loader2 className="animate-spin" /> : null}
              Send reset link
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-sm">
            <Link href={backToSignIn} className="text-foreground font-medium underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
