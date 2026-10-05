# Lattice catalog

Opt-in harvest packs. **`npm run scaffold` does not copy this folder.** Apply a bundle by copying `files/` into a spawn (or the template kernel) only when you intend to use it.

| Bundle | Destination | Contents |
|--------|-------------|----------|
| [`media-widgets`](media-widgets/) | catalog | ImageDropzone, ImageList, SegmentedToggle, `lib/media` |
| [`account-profile`](account-profile/) | catalog | Users API + editable profile + AvatarEditor (not kernel `/profile`) |
| [`ui-chrome`](ui-chrome/) | catalog | AppShell, markdown, extra shadcn, UserAvatar |

Each bundle has a `README.md` and `files/` mirroring repo-relative paths.
