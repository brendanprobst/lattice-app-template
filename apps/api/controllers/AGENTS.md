# `apps/api/controllers/` — HTTP controllers

## Purpose

Translate HTTP requests to use case calls and **`ResponseHandler`** (`handleResult` / `handleError`). Validate required params and body fields; avoid business rules (belongs in domain/use cases).

## Pattern

- Inject `Container`; resolve use cases via container getters.
- Use appropriate status codes for REST (e.g. 201 create, 204 delete) when `ResponseHandler` defaults are not enough.
