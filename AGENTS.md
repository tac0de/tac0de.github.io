# AGENTS.md

## Scope

This repo is a static Astro web project for serialized long-form fiction.

## Runtime

- Follow the global DTP runtime as fallback.
- Treat this file as the local project instruction source.
- Keep source-of-truth changes inside the repo.

## TOKEN_SCOPED

- Keep changes narrowly scoped to the active request.
- Prefer direct implementation over broad planning.
- Avoid recreating large docs or frameworks unless requested.
- Verify with the smallest useful command first, usually `npm run build` or `npm run verify`.
- In final chat outputs, include a concise "다음 추천 3가지" section.

## Constraints

- No backend.
- No login.
- No database.
- No AI API.
- Keep deployment static-site friendly.
