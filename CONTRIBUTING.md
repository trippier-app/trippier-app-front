# Contributing to trippier-app-front

Thanks for contributing! This repo holds the Trippier web app (Next.js). The API
and the mobile app live in
[trippier-app-back](https://github.com/trippier-app/trippier-app-back) and
[trippier-app-mobile](https://github.com/trippier-app/trippier-app-mobile).

## Getting set up

```bash
make setup     # .env from .env.example — fill in the MapTiler keys
make up        # hot reload on http://localhost:3000
```

Start `trippier-app-back` too, or point `API_URL` at a reachable API.
`make doctor` tells you what is missing if something does not start.

## Coding standards

ESLint (Next core-web-vitals + Prettier) is the source of truth —
`eslint.config.mjs`. Nothing is enforced by hand:

```bash
make lint      # check
make fix-lint  # check and rewrite what can be fixed
make types     # next typegen + tsc
```

## Environment variables

`API_URL` and the `MAPTILER_*` keys are **inlined into the client bundle at build
time** through the `env` block of `next.config.ts`. Anything you put there is
public — never expose a server-side secret that way.

When you add one:

1. add it to `.env.example` with a short comment,
2. map it in `next.config.ts` if the browser needs it,
3. add it to the `build.args` of `devops/docker-compose.yml` and to the
   `build-args` of `.github/workflows/deploy.yml`.

## Workflow

1. Branch off an up-to-date `main`: `git checkout -b feat/my-feature`.
2. Commit with a conventional prefix: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`.
3. Before opening a PR, run `make lint` and `make types`.
4. CI runs lint, type-check and build on every push and pull request.
