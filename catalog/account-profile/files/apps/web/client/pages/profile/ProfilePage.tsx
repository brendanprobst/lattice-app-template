"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { BioPreview } from "@client/components/BioPreview";
import { UserAvatar } from "@client/components/UserAvatar";
import { Button } from "@client/components/ui/button";
import { Separator } from "@client/components/ui/separator";
import { useOwnUser } from "@client/features/users";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { ConnectedSitesCard } from "./ConnectedSitesCard";
import { ProfileEditDialog } from "./ProfileEditDialog";
import { ProfileLinkCard } from "./ProfileLinkCard";
import { ProfileLocationCard } from "./ProfileLocationCard";
import { ProfileLocationDialog } from "./ProfileLocationDialog";
import { SocialLinksDialog } from "./SocialLinksDialog";

/**
 * Catalog editor for `GET/PUT /users/:id`.
 * Do not replace kernel `apps/web/client/pages/profile/ProfilePage.tsx`
 * (JWT `GET /profile`) unless you explicitly opt in.
 */
export function ProfilePage() {
  const { loading } = useRequireAuth();
  const { user } = useAuth();
  const own = useOwnUser(user?.id ?? null);
  const [editOpen, setEditOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);

  if (loading || !user || own.isLoading) {
    return <main className="p-8">Loading profile…</main>;
  }

  const profile = own.data;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-6">
          <header className="flex items-start gap-4">
            {profile ? (
              <section className="w-fit shrink-0" aria-label="Profile picture">
                <UserAvatar name={profile.displayName} url={profile.avatarUrl} size="xl" />
              </section>
            ) : null}
            <div className="min-w-0 flex-1 space-y-1 pt-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {profile?.displayName || "Add your name"}
                </h1>
                {profile ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit profile"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                ) : null}
              </div>
              {profile?.handle ? (
                <p className="text-muted-foreground font-mono text-sm">@{profile.handle}</p>
              ) : profile ? (
                <p className="text-muted-foreground text-sm">No handle yet.</p>
              ) : null}
              {profile?.bio ? (
                <BioPreview
                  bio={profile.bio}
                  markdownClassName="text-muted-foreground [&_p]:mb-0 text-sm leading-snug [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:hover:underline"
                  onReadMore={() => setEditOpen(true)}
                />
              ) : (
                <p className="text-muted-foreground text-sm">Add a short bio.</p>
              )}
            </div>
          </header>

          <Separator />

          {own.isError ? (
            <p className="text-destructive text-sm">
              {own.error instanceof Error
                ? own.error.message
                : "Unable to load profile from API."}
            </p>
          ) : null}

          {profile ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileLocationCard
                user={profile}
                onManage={() => setLocationOpen(true)}
              />
              <ConnectedSitesCard user={profile} onManage={() => setSocialOpen(true)} />
            </div>
          ) : null}
        </div>

        {profile ? (
          <aside>
            <ProfileLinkCard userId={profile.id} hasHandle={Boolean(profile.handle)} />
          </aside>
        ) : null}
      </div>

      {profile ? (
        <>
          <ProfileEditDialog user={profile} open={editOpen} onOpenChange={setEditOpen} />
          <ProfileLocationDialog
            user={profile}
            open={locationOpen}
            onOpenChange={setLocationOpen}
          />
          <SocialLinksDialog
            user={profile}
            open={socialOpen}
            onOpenChange={setSocialOpen}
          />
        </>
      ) : null}
    </main>
  );
}
