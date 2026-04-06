"use client";

import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import type { User } from "@supabase/supabase-js";

export function SignedInCard(props: {
  user: User;
  onContinue: () => void;
  onSignOut: () => void;
}) {
  const { user, onContinue, onSignOut } = props;
  return (
    <Card>
      <CardHeader>
        <Badge variant="secondary" className="w-fit">Authentication</Badge>
        <CardTitle className="text-2xl">Signed in</CardTitle>
        <CardDescription>
          {user.email ?? user.id}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button type="button" onClick={onContinue}>
          Continue to app
        </Button>
        <Button type="button" variant="outline" onClick={() => void onSignOut()}>
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
