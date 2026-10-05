"use client";

import { UserAvatar } from "@client/components/UserAvatar";
import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import { useMediaUpload } from "@client/features/storage";
import { useUpdateUserMutation, type UserOwner } from "@client/features/users";
import { Trash2, Upload } from "lucide-react";
import { useRef } from "react";

type AvatarEditorProps = {
  user: UserOwner;
};

/**
 * Owner-only picture controls. Saves `avatarUrl` on its own via signed upload.
 * `UserAvatar` comes from catalog/ui-chrome.
 */
export function AvatarEditor({ user }: AvatarEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useMediaUpload();
  const updateUser = useUpdateUserMutation();

  const hasPicture = Boolean(user.avatarUrl);
  const pending = upload.isPending || updateUser.isPending;
  const error = upload.error ?? updateUser.error;

  async function save(avatarUrl: string | null) {
    try {
      await updateUser.mutateAsync({ id: user.id, payload: { avatarUrl } });
    } catch {
      // Surfaced through `updateUser.error` below.
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    try {
      const uploaded = await upload.mutateAsync(file);
      await save(uploaded.publicUrl);
    } catch {
      // Surfaced through `upload.error` below.
    }
  }

  return (
    <section className="space-y-3" aria-label="Profile picture">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onPickFile(file);
        }}
      />

      {error instanceof Error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not update your picture</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col items-center gap-3">
        <UserAvatar name={user.displayName} url={user.avatarUrl} size="2xl" />
        <p className="text-muted-foreground text-center text-sm">
          JPEG, PNG, WebP, or GIF. Large images are resized for you.
        </p>
        {pending ? <p className="text-muted-foreground text-sm">Uploading…</p> : null}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => fileInput.current?.click()}
          >
            <Upload aria-hidden />
            {hasPicture ? "Replace image" : "Add image"}
          </Button>
          {hasPicture ? (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => void save(null)}
            >
              <Trash2 aria-hidden />
              Clear profile picture
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
