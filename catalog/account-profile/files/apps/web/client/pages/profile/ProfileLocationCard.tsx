"use client";

import { Badge } from "@client/components/ui/badge";
import { Button } from "@client/components/ui/button";
import type { UserOwner } from "@client/features/users";
import { cn } from "@client/lib/utils";
import { MapPin, Pencil } from "lucide-react";

type ProfileLocationCardProps = {
  user: UserOwner;
  onManage: () => void;
};

export function ProfileLocationCard({ user, onManage }: ProfileLocationCardProps) {
  const location = [user.city, user.state].filter(Boolean).join(", ") || user.zipCode;

  return (
    <section className="border-border rounded-xl border p-4" aria-label="Location">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Location</h2>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Edit location"
          onClick={onManage}
        >
          <Pencil aria-hidden />
        </Button>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        <li>
          <Badge variant="outline" className={cn(!location && "text-muted-foreground")}>
            <MapPin aria-hidden />
            {location || "Add your location"}
          </Badge>
        </li>
      </ul>
    </section>
  );
}
