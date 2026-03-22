# Lattice

**Lattice** is a **web app template** — a monorepo starter where pieces connect cleanly: a **domain-driven design** Express API (**`@lattice/api`**), **Turborepo**, and room to grow (Next.js app, Terraform, shared packages). The name suggests a **lattice**: a structured grid linking API, UI, and infrastructure.

Today the repo centers on the Node.js / Express API: domain, application, infrastructure, and HTTP layers with manual dependency injection, a `Result` / error-catalog pattern, and Jest tests.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

The repo uses **npm workspaces** (`api/` is `@lattice/api`). Install from the repository root:

```bash
npm install
```

(`npm run install:all` is kept as an alias for the same command.)

### Environment Variables

Create a `.env` file in the `api/` directory (see `api/.env.example` if present):

```env
PORT=3000
```

### Running the Application

```bash
npm run dev
```

Or build and run production:

```bash
npm run build
npm start
```

The API defaults to `http://localhost:3000`. Swagger UI: `http://localhost:3000/api-docs`.

### Running Tests

```bash
npm test
npm run test:watch
npm run test:coverage
```

## Architecture

- **Domain**: Entities, value objects, domain services, repository interfaces, `Result` / `ErrorCatalog`
- **Application**: Use cases and DTOs
- **Infrastructure**: Repository implementations, composition root (`Container`), optional seed/bootstrap
- **Presentation**: Express routes and controllers

Each major directory includes an `AGENTS.md` file describing purpose and conventions for contributors and automation.

## Error responses

Application use cases return structured errors mapped to HTTP status codes via `HttpErrorMapper`. Successful responses use JSON bodies; failures use:

```json
{
  "error": {
    "status": 400,
    "code": "EXAMPLE_CODE",
    "message": "Human-readable message",
    "metadata": {}
  }
}
```

## Development

```bash
npm run type-check
npm run build
```

## Notes

- The template ships with in-memory repositories suitable for local development and tests; replace with real persistence adapters when you wire a database.

## New remote (fresh Git history)

If you created a new empty GitHub repository named `lattice-app-template`, point this clone at it and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/lattice-app-template.git
git branch -M main
git push -u origin main
```

Use HTTPS instead of SSH if you prefer. Update `package.json` → `repository.url` to match your fork.
