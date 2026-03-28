"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { Button, buttonVariants } from "@client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { authenticatedApiRequest } from "@client/lib/authenticatedApi";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ProfileResponse {
  id: string;
  email: string | null;
}

export function ProfilePage() {
  const { loading } = useRequireAuth();
  const { getAccessToken, signOut, user } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const token = await getAccessToken();
      if (!token) {
        setError("No access token is available for profile lookup.");
        return;
      }

      const response = await authenticatedApiRequest("/profile", {
        token,
        method: "GET",
      });

      if (!response.ok) {
        setError("Unable to load profile from API.");
        return;
      }

      const data = await response.json() as ProfileResponse;
      setProfile(data);
      setError(null);
    }

    if (!loading) {
      loadProfile().catch(() => setError("Unable to load profile from API."));
    }
  }, [getAccessToken, loading]);

  if (loading) {
    return <main className="p-8">Loading profile...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Profile</h1>
        <div className="flex gap-2">
          <Link href="/things" className={buttonVariants({ variant: "outline" })}>Things</Link>
          <Button onClick={() => signOut()}>Sign out</Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Authenticated user</CardTitle>
          <CardDescription>Email and id are from verified Supabase JWT claims.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Email:</strong> {profile?.email || user?.email || "No email available"}</p>
          <p><strong>User ID:</strong> {profile?.id || user?.id || "No id available"}</p>
          {error ? <p className="text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
