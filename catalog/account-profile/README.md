# account-profile

Users API + editable account UI + `AvatarEditor` with signed upload. Harvested from Fosterfolio and stripped of pets, shelters, star counts, Foster Me, vanity `/@handle` routes, and QR.

**`npm run scaffold` does not copy catalog.** Do **not** overwrite kernel `apps/web/client/pages/profile/ProfilePage.tsx` or kernel `GET /profile` (JWT `sub` + email smoke). Apply this pack beside Things: mount `/users` separately.

## Apply order

1. Apply [`../ui-chrome`](../ui-chrome/) first (`UserAvatar`, `BioPreview`, `OutboundLink`, `dialog`, `textarea`, `tooltip` if you use them).
2. Apply [`../media-widgets`](../media-widgets/) `lib/media/downscaleImage.ts` (avatar pipeline).
3. Copy everything under `files/` to the same repo-relative paths. **If you keep the kernel JWT profile page**, copy this pack’s `pages/profile/*` to a different folder (e.g. `pages/account/`) and re-export from there — do not clobber kernel `ProfilePage.tsx`.
4. Wire Container + `/users` router (below). Do **not** copy child-app `registerRoutes.ts` or `app.ts`.
5. Register user error codes. Call `EnsureUserOnAuth` so `users.id = JWT.sub`.
6. Wire `POST /storage/sign` (not shipped here) before avatar upload works.

## Kernel stays

| Keep | Role |
|------|------|
| `GET /profile` and `GET /me` | JWT claims only (`id`, `email`) |
| Kernel `ProfilePage` | Auth smoke for Things |

This pack adds `GET/PUT /users/:id` for the persisted account row.

## Container / routes

In `Container` constructor, next to Things:

```ts
this.userRepository = dataAdapter
  ? new UserRepository(dataAdapter)
  : new InMemoryUserRepository();
```

Getters:

```ts
getGetUserUseCase() {
  return new GetUserUseCase(this.userRepository);
}
getUpdateUserUseCase() {
  return new UpdateUserUseCase(this.userRepository);
}
getEnsureUserOnAuth() {
  return new EnsureUserOnAuth(this.userRepository);
}
```

In `createApp` (do not replace existing `/profile` mounts):

```ts
app.use(
  '/users',
  createUserRouter(appContainer, { requireAuth: protectedMiddleware }),
);
```

Optional: attach optional-auth on GET so the owner DTO (email, zip) is returned when the caller is the subject.

Call `getEnsureUserOnAuth().execute({ id: user.id, email: user.email })` after JWT verify, or on first owner GET. A Supabase trigger that inserts `(id, email)` on `auth.users` is equivalent.

`ErrorCatalog` + `HttpErrorMapper` additions:

| Code | Status |
|------|--------|
| `USER_NOT_FOUND` | 404 |
| `USER_FORBIDDEN` | 403 |
| `USER_INVALID_INPUT` | 400 |
| `HANDLE_INVALID` | 400 |
| `HANDLE_BLOCKLISTED` | 400 |
| `HANDLE_TAKEN` | 409 |

See `files/apps/api/domain/errors/catalogs/UserErrors.ts`.

## SignUpload (avatar)

`AvatarEditor` → `useMediaUpload` → downscale → `POST /storage/sign` → PUT `uploadUrl` → `PUT /users/:id` `{ avatarUrl: publicUrl }`.

This pack copies the **client** (`features/storage/*`) only. Provide an API signer (`SignUploadUseCase` + storage adapter) in the spawn. Do **not** invent placeholder image hosts.

## Files

| Catalog path | Spawn destination |
|--------------|-------------------|
| `files/apps/api/domain/entities/User.ts` | `apps/api/domain/entities/User.ts` |
| `files/apps/api/domain/value-objects/UserHandle.ts` | `apps/api/domain/value-objects/UserHandle.ts` |
| `files/apps/api/domain/repositories/IUserRepository.ts` | `apps/api/domain/repositories/IUserRepository.ts` |
| `files/apps/api/domain/errors/catalogs/UserErrors.ts` | `apps/api/domain/errors/catalogs/UserErrors.ts` |
| `files/apps/api/application/use-cases/GetUserUseCase.ts` | `apps/api/application/use-cases/GetUserUseCase.ts` |
| `files/apps/api/application/use-cases/UpdateUserUseCase.ts` | `apps/api/application/use-cases/UpdateUserUseCase.ts` |
| `files/apps/api/application/use-cases/EnsureUserOnAuth.ts` | `apps/api/application/use-cases/EnsureUserOnAuth.ts` |
| `files/apps/api/controllers/UserController.ts` | `apps/api/controllers/UserController.ts` |
| `files/apps/api/routes/users.ts` | `apps/api/routes/users.ts` |
| `files/apps/api/infrastructure/repositories/InMemoryUserRepository.ts` | `apps/api/infrastructure/repositories/InMemoryUserRepository.ts` |
| `files/apps/api/infrastructure/repositories/UserRepository.ts` | `apps/api/infrastructure/repositories/UserRepository.ts` |
| `files/apps/web/client/features/users/*` | `apps/web/client/features/users/*` |
| `files/apps/web/client/features/storage/*` | `apps/web/client/features/storage/*` |
| `files/apps/web/client/pages/profile/*` | Prefer `apps/web/client/pages/account/*` if kernel `/profile` stays |

## Deps

- Kernel: `@api/*` aliases, `Result` / `ErrorCatalog`, `Container`, `ResponseHandler`, `authenticatedApiRequest`, `getPublicApiBaseUrl`, `Button` / `Card` / `Input` / `Label` / `Alert` / `Badge` / `Separator`, TanStack Query, lucide.
- **ui-chrome:** `UserAvatar`, `BioPreview`, `OutboundLink`, `dialog`, `textarea`.
- **media-widgets:** `downscaleImage`.
- Spawn: `users` table + `POST /storage/sign`. No extra npm packages.

## Not included

Pets, shelters, `starCount`, Foster Me, vanity `/@handle` pages, QR, `registerRoutes.ts`, `app.ts`, geo lookup adapter, LoremFlickr / fake image URLs.
