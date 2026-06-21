# Vedic Panchanga developer Makefile.
#
# One command per common operation. Targets named after intent, not tools,
# so `make check` keeps working if we swap ruff for pyright or oxlint for
# eslint in the future.
#
# Mirrors .github/workflows/ci.yml exactly so `make ci` locally is a
# faithful preview of what the pull-request gates will run.

# ---- Configuration --------------------------------------------------------

PY      := backend/venv/bin/python
PIP     := backend/venv/bin/pip
PYTEST  := backend/venv/bin/pytest
RUFF    := backend/venv/bin/ruff
UVICORN := backend/venv/bin/uvicorn

NPM := npm --prefix frontend

# ---- Discoverability ------------------------------------------------------

.PHONY: help
help:  ## Show this help (default target).
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make \033[36m<target>\033[0m\n\nTargets:\n"} \
		/^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

.DEFAULT_GOAL := help

# ---- One-time setup -------------------------------------------------------

.PHONY: install
install: install-backend install-frontend install-hooks  ## First-time setup: venv, npm deps, git hooks.

.PHONY: install-backend
install-backend:  ## Create backend venv and install Python deps.
	test -d backend/venv || python3 -m venv backend/venv
	$(PIP) install -r backend/requirements.txt

.PHONY: install-frontend
install-frontend:  ## Install frontend npm deps.
	$(NPM) ci

.PHONY: install-hooks
install-hooks:  ## Install pre-commit hooks so format issues never reach CI.
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit install; \
	else \
		echo "pre-commit not on PATH. Install with: pipx install pre-commit"; \
		echo "or: pip install --user pre-commit"; \
	fi

# ---- Development servers --------------------------------------------------

.PHONY: backend
backend:  ## Run the FastAPI dev server on 127.0.0.1:8001.
	cd backend && venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --reload

.PHONY: frontend
frontend:  ## Run the Vite dev server on :3121.
	$(NPM) run dev

.PHONY: dev
dev:  ## Run backend and frontend together (foreground; Ctrl-C stops both).
	@$(MAKE) -j2 backend frontend

# ---- Tests ----------------------------------------------------------------

.PHONY: test
test: test-backend  ## Run all tests (currently backend only; no FE test runner yet).

.PHONY: test-backend
test-backend:  ## Run pytest with default options.
	cd backend && venv/bin/pytest tests/ -v

# ---- Format / lint --------------------------------------------------------

.PHONY: format
format: format-backend format-frontend  ## Auto-fix all formatting in both languages.

.PHONY: format-backend
format-backend:  ## Write ruff formatting to all backend Python files.
	$(RUFF) format backend

.PHONY: format-frontend
format-frontend:  ## Write oxfmt formatting to all frontend sources.
	$(NPM) run format

.PHONY: check
check: check-backend check-frontend  ## Run all CI gates locally (lint + format-check + typecheck).

.PHONY: check-backend
check-backend:  ## Mirror CI's backend job: ruff lint + ruff format --check.
	$(RUFF) check backend
	$(RUFF) format --check backend

.PHONY: check-frontend
check-frontend:  ## Mirror CI's frontend job: tsc + oxlint + oxfmt --check + i18n parity/native-script.
	cd frontend && npx tsc --noEmit
	$(NPM) run lint
	$(NPM) run format:check
	$(NPM) run i18n:check

# ---- Convenience composites ----------------------------------------------

.PHONY: pre-commit
pre-commit: format check  ## Format then verify. Run before every commit.

.PHONY: ci
ci: check test  ## Full local CI preview: every gate + tests.

# ---- Hygiene --------------------------------------------------------------

.PHONY: clean
clean:  ## Remove build artefacts and caches (keeps venv and node_modules).
	rm -rf frontend/dist
	find backend -type d -name __pycache__ -prune -exec rm -rf {} +
	find backend -type d -name .pytest_cache -prune -exec rm -rf {} +
	rm -rf backend/.ruff_cache .ruff_cache
