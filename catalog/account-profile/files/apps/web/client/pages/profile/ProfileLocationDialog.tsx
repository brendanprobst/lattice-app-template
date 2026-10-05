"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Button } from "@client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@client/components/ui/dialog";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { useUpdateUserMutation, type UserOwner } from "@client/features/users";
import { FormEvent, useEffect, useState } from "react";

type ProfileLocationDialogProps = {
  user: UserOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProfileLocationDialog({
  user,
  open,
  onOpenChange,
}: ProfileLocationDialogProps) {
  const mutation = useUpdateUserMutation();
  const [zipCode, setZipCode] = useState(user.zipCode ?? "");

  useEffect(() => {
    if (!open) return;
    setZipCode(user.zipCode ?? "");
  }, [open, user.zipCode]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(
      {
        id: user.id,
        payload: {
          zipCode: zipCode.trim() || null,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Location</DialogTitle>
          <DialogDescription>
            Save a ZIP code. City and state stay empty unless you add a geo lookup later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" aria-label="Edit location">
          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error
                  ? mutation.error.message
                  : "Failed to save."}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="location-zip">ZIP code</Label>
            <Input
              id="location-zip"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              autoComplete="postal-code"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
