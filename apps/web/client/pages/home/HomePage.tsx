"use client";

import { Alert, AlertDescription, AlertTitle } from "@client/components/ui/alert";
import { Badge } from "@client/components/ui/badge";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { getPublicApiBaseUrl } from "@client/lib/publicApiBaseUrl";
import { cn } from "@client/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Cloud,
  Component,
  Copy,
  ExternalLink,
  Layers,
  Server,
  Terminal,
} from "lucide-react";
import Link from "next/link";

const DEFAULT_REPO_URL =
  "https://github.com/your-username/lattice-app-template";

function templateRepoUrl(): string {
  return (
    process.env.NEXT_PUBLIC_TEMPLATE_REPO_URL?.trim() || DEFAULT_REPO_URL
  );
}

const steps = [
  {
    step: 1,
    title: "Fork",
    description: "Create your app repo from this template.",
    icon: Copy,
  },
  {
    step: 2,
    title: "Configure",
    description: "Copy .env examples for API, web, and Terraform.",
    icon: Layers,
  },
  {
    step: 3,
    title: "Run locally",
    description: "npm ci, npm run ci, npm run dev.",
    icon: Terminal,
  },
  {
    step: 4,
    title: "Deploy",
    description: "Ship API + static web with your infra workflow.",
    icon: Cloud,
  },
] as const;

const stackItems = [
  {
    title: "API",
    body: "DDD Express under apps/api — Jest tests in test/api/.",
    icon: Server,
  },
  {
    title: "Web",
    body: "Next.js App Router — UI in client/ via @client/*.",
    icon: Boxes,
  },
  {
    title: "Tests",
    body: "test/api (Jest), test/web (Vitest + Playwright).",
    icon: Component,
  },
  {
    title: "Infra",
    body: "Terraform under infra/terraform when you wire AWS.",
    icon: Cloud,
  },
] as const;

export function HomePage() {
  const apiBaseUrl = getPublicApiBaseUrl();
  const repoUrl = templateRepoUrl();

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 md:py-16">
        <header className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Template</Badge>
            <Badge variant="outline">Monorepo</Badge>
          </div>
          <div className="space-y-3">
            <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              Lattice
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg md:text-xl">
              Generate your next product from a structured grid: DDD API, Next.js
              frontend, shared tests, and Terraform-ready infra — connected, not
              cobbled together.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              <ExternalLink className="size-4" />
              View on GitHub
            </a>
            <Link
              href="/ui"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              <Component className="size-4" />
              UI component gallery
              <ArrowRight className="size-4" />
            </Link>
            <a
              href={`${repoUrl}#readme`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
            >
              <BookOpen className="size-4" />
              README &amp; docs
            </a>
          </div>
        </header>

        <Alert>
          <Terminal />
          <AlertTitle>Environment</AlertTitle>
          <AlertDescription>
            Browser API base (<code className="rounded bg-muted px-1">NEXT_PUBLIC_API_URL</code>
            ):{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              {apiBaseUrl}
            </code>
            . Set it in{" "}
            <code className="rounded bg-muted px-1">.env.local</code> so the UI
            points at your running API.
          </AlertDescription>
        </Alert>

        <section aria-labelledby="lattice-steps-heading">
          <h2
            id="lattice-steps-heading"
            className="font-heading mb-6 text-2xl font-semibold tracking-tight"
          >
            From template to running app
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ step, title, description, icon: Icon }) => (
              <Card key={step} className="relative">
                <CardHeader className="pb-2">
                  <div className="text-muted-foreground mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {step}
                    </Badge>
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="lattice-stack-heading">
          <h2
            id="lattice-stack-heading"
            className="font-heading mb-6 text-2xl font-semibold tracking-tight"
          >
            What lives in the grid
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {stackItems.map(({ title, body, icon: Icon }) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-4" />
                    {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <footer className="text-muted-foreground border-t pt-8 text-sm">
          <p>
            Lattice — web app template. Fork it, rename it, and replace
            placeholders (including{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_TEMPLATE_REPO_URL</code>
            ) for your org.
          </p>
        </footer>
      </div>
    </div>
  );
}
