"use client";

import { useAuth, useRequireAuth } from "@client/auth";
import { Button, buttonVariants } from "@client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
  useCreateThingMutation,
  useDeleteThingMutation,
  useThingsList,
  useUpdateThingMutation,
} from "@client/features/things";
import Link from "next/link";
import { type SubmitEvent, useMemo, useState } from "react";

export function ThingsPage() {
  const { loading } = useRequireAuth();
  const { signOut } = useAuth();
  const [newName, setNewName] = useState("");

  const {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
    setPageSize,
    nextPage,
    prevPage,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useThingsList();

  const createThing = useCreateThingMutation();
  const updateThing = useUpdateThingMutation();
  const deleteThing = useDeleteThingMutation();

  const surfaceError = useMemo(() => {
    const q = isError && error instanceof Error ? error.message : null;
    const m =
      createThing.error instanceof Error
        ? createThing.error.message
        : updateThing.error instanceof Error
          ? updateThing.error.message
          : deleteThing.error instanceof Error
            ? deleteThing.error.message
            : null;
    return q ?? m;
  }, [createThing.error, deleteThing.error, error, isError, updateThing.error]);

  async function onCreate(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createThing.mutateAsync(newName);
      setNewName("");
    } catch {
      /* surfaced via surfaceError */
    }
  }

  async function onUpdate(id: number, previousName: string) {
    const nextName = window.prompt("Rename thing", previousName);
    if (!nextName) {
      return;
    }
    try {
      await updateThing.mutateAsync({ id, name: nextName });
    } catch {
      /* surfaced via surfaceError */
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteThing.mutateAsync(id);
    } catch {
      /* surfaced via surfaceError */
    }
  }

  if (loading) {
    return <main className="p-8">Loading things...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Things</h1>
        <div className="flex gap-2">
          <Link href="/profile" className={buttonVariants({ variant: "outline" })}>Profile</Link>
          <Button onClick={() => signOut()}>Sign out</Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create a thing</CardTitle>
          <CardDescription>Authenticated CRUD demo using Supabase-backed API routes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2" onSubmit={onCreate}>
            <div className="flex-1 space-y-1">
              <Label htmlFor="thing-name">Name</Label>
              <Input
                id="thing-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="New thing name"
                required
              />
            </div>
            <Button className="self-end" type="submit" disabled={createThing.isPending}>
              Create
            </Button>
          </form>
          {surfaceError ? <p className="text-destructive mt-2">{surfaceError}</p> : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {isLoading ? "Loading list…" : `${total} thing${total === 1 ? "" : "s"}`}
          {isFetching && !isLoading ? " · Refreshing…" : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Refetch
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor="page-size" className="text-muted-foreground text-sm whitespace-nowrap">
              Per page
            </Label>
            <Input
              id="page-size"
              className="w-16"
              type="number"
              min={1}
              max={100}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) || 1)}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" disabled={!hasPrevPage} onClick={prevPage}>
              Prev
            </Button>
            <span className="text-muted-foreground px-2 text-sm tabular-nums">
              {page} / {totalPages}
            </span>
            <Button type="button" variant="outline" size="sm" disabled={!hasNextPage} onClick={nextPage}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <section className="space-y-2" aria-label="things-list">
        {items.map((thing) => (
          <Card key={thing.id}>
            <CardContent className="flex items-center justify-between py-4">
              <p>{thing.name}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={updateThing.isPending}
                  onClick={() => void onUpdate(thing.id, thing.name)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteThing.isPending}
                  onClick={() => void onDelete(thing.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
