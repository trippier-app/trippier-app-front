ENGINE   ?= docker
COMPOSE  := $(ENGINE) compose

COMPOSE_HOT := $(COMPOSE) --project-directory $(CURDIR) -f devops/docker-compose.yml -f devops/docker-compose.dev.yml
COMPOSE_ALL := $(COMPOSE_HOT) -f devops/docker-compose.traefik.yml

REGISTRY ?= ghcr.io
OWNER    ?= trippier-app
TAG      ?= latest

FRONT_IMAGE = $(REGISTRY)/$(OWNER)/app-front:$(TAG)

UID_GID  := $(shell id -u):$(shell id -g)
DRUN_BUN := $(ENGINE) run --rm -u $(UID_GID) -v $(CURDIR):/app:z -w /app oven/bun:1-alpine

SERVICE ?=

ifndef NO_COLOR
GRN  := \033[1;32m
CYAN := \033[1;36m
BOLD := \033[1m
DIM  := \033[2m
RST  := \033[0m
endif

step = @printf "$(GRN)▶$(RST) %s\n"

.PHONY: help setup doctor \
	local dev dev-stop logs up down \
	build push \
	lint fix-lint types check clean

.DEFAULT_GOAL := help

#################################### Setup #####################################

setup:
	@if [ -f .env ]; then echo ".env already exists, nothing to do."; else \
		cp .env.example .env; \
		echo "Created .env. Fill in MAPTILER_API_KEY / MAPTILER_MAP_ID and check API_URL."; \
	fi

doctor:
	@printf "$(BOLD)app-front doctor$(RST)\n"
	@command -v $(ENGINE) >/dev/null 2>&1 \
		&& printf "  [ok] $(ENGINE): %s\n" "$$($(ENGINE) --version | head -1)" \
		|| printf "  [!!] $(ENGINE) not found\n"
	@$(COMPOSE) version >/dev/null 2>&1 \
		&& printf "  [ok] '$(ENGINE) compose' available\n" \
		|| printf "  [!!] '$(ENGINE) compose' not available\n"
	@[ -f .env ] && printf "  [ok] .env present\n" || printf "  [!!] .env missing, run 'make setup'\n"
	@$(COMPOSE_ALL) config -q >/dev/null 2>&1 \
		&& printf "  [ok] compose files are valid\n" \
		|| printf "  [!!] compose files have errors\n"

################################## Development #################################

local:
	$(step) "Starting the web app with bun (hot reload, no Docker)…"
	@bun install --frozen-lockfile
	@bun run dev

up:
	$(step) "Starting the web app (hot reload, detached, no Traefik)…"
	@$(COMPOSE_HOT) up -d --build

down:
	$(step) "Stopping the web app…"
	@$(COMPOSE_ALL) down

dev:
	$(step) "Starting dev stack (hot reload + Traefik on app.trippier.localhost)…"
	@$(COMPOSE_ALL) up --build

dev-stop:
	$(step) "Stopping dev stack (removing volumes)…"
	@$(COMPOSE_ALL) down -v

logs:
	$(step) "Following logs$(if $(SERVICE), for $(SERVICE),)…"
	@$(COMPOSE_ALL) logs -f $(SERVICE)

############################ Build & publish image #############################

build:
	$(step) "Building the app-front image ($(FRONT_IMAGE))…"
	@$(ENGINE) build -t $(FRONT_IMAGE) .

push: build
	$(step) "Pushing the app-front image…"
	@$(ENGINE) push $(FRONT_IMAGE)

################# Quality (in a container, no local toolchain) #################

lint:
	$(step) "Linting the web app (eslint)…"
	@$(DRUN_BUN) sh -c "bun install --frozen-lockfile && bun run lint"

fix-lint:
	$(step) "Linting the web app and fixing what can be fixed…"
	@$(DRUN_BUN) sh -c "bun install --frozen-lockfile && bun run lint -- --fix"

types:
	$(step) "Type-checking the web app (next typegen + tsc)…"
	@$(DRUN_BUN) sh -c "bun install --frozen-lockfile && bun run types:check"

check: lint types

##################################### Misc #####################################

clean:
	$(step) "Tearing down the stack (with volumes)…"
	@-$(COMPOSE_ALL) down -v --remove-orphans

help:
	@printf "$(BOLD)Usage:$(RST) make $(CYAN)<target>$(RST)  [ENGINE=podman] [OWNER=… TAG=…]\n"
	@printf "\n$(BOLD)Development$(RST)\n"
	@printf "  $(CYAN)setup$(RST)\t\t Create .env from .env.example\n"
	@printf "  $(CYAN)doctor$(RST)\t Check the machine is ready to run the stack\n"
	@printf "  $(CYAN)local$(RST)\t\t Run with bun directly, no Docker (Ctrl-C to stop)\n"
	@printf "  $(CYAN)up$(RST) / $(CYAN)down$(RST)\t Hot reload in Docker on the published port (detached, no Traefik)\n"
	@printf "  $(CYAN)dev$(RST)\t\t Hot reload + Traefik on app.trippier.localhost (Ctrl-C to stop)\n"
	@printf "  $(CYAN)dev-stop$(RST)\t Stop the dev stack (removes volumes)\n"
	@printf "  $(CYAN)logs$(RST)\t\t Follow logs (make logs SERVICE=front)\n"
	@printf "\n$(BOLD)Image$(RST)\n"
	@printf "  $(CYAN)build$(RST) / $(CYAN)push$(RST)\t Build / publish the app-front image\n"
	@printf "\n$(BOLD)Quality$(RST)\n"
	@printf "  $(CYAN)lint$(RST)\t\t Lint the web app (eslint), optionally auto-fixing\n"
	@printf "  $(CYAN)fix-lint$(RST)\t auto-fix the web app lint\n"
	@printf "  $(CYAN)types$(RST)\t\t Type-check (next typegen + tsc)\n"
	@printf "  $(CYAN)check$(RST)\t\t lint + types\n"
	@printf "  $(CYAN)clean$(RST)\t\t Tear down the stack with volumes\n"
	@printf "\n$(DIM)Container listens on :3000; the host port is FRONT_PORT (default 3000).$(RST)\n"
	@printf "$(DIM)The API lives in trippier-app-back — point API_URL at it.$(RST)\n"
	@printf "$(DIM)Swap the engine with ENGINE=podman. Override the image with OWNER= TAG=.$(RST)\n"
