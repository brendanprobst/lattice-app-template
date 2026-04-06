"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthBackHomeLink() {
  return (
    <Link
      href="/"
      className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      Back to project home page
    </Link>
  );
}

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-background min-h-screen px-4 py-10">
      <div className="mx-auto max-w-md">
        <AuthBackHomeLink />
        {children}
      </div>
    </main>
  );
}
