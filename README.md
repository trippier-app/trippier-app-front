# trippier-app-front

The Trippier web app: **Next.js 16 + React 19 + Tailwind**, with MapLibre /
MapTiler for the maps. Talks to the API in
[trippier-app-back](https://github.com/trippier-app/trippier-app-back).

- Container port: `3000` — published locally on `FRONT_PORT` (default `3000`)
- Local Traefik route: `http://app.trippier.localhost`
- Production: `https://app.trippier.dev`

## Quick start

```bash
make setup     # .env from .env.example — fill in the MapTiler keys
make up        # hot reload on http://localhost:3000
```

The API is a separate stack: start `trippier-app-back` first (or point `API_URL`
at wherever your backend runs).

```bash
make dev       # same, plus Traefik on http://app.trippier.localhost
```

Run `make` (or `make help`) for the full list of targets.

## Environment

| Variable                          | Purpose                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| `API_URL`                         | Base URL of the app API (`trippier-app-back`)               |
| `MAPTILER_API_KEY`                | MapTiler key — client-exposed by design                     |
| `MAPTILER_MAP_ID`                 | MapTiler style / map id                                     |
| `FRONT_PORT`                      | Host port for `make up`                                     |
| `FRONT_DOMAIN` / `EDGE_NETWORK`   | Production only — see `devops/docker-compose.prod.yml`      |

`API_URL` and the `MAPTILER_*` keys are inlined into the client bundle at build
time (see `next.config.ts`), so the image is environment-specific: the pipeline
passes them as build args from the repository secrets.

## Quality

```bash
make lint      # eslint (use `make fix-lint` to rewrite what's fixable)
make types     # next typegen + tsc
```

Everything runs in a throwaway container — no local toolchain required.

## Layout

```
app/            Next.js App Router pages, layout and global styles
public/         static assets
devops/         compose layers: base, dev (hot reload), traefik, prod
```

## Deployment

Pushing to `main` builds `ghcr.io/trippier-app/app-front`, ships
`devops/docker-compose.prod.yml` to the VPS and rolls out the SHA-pinned image.
The stack runs no Traefik of its own: it attaches to the shared edge Traefik
owned by the `public-API` stack, which terminates TLS for `FRONT_DOMAIN`.

Required repository secrets: `API_URL`, `MAPTILER_API_KEY`, `MAPTILER_MAP_ID`
(build args), plus `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` and `DEPLOY_ENV`
(the full production `.env`).
