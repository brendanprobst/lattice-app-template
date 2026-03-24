"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@client/components/ui/alert";
import { Badge } from "@client/components/ui/badge";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { Separator } from "@client/components/ui/separator";
import { cn } from "@client/lib/utils";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Component,
  Info,
} from "lucide-react";

export function UiGalleryPage() {
  return (
    <div className="bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-6">
          <div>
            <p className="text-muted-foreground text-sm">Lattice · @lattice/web</p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Component gallery
            </h1>
            <p className="text-muted-foreground mt-1 max-w-xl text-sm">
              Live samples of Tailwind, shadcn/ui (Base UI), and lucide-react used
              in this template. Use this page for visual QA.
            </p>
          </div>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-12 px-4 py-10">
        <section data-testid="ui-section-buttons" aria-labelledby="gallery-buttons">
          <h2 id="gallery-buttons" className="font-heading mb-4 text-lg font-medium">
            Buttons
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Variants and sizes from <code className="rounded bg-muted px-1">Button</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button size="icon" aria-label="Check">
              <Check />
            </Button>
          </div>
        </section>

        <Separator />

        <section data-testid="ui-section-badges" aria-labelledby="gallery-badges">
          <h2 id="gallery-badges" className="font-heading mb-4 text-lg font-medium">
            Badges
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </section>

        <Separator />

        <section data-testid="ui-section-form" aria-labelledby="gallery-form">
          <h2 id="gallery-form" className="font-heading mb-4 text-lg font-medium">
            Form fields
          </h2>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Sample field</CardTitle>
              <CardDescription>
                <code className="rounded bg-muted px-1">Label</code> +{" "}
                <code className="rounded bg-muted px-1">Input</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="gallery-email">Email</Label>
              <Input
                id="gallery-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="off"
              />
            </CardContent>
            <CardFooter>
              <Button size="sm" type="button">
                Submit
                <ChevronRight className="ml-1" />
              </Button>
            </CardFooter>
          </Card>
        </section>

        <Separator />

        <section data-testid="ui-section-cards" aria-labelledby="gallery-cards">
          <h2 id="gallery-cards" className="font-heading mb-4 text-lg font-medium">
            Cards
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Component className="size-4" />
                  Card one
                </CardTitle>
                <CardDescription>Supporting text for the first card.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Use cards for grouped content and actions.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card two</CardTitle>
                <CardDescription>With footer actions.</CardDescription>
              </CardHeader>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" type="button">
                  Cancel
                </Button>
                <Button size="sm" type="button">
                  Continue
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <Separator />

        <section data-testid="ui-section-alerts" aria-labelledby="gallery-alerts">
          <h2 id="gallery-alerts" className="font-heading mb-4 text-lg font-medium">
            Alerts
          </h2>
          <div className="space-y-3">
            <Alert>
              <Info />
              <AlertTitle>Default alert</AlertTitle>
              <AlertDescription>
                Use alerts for inline messages. Icons come from{" "}
                <code className="rounded bg-muted px-1">lucide-react</code>.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Destructive</AlertTitle>
              <AlertDescription>
                Shown for errors or destructive outcomes.
              </AlertDescription>
            </Alert>
          </div>
        </section>
      </main>
    </div>
  );
}
