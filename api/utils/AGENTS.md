# `api/utils/` — Cross-cutting utilities

## Purpose

**`ResponseHandler`** — maps `Result` to JSON error shape. **`HttpErrorMapper`** — maps `ResultError.code` to HTTP status. **`Logger`** — simple logging wrapper.

## When changing errors

Update **`ErrorCatalog`**, **`HttpErrorMapper`**, and any Swagger **Error** schema examples together when introducing new codes.
