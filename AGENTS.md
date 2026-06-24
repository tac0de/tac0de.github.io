# AGENTS.md

## Scope

This repo is a static Three.js web project.

## Runtime

- Follow the global DTP runtime as fallback.
- Treat this file as the local project instruction source.
- Keep source-of-truth changes inside the repo.
- Do not rely on deleted `docs/` files as product truth.

## TOKEN_SCOPED

- Keep changes narrowly scoped to the active request.
- Prefer direct implementation over broad planning.
- Avoid recreating large docs or frameworks unless requested.
- Verify with the smallest useful command first, usually `npm run build`.

## Constraints

- No backend.
- No login.
- No database.
- No AI API.
- Keep deployment static-site friendly.
