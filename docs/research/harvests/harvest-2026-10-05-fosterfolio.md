# Harvest index — fosterfolio → lattice-app-template

**Generated:** 2026-10-05T02:37:05.934Z  
**Child app:** `/Users/brendanprobst/github/fosterfolio`  
**Template:** `/Users/brendanprobst/github/lattice-app-template`  
**Command:** `npm run harvest -- index --from /Users/brendanprobst/github/fosterfolio --focus profile,styling,components`

> SCRIPT sections are deterministic (re-run safe). AGENT and REVIEWER sections are preserved on re-run unless missing.


## § SCRIPT — Product exclusion rules

Paths containing these **path segments** are treated as child-app product domain (not upstream platform).

| Source | Segments |
|--------|----------|
| **Inferred** (child-app feature tokens − template) | `[handle]`, `author`, `count`, `feed`, `fosterfolio`, `inquiries`, `inquiry`, `owner`, `pet`, `pets`, `post`, `posts`, `registerroute`, `registerroutes`, `reset-password`, `search`, `star`, `stars`, `storage`, `update`, `updates`, `user`, `users` |
| **Child app config** (`.lattice/harvest.json` or `lattice-harvest.json`) | `inquiries`, `pets`, `posts`, `profiles`, `search`, `stars` |
| **Template config** (optional defaults in template repo) | _none_ |

To add or override: create `lattice-harvest.json` in the child app repo — see `docs/playbooks/upstream-harvest.md`.


## § SCRIPT — Utility focus

Requested scopes: `profile`, `styling`, `components`

Paths in feature/foundation buckets that match this harvest's utility focus (48):

- `agents/prompts/registry.yaml`
- `apps/api/routes/profile.ts`
- `apps/web/client/components/AGENTS.md`
- `apps/web/client/components/BioPreview.tsx`
- `apps/web/client/components/FeatureUnavailable.tsx`
- `apps/web/client/components/OutboundLink.tsx`
- `apps/web/client/components/OwnerOnlyLabel.tsx`
- `apps/web/client/components/PetCard.tsx`
- `apps/web/client/components/PetFacts.tsx`
- `apps/web/client/components/ShareQrDialog.tsx`
- `apps/web/client/components/ShareQrDownload.tsx`
- `apps/web/client/components/UserAvatar.tsx`
- `apps/web/client/components/layout`
- `apps/web/client/components/markdown`
- `apps/web/client/components/ui/dialog.tsx`
- `apps/web/client/components/ui/dropdown-menu.tsx`
- `apps/web/client/components/ui/sheet.tsx`
- `apps/web/client/components/ui/textarea.tsx`
- `apps/web/client/components/ui/tooltip.tsx`
- `apps/web/client/lib/constants/userProfileSentinel.ts`
- `apps/web/client/lib/userProfilePath.ts`
- `apps/web/client/pages/profile/AddPetShelterDialog.tsx`
- `apps/web/client/pages/profile/AgeUnitToggle.tsx`
- `apps/web/client/pages/profile/AvatarEditor.tsx`
- `apps/web/client/pages/profile/ConnectedSitesCard.tsx`
- `apps/web/client/pages/profile/PetEditor.tsx`
- `apps/web/client/pages/profile/PetEditorPage.tsx`
- `apps/web/client/pages/profile/PetPhotoDropzone.tsx`
- `apps/web/client/pages/profile/PetPhotoList.tsx`
- `apps/web/client/pages/profile/PetShelterPicker.tsx`
- `apps/web/client/pages/profile/PetsEmptyState.tsx`
- `apps/web/client/pages/profile/ProfileEditDialog.tsx`
- `apps/web/client/pages/profile/ProfileEditForm.tsx`
- `apps/web/client/pages/profile/ProfileLinkCard.tsx`
- `apps/web/client/pages/profile/ProfileLocationCard.tsx`
- `apps/web/client/pages/profile/ProfileLocationDialog.tsx`
- `apps/web/client/pages/profile/ProfilePage.tsx`
- `apps/web/client/pages/profile/SegmentedToggle.tsx`
- `apps/web/client/pages/profile/SexToggle.tsx`
- `apps/web/client/pages/profile/SocialLinksDialog.tsx`
- `apps/web/client/pages/profile/index.ts`
- `apps/web/docs/ui-and-styling.md`
- `test/web/unit/ProfileEditForm.test.tsx`
- `test/web/unit/ProfileLocationCard.test.tsx`
- `test/web/unit/ProfileLocationDialog.test.tsx`
- `test/web/unit/ProfilePage.test.tsx`
- `test/web/unit/PublicProfilePage.test.tsx`
- `test/web/unit/userProfilePath.test.ts`


## § SCRIPT — Feature candidates

Paths that differ or exist only in the **child app** (`fosterfolio`), outside product excludes and foundation list.
Agent: propose universal feature bundles (Track 1).

### Differs (74)

- `.cursor/rules/README.md`
- `.cursor/rules/ddd-expert.mdc`
- `.gitignore`
- `.lattice/refresh.json.example`
- `AGENTS.md`
- `README.md`
- `agents/README.md`
- `agents/prompts/ddd-expert.md`
- `agents/prompts/registry.yaml`
- `apps/api/.env.example`
- `apps/api/AGENTS.md`
- `apps/api/application/dtos/index.ts`
- `apps/api/config/swagger/decorators/index.decorators.ts`
- `apps/api/config/swagger/index.ts`
- `apps/api/domain/AGENTS.md`
- `apps/api/infrastructure/AGENTS.md`
- `apps/api/package.json`
- `apps/api/routes/AGENTS.md`
- `apps/api/routes/index.ts`
- `apps/api/routes/profile.ts`
- `apps/web/.env.example`
- `apps/web/AGENTS.md`
- `apps/web/app/ui/page.tsx`
- `apps/web/client/components/AGENTS.md`
- `apps/web/client/pages/AGENTS.md`
- `apps/web/client/pages/auth/AuthPageShell.tsx`
- `apps/web/client/pages/auth/ForgotPasswordPage.tsx`
- `apps/web/client/pages/auth/ResetPasswordPage.tsx`
- `apps/web/client/pages/auth/SignInPage.tsx`
- `apps/web/client/pages/auth/SignUpPage.tsx`
- `apps/web/client/pages/auth/SignedInCard.tsx`
- `apps/web/client/pages/auth/oauth.ts`
- `apps/web/client/pages/home/HomePage.tsx`
- `apps/web/client/pages/home/homeLanding.ts`
- `apps/web/client/pages/profile/ProfilePage.tsx`
- `apps/web/client/pages/profile/index.ts`
- `apps/web/client/pages/ui-gallery/UiGalleryPage.tsx`
- `apps/web/client/stores/AGENTS.md`
- `apps/web/docs/ui-and-styling.md`
- `apps/web/package.json`
- `apps/web/tsconfig.tsbuildinfo`
- `docs/AGENTS.md`
- `docs/adr/006-full-stack-and-deployment.md`
- `docs/adr/007-ci-and-environment-promotion.md`
- `docs/deploy-aws.md`
- `docs/plans/smoke_test_deployment_guide.plan.md`
- `docs/plans/template_completeness_backlog.plan.md`
- `docs/playbooks/email-allowlist.md`
- `docs/playbooks/google-sso.md`
- `docs/playbooks/infisical-github-deploys.md`
- `docs/playbooks/route53-custom-domain.md`
- `docs/playbooks/supabase-migrations.md`
- `docs/playbooks/upstream-harvest.md`
- `docs/scaffold-workflow.md`
- `infra/AGENTS.md`
- `scripts/deploy-aws-web.mjs`
- `scripts/lattice-harvest-index.mjs`
- `scripts/lattice-harvest-paths.mjs`
- `scripts/sync-infisical-terraform-outputs.mjs`
- `scripts/use-agent.mjs`
- `supabase/.env.example`
- `supabase/.gitignore`
- `test/api/adapters/supabaseAdapter.test.ts`
- `test/api/auth/allowlist.integration.test.ts`
- `test/api/auth/requireAllowedEmail.test.ts`
- `test/api/auth/supabaseAuthMiddleware.test.ts`
- `test/web/AGENTS.md`
- `test/web/e2e/auth-guard.spec.ts`
- `test/web/e2e/full-stack.spec.ts`
- `test/web/e2e/home.spec.ts`
- `test/web/e2e/support/e2eAuthConstants.ts`
- `test/web/playwright.config.ts`
- `test/web/unit/HomePage.test.tsx`
- `test/web/unit/ResetPasswordPage.test.tsx`


### Only in child app (181)

- `.claude/commands`
- `.cursor/mcp.json`
- `.cursor/rules/session-fix.mdc`
- `.cursor/rules/session-next.mdc`
- `.cursor/rules/session-review.mdc`
- `.cursor/rules/session.mdc`
- `.infisical.json`
- `.lattice/harvest.json`
- `agents/prompts/session-fix.md`
- `agents/prompts/session-next.md`
- `agents/prompts/session-review.md`
- `agents/prompts/session.md`
- `apps/api/.env.dev`
- `apps/api/.env.prod`
- `apps/api/application/dtos/AGENTS.md`
- `apps/api/application/isHandleUniqueViolation.ts`
- `apps/api/application/resolveUser.ts`
- `apps/api/application/use-cases/AddStarUseCase.ts`
- `apps/api/application/use-cases/CreateInquiryUseCase.ts`
- `apps/api/application/use-cases/CreatePetUseCase.ts`
- `apps/api/application/use-cases/CreatePostUseCase.ts`
- `apps/api/application/use-cases/GetPetUpdatesUseCase.ts`
- `apps/api/application/use-cases/GetPetUseCase.ts`
- `apps/api/application/use-cases/GetPostUseCase.ts`
- `apps/api/application/use-cases/GetStarCountUseCase.ts`
- `apps/api/application/use-cases/GetUserUseCase.ts`
- `apps/api/application/use-cases/ListFeedUseCase.ts`
- `apps/api/application/use-cases/ListPetsByOwnerUseCase.ts`
- `apps/api/application/use-cases/ListPostsByAuthorUseCase.ts`
- `apps/api/application/use-cases/SearchUseCase.ts`
- `apps/api/application/use-cases/SignUploadUseCase.ts`
- `apps/api/application/use-cases/SoftDeletePetUseCase.ts`
- `apps/api/application/use-cases/SoftDeletePostUseCase.ts`
- `apps/api/application/use-cases/UpdatePetUseCase.ts`
- `apps/api/application/use-cases/UpdatePostUseCase.ts`
- `apps/api/application/use-cases/UpdateUserUseCase.ts`
- `apps/api/config/swagger/decorators/inquiries.decorators.ts`
- `apps/api/config/swagger/decorators/pets.decorators.ts`
- `apps/api/config/swagger/decorators/posts.decorators.ts`
- `apps/api/config/swagger/decorators/search.decorators.ts`
- `apps/api/config/swagger/decorators/storage.decorators.ts`
- `apps/api/config/swagger/decorators/users.decorators.ts`
- `apps/api/controllers/InquiryController.ts`
- `apps/api/controllers/PetController.ts`
- `apps/api/controllers/PostController.ts`
- `apps/api/controllers/SearchController.ts`
- `apps/api/controllers/StorageController.ts`
- `apps/api/controllers/UserController.ts`
- `apps/api/domain/entities/Pet.ts`
- `apps/api/domain/entities/Post.ts`
- `apps/api/domain/entities/User.ts`
- `apps/api/domain/repositories/IInquiryRepository.ts`
- `apps/api/domain/repositories/IPetRepository.ts`
- `apps/api/domain/repositories/IPostRepository.ts`
- `apps/api/domain/repositories/ISearchRepository.ts`
- `apps/api/domain/repositories/IStarRepository.ts`
- `apps/api/domain/repositories/IUserRepository.ts`
- `apps/api/domain/value-objects/UserHandle.ts`
- `apps/api/infrastructure/composition`
- `apps/api/infrastructure/e2eSeed.ts`
- `apps/api/infrastructure/repositories/InMemoryInquiryRepository.ts`
- `apps/api/infrastructure/repositories/InMemoryPetRepository.ts`
- `apps/api/infrastructure/repositories/InMemoryPostRepository.ts`
- `apps/api/infrastructure/repositories/InMemorySearchRepository.ts`
- `apps/api/infrastructure/repositories/InMemoryStarRepository.ts`
- `apps/api/infrastructure/repositories/InMemoryUserRepository.ts`
- `apps/api/infrastructure/repositories/InquiryRepository.ts`
- `apps/api/infrastructure/repositories/PetRepository.ts`
- `apps/api/infrastructure/repositories/PostRepository.ts`
- `apps/api/infrastructure/repositories/SearchRepository.ts`
- `apps/api/infrastructure/repositories/StarRepository.ts`
- `apps/api/infrastructure/repositories/UserRepository.ts`
- `apps/api/routes/inquiries.ts`
- `apps/api/routes/pets.ts`
- `apps/api/routes/posts.ts`
- `apps/api/routes/registerRoutes.ts`
- `apps/api/routes/search.ts`
- `apps/api/routes/storage.ts`
- `apps/api/routes/users.ts`
- `apps/web/.env.prod`
- `apps/web/app/icon.svg`
- `apps/web/client/components/BioPreview.tsx`
- `apps/web/client/components/FeatureUnavailable.tsx`
- `apps/web/client/components/OutboundLink.tsx`
- `apps/web/client/components/OwnerOnlyLabel.tsx`
- `apps/web/client/components/PetCard.tsx`
- `apps/web/client/components/PetFacts.tsx`
- `apps/web/client/components/ShareQrDialog.tsx`
- `apps/web/client/components/ShareQrDownload.tsx`
- `apps/web/client/components/UserAvatar.tsx`
- `apps/web/client/components/layout`
- `apps/web/client/components/markdown`
- `apps/web/client/components/ui/dialog.tsx`
- `apps/web/client/components/ui/dropdown-menu.tsx`
- `apps/web/client/components/ui/sheet.tsx`
- `apps/web/client/components/ui/textarea.tsx`
- `apps/web/client/components/ui/tooltip.tsx`
- `apps/web/client/pages/login`
- `apps/web/client/pages/profile/AddPetShelterDialog.tsx`
- `apps/web/client/pages/profile/AgeUnitToggle.tsx`
- `apps/web/client/pages/profile/AvatarEditor.tsx`
- `apps/web/client/pages/profile/ConnectedSitesCard.tsx`
- `apps/web/client/pages/profile/PetEditor.tsx`
- `apps/web/client/pages/profile/PetEditorPage.tsx`
- `apps/web/client/pages/profile/PetPhotoDropzone.tsx`
- `apps/web/client/pages/profile/PetPhotoList.tsx`
- `apps/web/client/pages/profile/PetShelterPicker.tsx`
- `apps/web/client/pages/profile/PetsEmptyState.tsx`
- `apps/web/client/pages/profile/ProfileEditDialog.tsx`
- `apps/web/client/pages/profile/ProfileEditForm.tsx`
- `apps/web/client/pages/profile/ProfileLinkCard.tsx`
- `apps/web/client/pages/profile/ProfileLocationCard.tsx`
- `apps/web/client/pages/profile/ProfileLocationDialog.tsx`
- `apps/web/client/pages/profile/SegmentedToggle.tsx`
- `apps/web/client/pages/profile/SexToggle.tsx`
- `apps/web/client/pages/profile/SocialLinksDialog.tsx`
- `docs/plans/fosterfolio_mvp.plan.md`
- `docs/plans/todo.md`
- `docs/plans/vanity_urls.plan.md`
- `docs/playbooks/dev-seed-data.md`
- `docs/playbooks/how-to-close-out-a-work-session.md`
- `docs/playbooks/media-upload.md`
- `docs/playbooks/private-beta.md`
- `docs/playbooks/prod-standup.md`
- `scripts/smoke.mjs`
- `scripts/supabase-cli.mjs`
- `scripts/supabase-seed.mjs`
- `supabase/.env.prod`
- `supabase/.temp`
- `supabase/AGENTS.md`
- `supabase/config.toml`
- `supabase/migrations`
- `supabase/seed`
- `test/api/e2eSeed.test.ts`
- `test/api/inquiries.test.ts`
- `test/api/isHandleUniqueViolation.test.ts`
- `test/api/pets.test.ts`
- `test/api/posts.test.ts`
- `test/api/search.test.ts`
- `test/api/stars.test.ts`
- `test/api/storage.test.ts`
- `test/api/users.test.ts`
- `test/web/e2e/product.spec.ts`
- `test/web/e2e/support/e2ePaths.ts`
- `test/web/e2e/support/e2eSeedConstants.ts`
- `test/web/e2e/support/e2eSession.ts`
- `test/web/unit/AppHeader.test.tsx`
- `test/web/unit/AuthSsoButton.test.tsx`
- `test/web/unit/AvatarEditor.test.tsx`
- `test/web/unit/ConnectedSitesCard.test.tsx`
- `test/web/unit/ExpandableInquiryForm.test.tsx`
- `test/web/unit/FeedPage.test.tsx`
- `test/web/unit/FosterMePage.test.tsx`
- `test/web/unit/InquiryForm.test.tsx`
- `test/web/unit/Markdown.test.tsx`
- `test/web/unit/PageWithSidebar.test.tsx`
- `test/web/unit/PetBioPage.test.tsx`
- `test/web/unit/PetBioView.test.tsx`
- `test/web/unit/PetCard.test.tsx`
- `test/web/unit/PetEditor.test.tsx`
- `test/web/unit/PetEditorPage.test.tsx`
- `test/web/unit/PostCard.test.tsx`
- `test/web/unit/ProfileEditForm.test.tsx`
- `test/web/unit/ProfileLocationCard.test.tsx`
- `test/web/unit/ProfileLocationDialog.test.tsx`
- `test/web/unit/ProfilePage.test.tsx`
- `test/web/unit/PublicBio.test.tsx`
- `test/web/unit/PublicProfilePage.test.tsx`
- `test/web/unit/SearchPage.test.tsx`
- `test/web/unit/SocialLinksDialog.test.tsx`
- `test/web/unit/bioPreview.test.ts`
- `test/web/unit/cloudfrontPetRewrite.test.ts`
- `test/web/unit/displayInitials.test.ts`
- `test/web/unit/fosterfolioFeatureFlags.test.ts`
- `test/web/unit/isAllowedImageFile.test.ts`
- `test/web/unit/petBioPath.test.ts`
- `test/web/unit/petEditorPath.test.ts`
- `test/web/unit/selectFosterMePet.test.ts`
- `test/web/unit/shelterLinks.test.tsx`
- `test/web/unit/support`
- `test/web/unit/userProfilePath.test.ts`


### Suggested groupings (spawn-only clusters)


**.claude/commands** (1 path)

- `.claude/commands`

**.cursor/mcp.json** (1 path)

- `.cursor/mcp.json`

**.cursor/rules** (4 paths)

- `.cursor/rules/session-fix.mdc`
- `.cursor/rules/session-next.mdc`
- `.cursor/rules/session-review.mdc`
- `.cursor/rules/session.mdc`

**.infisical.json** (1 path)

- `.infisical.json`

**.lattice/harvest.json** (1 path)

- `.lattice/harvest.json`

**agents/prompts** (4 paths)

- `agents/prompts/session-fix.md`
- `agents/prompts/session-next.md`
- `agents/prompts/session-review.md`
- `agents/prompts/session.md`

**apps/api/.env.dev** (1 path)

- `apps/api/.env.dev`

**apps/api/.env.prod** (1 path)

- `apps/api/.env.prod`

**apps/api/application** (22 paths)

- `apps/api/application/dtos/AGENTS.md`
- `apps/api/application/isHandleUniqueViolation.ts`
- `apps/api/application/resolveUser.ts`
- `apps/api/application/use-cases/AddStarUseCase.ts`
- `apps/api/application/use-cases/CreateInquiryUseCase.ts`
- `apps/api/application/use-cases/CreatePetUseCase.ts`
- `apps/api/application/use-cases/CreatePostUseCase.ts`
- `apps/api/application/use-cases/GetPetUpdatesUseCase.ts`
- `apps/api/application/use-cases/GetPetUseCase.ts`
- `apps/api/application/use-cases/GetPostUseCase.ts`
- `apps/api/application/use-cases/GetStarCountUseCase.ts`
- `apps/api/application/use-cases/GetUserUseCase.ts`
- `apps/api/application/use-cases/ListFeedUseCase.ts`
- `apps/api/application/use-cases/ListPetsByOwnerUseCase.ts`
- `apps/api/application/use-cases/ListPostsByAuthorUseCase.ts`
- `apps/api/application/use-cases/SearchUseCase.ts`
- `apps/api/application/use-cases/SignUploadUseCase.ts`
- `apps/api/application/use-cases/SoftDeletePetUseCase.ts`
- `apps/api/application/use-cases/SoftDeletePostUseCase.ts`
- `apps/api/application/use-cases/UpdatePetUseCase.ts`
- `apps/api/application/use-cases/UpdatePostUseCase.ts`
- `apps/api/application/use-cases/UpdateUserUseCase.ts`

**apps/api/config** (6 paths)

- `apps/api/config/swagger/decorators/inquiries.decorators.ts`
- `apps/api/config/swagger/decorators/pets.decorators.ts`
- `apps/api/config/swagger/decorators/posts.decorators.ts`
- `apps/api/config/swagger/decorators/search.decorators.ts`
- `apps/api/config/swagger/decorators/storage.decorators.ts`
- `apps/api/config/swagger/decorators/users.decorators.ts`

**apps/api/controllers** (6 paths)

- `apps/api/controllers/InquiryController.ts`
- `apps/api/controllers/PetController.ts`
- `apps/api/controllers/PostController.ts`
- `apps/api/controllers/SearchController.ts`
- `apps/api/controllers/StorageController.ts`
- `apps/api/controllers/UserController.ts`

**apps/api/domain** (10 paths)

- `apps/api/domain/entities/Pet.ts`
- `apps/api/domain/entities/Post.ts`
- `apps/api/domain/entities/User.ts`
- `apps/api/domain/repositories/IInquiryRepository.ts`
- `apps/api/domain/repositories/IPetRepository.ts`
- `apps/api/domain/repositories/IPostRepository.ts`
- `apps/api/domain/repositories/ISearchRepository.ts`
- `apps/api/domain/repositories/IStarRepository.ts`
- `apps/api/domain/repositories/IUserRepository.ts`
- `apps/api/domain/value-objects/UserHandle.ts`

**apps/api/infrastructure** (14 paths)

- `apps/api/infrastructure/composition`
- `apps/api/infrastructure/e2eSeed.ts`
- `apps/api/infrastructure/repositories/InMemoryInquiryRepository.ts`
- `apps/api/infrastructure/repositories/InMemoryPetRepository.ts`
- `apps/api/infrastructure/repositories/InMemoryPostRepository.ts`
- `apps/api/infrastructure/repositories/InMemorySearchRepository.ts`
- `apps/api/infrastructure/repositories/InMemoryStarRepository.ts`
- `apps/api/infrastructure/repositories/InMemoryUserRepository.ts`
- `apps/api/infrastructure/repositories/InquiryRepository.ts`
- `apps/api/infrastructure/repositories/PetRepository.ts`
- `apps/api/infrastructure/repositories/PostRepository.ts`
- `apps/api/infrastructure/repositories/SearchRepository.ts`
- `apps/api/infrastructure/repositories/StarRepository.ts`
- `apps/api/infrastructure/repositories/UserRepository.ts`

**apps/api/routes** (7 paths)

- `apps/api/routes/inquiries.ts`
- `apps/api/routes/pets.ts`
- `apps/api/routes/posts.ts`
- `apps/api/routes/registerRoutes.ts`
- `apps/api/routes/search.ts`
- `apps/api/routes/storage.ts`
- `apps/api/routes/users.ts`

**apps/web/.env.prod** (1 path)

- `apps/web/.env.prod`

**apps/web/app** (1 path)

- `apps/web/app/icon.svg`

**apps/web/client** (35 paths)

- `apps/web/client/components/BioPreview.tsx`
- `apps/web/client/components/FeatureUnavailable.tsx`
- `apps/web/client/components/OutboundLink.tsx`
- `apps/web/client/components/OwnerOnlyLabel.tsx`
- `apps/web/client/components/PetCard.tsx`
- `apps/web/client/components/PetFacts.tsx`
- `apps/web/client/components/ShareQrDialog.tsx`
- `apps/web/client/components/ShareQrDownload.tsx`
- `apps/web/client/components/UserAvatar.tsx`
- `apps/web/client/components/layout`
- `apps/web/client/components/markdown`
- `apps/web/client/components/ui/dialog.tsx`
- `apps/web/client/components/ui/dropdown-menu.tsx`
- `apps/web/client/components/ui/sheet.tsx`
- `apps/web/client/components/ui/textarea.tsx`
- `apps/web/client/components/ui/tooltip.tsx`
- `apps/web/client/pages/login`
- `apps/web/client/pages/profile/AddPetShelterDialog.tsx`
- `apps/web/client/pages/profile/AgeUnitToggle.tsx`
- `apps/web/client/pages/profile/AvatarEditor.tsx`
- `apps/web/client/pages/profile/ConnectedSitesCard.tsx`
- `apps/web/client/pages/profile/PetEditor.tsx`
- `apps/web/client/pages/profile/PetEditorPage.tsx`
- `apps/web/client/pages/profile/PetPhotoDropzone.tsx`
- `apps/web/client/pages/profile/PetPhotoList.tsx`
- `apps/web/client/pages/profile/PetShelterPicker.tsx`
- `apps/web/client/pages/profile/PetsEmptyState.tsx`
- `apps/web/client/pages/profile/ProfileEditDialog.tsx`
- `apps/web/client/pages/profile/ProfileEditForm.tsx`
- `apps/web/client/pages/profile/ProfileLinkCard.tsx`
- `apps/web/client/pages/profile/ProfileLocationCard.tsx`
- `apps/web/client/pages/profile/ProfileLocationDialog.tsx`
- `apps/web/client/pages/profile/SegmentedToggle.tsx`
- `apps/web/client/pages/profile/SexToggle.tsx`
- `apps/web/client/pages/profile/SocialLinksDialog.tsx`

**docs/plans** (3 paths)

- `docs/plans/fosterfolio_mvp.plan.md`
- `docs/plans/todo.md`
- `docs/plans/vanity_urls.plan.md`

**docs/playbooks** (5 paths)

- `docs/playbooks/dev-seed-data.md`
- `docs/playbooks/how-to-close-out-a-work-session.md`
- `docs/playbooks/media-upload.md`
- `docs/playbooks/private-beta.md`
- `docs/playbooks/prod-standup.md`

**scripts/** (3 paths)

- `scripts/smoke.mjs`
- `scripts/supabase-cli.mjs`
- `scripts/supabase-seed.mjs`

**supabase/.env.prod** (1 path)

- `supabase/.env.prod`

**supabase/.temp** (1 path)

- `supabase/.temp`

**supabase/AGENTS.md** (1 path)

- `supabase/AGENTS.md`

**supabase/config.toml** (1 path)

- `supabase/config.toml`

**supabase/migrations** (1 path)

- `supabase/migrations`

**supabase/seed** (1 path)

- `supabase/seed`

**test/api** (9 paths)

- `test/api/e2eSeed.test.ts`
- `test/api/inquiries.test.ts`
- `test/api/isHandleUniqueViolation.test.ts`
- `test/api/pets.test.ts`
- `test/api/posts.test.ts`
- `test/api/search.test.ts`
- `test/api/stars.test.ts`
- `test/api/storage.test.ts`
- `test/api/users.test.ts`

**test/web** (39 paths)

- `test/web/e2e/product.spec.ts`
- `test/web/e2e/support/e2ePaths.ts`
- `test/web/e2e/support/e2eSeedConstants.ts`
- `test/web/e2e/support/e2eSession.ts`
- `test/web/unit/AppHeader.test.tsx`
- `test/web/unit/AuthSsoButton.test.tsx`
- `test/web/unit/AvatarEditor.test.tsx`
- `test/web/unit/ConnectedSitesCard.test.tsx`
- `test/web/unit/ExpandableInquiryForm.test.tsx`
- `test/web/unit/FeedPage.test.tsx`
- `test/web/unit/FosterMePage.test.tsx`
- `test/web/unit/InquiryForm.test.tsx`
- `test/web/unit/Markdown.test.tsx`
- `test/web/unit/PageWithSidebar.test.tsx`
- `test/web/unit/PetBioPage.test.tsx`
- `test/web/unit/PetBioView.test.tsx`
- `test/web/unit/PetCard.test.tsx`
- `test/web/unit/PetEditor.test.tsx`
- `test/web/unit/PetEditorPage.test.tsx`
- `test/web/unit/PostCard.test.tsx`
- `test/web/unit/ProfileEditForm.test.tsx`
- `test/web/unit/ProfileLocationCard.test.tsx`
- `test/web/unit/ProfileLocationDialog.test.tsx`
- `test/web/unit/ProfilePage.test.tsx`
- `test/web/unit/PublicBio.test.tsx`
- `test/web/unit/PublicProfilePage.test.tsx`
- `test/web/unit/SearchPage.test.tsx`
- `test/web/unit/SocialLinksDialog.test.tsx`
- `test/web/unit/bioPreview.test.ts`
- `test/web/unit/cloudfrontPetRewrite.test.ts`
- `test/web/unit/displayInitials.test.ts`
- `test/web/unit/fosterfolioFeatureFlags.test.ts`
- `test/web/unit/isAllowedImageFile.test.ts`
- `test/web/unit/petBioPath.test.ts`
- `test/web/unit/petEditorPath.test.ts`
- `test/web/unit/selectFosterMePet.test.ts`
- `test/web/unit/shelterLinks.test.tsx`
- `test/web/unit/support`
- `test/web/unit/userProfilePath.test.ts`

## § SCRIPT — Foundation files changed

Shared platform paths (HTTP, auth, infra, deploy, CI, test harness). Agent: per-hunk audit with `F-###` (Track 2).
Compare: `diff -u "lattice-app-template/<path>" "<child-app>/<path>"` (this run: `fosterfolio`)

### Differs (48)

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-app.yml`
- `apps/api/app.ts`
- `apps/api/auth/createProtectedMiddlewareStack.ts`
- `apps/api/auth/supabaseAuthMiddleware.ts`
- `apps/api/auth/types.ts`
- `apps/api/bin/www.ts`
- `apps/api/domain/errors/ErrorCatalog.ts`
- `apps/api/domain/errors/ResultError.ts`
- `apps/api/infrastructure/adapters/dataAdapter/DataAdapter.ts`
- `apps/api/infrastructure/adapters/supabase/SupabaseAdapter.ts`
- `apps/api/infrastructure/container.ts`
- `apps/api/utils/httpErrorMapper.ts`
- `apps/web/app/layout.tsx`
- `apps/web/client/auth/AuthBootstrapShell.tsx`
- `apps/web/client/auth/AuthProvider.tsx`
- `apps/web/client/auth/allowlistError.ts`
- `apps/web/client/auth/useRequireAuth.ts`
- `apps/web/client/lib/safeNextPath.ts`
- `apps/web/next.config.ts`
- `infra/terraform/README.md`
- `infra/terraform/cloudfront/functions/viewer_request_next_static_export.js`
- `infra/terraform/envs/dev/.terraform.lock.hcl`
- `infra/terraform/envs/dev/checks.tf`
- `infra/terraform/envs/dev/dns.tf`
- `infra/terraform/envs/dev/main.tf`
- `infra/terraform/envs/dev/outputs.tf`
- `infra/terraform/envs/dev/terraform.tfvars.example`
- `infra/terraform/envs/dev/variables.tf`
- `infra/terraform/envs/dev/versions.tf`
- `infra/terraform/envs/prod/.terraform.lock.hcl`
- `infra/terraform/envs/prod/checks.tf`
- `infra/terraform/envs/prod/dns.tf`
- `infra/terraform/envs/prod/main.tf`
- `infra/terraform/envs/prod/outputs.tf`
- `infra/terraform/envs/prod/terraform.tfvars.example`
- `infra/terraform/envs/prod/variables.tf`
- `infra/terraform/envs/prod/versions.tf`
- `package.json`
- `scripts/deploy-aws.mjs`
- `scripts/env-files.mjs`
- `scripts/refresh-spawn.mjs`
- `scripts/scaffold.mjs`
- `test/api/index.test.ts`
- `test/api/setup.ts`
- `test/api/utils/httpErrorMapper.test.ts`
- `test/api/utils/responseHandler.test.ts`
- `test/api/utils/resultError.test.ts`


### Only in child app (26)

- `.github/workflows/sync-main-into-dev.yml`
- `apps/api/auth/createAuthMiddleware.ts`
- `apps/api/domain/errors/catalogs`
- `apps/api/infrastructure/adapters/email`
- `apps/api/infrastructure/adapters/geo`
- `apps/web/client/lib/bioPreview.ts`
- `apps/web/client/lib/constants/petBioSentinel.ts`
- `apps/web/client/lib/constants/userProfileSentinel.ts`
- `apps/web/client/lib/displayInitials.ts`
- `apps/web/client/lib/fosterfolioFeatureFlags.ts`
- `apps/web/client/lib/humanizeToken.ts`
- `apps/web/client/lib/media`
- `apps/web/client/lib/petBioPath.ts`
- `apps/web/client/lib/petEditorPath.ts`
- `apps/web/client/lib/posthog`
- `apps/web/client/lib/publicApiRequest.ts`
- `apps/web/client/lib/readApiError.ts`
- `apps/web/client/lib/selectFosterMePet.ts`
- `apps/web/client/lib/shelterLinks.ts`
- `apps/web/client/lib/userProfilePath.ts`
- `infra/terraform/envs/dev/ses.tf`
- `infra/terraform/envs/dev/terraform.tfvars`
- `infra/terraform/envs/prod/.infisical.json`
- `infra/terraform/envs/prod/ses.tf`
- `infra/terraform/envs/prod/terraform.tfvars`
- `infra/terraform/modules/ses_smtp`


## § SCRIPT — Excluded and template-only

### Product / child-app domain — differs (0)

_None._


### Product / child-app domain — only in child app (19)

- `apps/api/infrastructure/adapters/storage`
- `apps/web/app/[handle]`
- `apps/web/app/feed`
- `apps/web/app/pets`
- `apps/web/app/profile/pets`
- `apps/web/app/search`
- `apps/web/app/users`
- `apps/web/client/features/inquiries`
- `apps/web/client/features/pets`
- `apps/web/client/features/posts`
- `apps/web/client/features/search`
- `apps/web/client/features/stars`
- `apps/web/client/features/storage`
- `apps/web/client/features/users`
- `apps/web/client/pages/feed`
- `apps/web/client/pages/pets`
- `apps/web/client/pages/reset-password`
- `apps/web/client/pages/search`
- `apps/web/client/pages/users`


### Product / spawn domain — only in lattice-app-template (0)

_None._


### Only in lattice-app-template (non-product) (48)

- `.cursor/skills`
- `.github/workflows/deploy-aws.yml`
- `.lattice/infisical.json.example`
- `.lattice/standup.json.example`
- `.lattice/terraform-backend.json.example`
- `apps/api/application/dtos/ThingDto.ts`
- `apps/api/application/use-cases/CreateThingUseCase.ts`
- `apps/api/application/use-cases/DeleteThingUseCase.ts`
- `apps/api/application/use-cases/GetThingByIdUseCase.ts`
- `apps/api/application/use-cases/ListThingsUseCase.ts`
- `apps/api/application/use-cases/UpdateThingUseCase.ts`
- `apps/api/config/swagger/decorators/things.decorators.ts`
- `apps/api/controllers/ThingController.ts`
- `apps/api/domain/entities/Thing.ts`
- `apps/api/domain/repositories/IThingRepository.ts`
- `apps/api/infrastructure/adapters/ThingDataAdapter.ts`
- `apps/api/infrastructure/repositories/InMemoryThingRepository.ts`
- `apps/api/infrastructure/repositories/ThingRepository.ts`
- `apps/api/infrastructure/seed.ts`
- `apps/api/routes/things.ts`
- `apps/api/supabase`
- `apps/web/.env.example copy`
- `apps/web/app/favicon.ico`
- `apps/web/app/things`
- `apps/web/client/features/things`
- `apps/web/client/pages/things`
- `apps/web/client/stores/thingsStore.ts`
- `docs/plans/standup-automation.plan.md`
- `docs/playbooks/standup-automation.md`
- `infra/terraform/bootstrap`
- `infra/terraform/dns-zone`
- `infra/terraform/modules/gha-deploy-role`
- `scripts/acm-wait.mjs`
- `scripts/deploy-check.mjs`
- `scripts/harvest.mjs`
- `scripts/infisical-app.mjs`
- `scripts/run-post-refresh-prompts.mjs`
- `scripts/ssm-env.mjs`
- `scripts/standup-migrations.mjs`
- `scripts/standup.mjs`
- `scripts/supabase-origins.mjs`
- `scripts/terraform-backend.mjs`
- `scripts/terraform-remote-state.mjs`
- `seed.json`
- `test/api/repositories`
- `test/api/support/fakes`
- `test/api/things.test.ts`
- `test/scripts`


## § AGENT — Feature proposals (Track 1)

_Agent: fill after reading SCRIPT sections. Per candidate: universal?, files, wiring, bake-in vs optional, conflicts._

---

## § AGENT — Foundation audit (Track 2)

_Agent: use foundation sub-skill. Per hunk: `F-###`, What, Why, UNIVERSAL|PROTOTYPE|UNSURE, INCLUDE|SKIP|DEFER recommendation._


## § REVIEWER — Decisions

| Item | Type | Verdict (APPROVE / SKIP / DEFER) | Notes |
|------|------|-----------------------------------|-------|
| _example: email-allowlist_ | feature | | |
| _example: F-001_ | foundation | | |

