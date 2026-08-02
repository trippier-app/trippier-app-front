# Security Policy

## Supported versions

Security fixes land on `main` and the most recent tagged release.

## Reporting a vulnerability

Do not open a public issue for security problems. Report privately via GitHub
Security Advisories:

https://github.com/trippier-app/trippier-app-front/security/advisories/new

Or email the maintainer at ulyssemercadal@kakao.com.

Please include:

- a description of the issue and its impact,
- steps to reproduce (a proof of concept if you have one).

We aim to acknowledge reports within 72 hours and to ship a fix or mitigation
for confirmed issues as fast as is practical.

## Scope

In scope: XSS and injection in the rendered pages, token storage and handling in
the browser, leaking of server-side secrets into the client bundle, and unsafe
handling of API responses.

Out of scope: the intentionally client-exposed `MAPTILER_*` values baked into the
bundle, and issues requiring an already-compromised host or physical access.
