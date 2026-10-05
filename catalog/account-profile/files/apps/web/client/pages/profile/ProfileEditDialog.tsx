"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Separator } from "@client/components/ui/separator";
import type { UserOwner } from "@client/features/users";
import { AvatarEditor } from "./AvatarEditor";
import { ProfileEditForm } from "./ProfileEditForm";

type ProfileEditDialogProps = {
  user: UserOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProfileEditDialog({ user, open, onOpenChange }: ProfileEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Your picture, name, handle, and bio.
          </DialogDescription>
        </DialogHeader>
        <AvatarEditor user={user} />
        <Separator />
        <ProfileEditForm user={user} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
