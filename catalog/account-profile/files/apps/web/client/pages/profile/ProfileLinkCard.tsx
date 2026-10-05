"use client";

import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { cn } from "@client/lib/utils";
import { Check, Copy, Eye, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type ProfileLinkCardProps = {
  userId: string;
  hasHandle: boolean;
};

/** Slim share card: account id path only. No Foster Me, QR, or /@handle vanity. */
export function ProfileLinkCard({ userId, hasHandle }: ProfileLinkCardProps) {
  const path = `/users/${userId}`;
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    try {
      await navigator.clipboard.writeText(`${origin}${path}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Your account</CardTitle>
        <CardDescription>
          Copy or preview the API id used for this profile.
          {hasHandle ? " A handle is set on the account record." : " Add a handle in Edit profile if you want a short name."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <section
          aria-label="Account link"
          className="bg-muted/40 ring-foreground/10 space-y-3 rounded-xl p-3 ring-1"
        >
          <div className="flex items-center gap-2">
            <User aria-hidden className="size-4 shrink-0" />
            <h3 className="text-sm font-semibold tracking-tight">Account</h3>
          </div>
          <p className="text-muted-foreground font-mono text-xs break-all">{path}</p>
          <div className="space-y-2">
            <Link
              href={path}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}
              aria-label="Preview account"
            >
              <Eye aria-hidden />
              Preview
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              aria-label="Copy account link"
              onClick={() => void copyLink()}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
