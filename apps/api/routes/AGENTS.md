# `apps/api/routes/` — Express routers

## Purpose

Wire paths to controller methods. Import Swagger **decorator side-effect** files so JSDoc is picked up by `swagger-jsdoc`.

## Pattern

- Export `create*Router(container: Container): Router`.
- Register routers in `app.ts` under stable URL prefixes.
