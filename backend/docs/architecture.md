# Backend Architecture

A high-level map of the backend folder structure and what each layer is responsible
for. The backend is a **FastAPI** application backed by **PostgreSQL/Azure SQL**
(via SQLAlchemy) and **Azure Blob Storage**, with migrations managed by **Alembic**.

## Request flow at a glance

The app follows a layered architecture. A request flows **inward** through the
layers, and data flows **back out** the same way:

```
Client (UI)
   │  HTTP
   ▼
api_routers/        ← client-facing HTTP routes (request/response contracts)
   │
   ▼
services/           ← business logic / orchestration (optional; only when a
   │                  request spans multiple repositories or infrastructure)
   ▼
repositories/       ← data access; builds SQL queries, the only layer that
   │                  talks to the database
   ├── mappers/         ← convert raw DB rows ↔ clean data models
   ├── db_models/       ← SQLAlchemy ORM table definitions
   └── infrastructure/  ← engine/connection + external services (DB, storage)
            │
            ▼
   PostgreSQL / Azure SQL  ·  Azure Blob Storage
```

The strict rule: **routers never touch the database directly, and repositories
never know about HTTP.** Each layer only talks to the one directly below it.

---

## Folder responsibilities

### `app/api_routers/` — Client-facing HTTP layer
The only layer the UI talks to. Defines all the FastAPI HTTP routes (the public
API surface). Each feature lives in its own subfolder containing:
- **`route.py`** — the FastAPI `APIRouter`: endpoint definitions, status codes,
  `HTTPException` handling. It accepts/returns Pydantic models and delegates all
  real work to a repository or service. It holds **no SQL and no DB knowledge.**
- **`data_model.py`** — the Pydantic request/response schemas scoped to that
  route (e.g. `TranscriptCreate`, `TranscriptUpdate`). These define the API
  contract with the client.

Routers are registered in [`app/main.py`](../app/main.py). The `security/`
subfolder holds the RBAC endpoints (groups, roles, permissions, and their
assignments).

### `app/services/` — Business logic / orchestration
Used only when a single request needs to coordinate **more than one** repository
or piece of infrastructure. For example,
[`transcript_process/service.py`](../app/services/transcript_process/service.py)
handles an audio upload by: parsing the transcript text, uploading the audio to
blob storage, recording file metadata, and writing transcript sections + speakers
— touching several repositories and the storage factory. Simple CRUD features
skip this layer and call a repository directly from the router.

### `app/repositories/` — Data access layer
The layer that **connects directly to the database**. One `controller.py` per
feature builds SQLAlchemy queries against the **db_models**, runs them through the
`DatabaseFactory`, and uses a **mapper** to convert raw rows into clean
dictionaries/models before returning them upward. This is the only layer allowed
to construct and execute queries; it has no knowledge of HTTP. (Soft-deletes via
an `active`/`is_active` flag are the convention here.)

### `app/mappers/` — DB row ↔ model translation
Pure translation helpers, called **by repositories** (never by routers). They
convert raw database row dicts into API-friendly shapes and back — e.g.
normalizing nulls, or serializing a tag list to a CSV column and parsing it back.
`shared.py` holds reusable helpers used across mappers.

### `app/data_models/` — Shared Pydantic models
Pydantic models that are **shared across layers or features**, as opposed to the
route-scoped `data_model.py` files inside `api_routers/`. Includes things like
the read/write `User` models, notification/mention models, and aggregate views
such as `TranscriptOverview`. The `security/` subfolder holds the RBAC models.

### `app/db_models/` — Database table definitions (ORM)
SQLAlchemy ORM classes describing the actual database tables (columns, types,
keys). Every model inherits from the shared `Base` and uses the configured
`Schema`, both defined in
[`db_models/base.py`](../app/db_models/base.py). These classes are what
repositories query against and what Alembic reads to autogenerate migrations.

### `app/infrastructure/` — External system connections
Wraps connections to outside systems behind swappable, singleton **factories**,
so the rest of the app doesn't care which concrete provider is used:
- **`databases/`** — `factory.py` exposes a `DatabaseFactory` that delegates to a
  provider (`sql.py`), which manages the sync/async SQLAlchemy engines, connection
  pooling, and query execution. The provider is chosen from config (e.g. Postgres
  vs. Azure SQL).
- **`storage/`** — `factory.py` exposes a `StorageFactory` over a provider
  (`azure_storage.py`) for blob upload/download, streaming, and SAS URL
  generation.

### `app/auth/` — Authentication primitives
Low-level security helpers: password hashing/verification (bcrypt via passlib)
and JWT creation/decoding. Used by the auth routes in
[`api_routers/auth.py`](../app/api_routers/auth.py).

### `app/config/` — Settings & logging
Application configuration. `app_settings.py` loads environment-specific
`settings.<env>.json` files and overlays secrets from a secret manager into a
typed config object (`data_model.py` defines that schema with Pydantic).
`app_logging.py` sets up the shared logger. Both are singletons consumed
throughout the app.

### `app/standards/` — Internal developer conventions
Documentation of the patterns this codebase expects new code to follow. See
[`crud-api-setup-guide.md`](../app/standards/crud-api-setup-guide.md) for the
step-by-step recipe to add a new CRUD feature across all the layers above.

### `app/open-source/` — Scratch / experimental scripts
Standalone third-party experiments (e.g. Otter.ai upload trials, audio samples).
**Not part of the running application** and not imported by `main.py`.
> ⚠️ Note: `otter.py` contains hard-coded login credentials — these should be
> removed/rotated and never committed.

---

## Supporting files (outside `app/`)

| Path | Purpose |
|------|---------|
| `app/main.py` | Application composition root — builds the FastAPI app, configures CORS, and registers every router. |
| `app/requirements.txt` | Python dependencies. |
| `app/pytest.ini` | Test configuration. |
| `alembic/` | Database migrations. `versions/` holds the ordered migration scripts; `env.py` wires Alembic to the ORM `Base` metadata. |
| `alembic.ini` / `alembic-notes.md` | Alembic config and usage notes. |
| `Dockerfile` | Container build for the backend. |
| `local_deploy*.sh` / `.run` | Local run/deploy helper scripts. |

---

## Adding a new feature (the typical path)

1. **`db_models/`** — define the table(s).
2. **`alembic/versions/`** — generate a migration for the new table.
3. **`mappers/`** — add a mapper to translate rows ↔ models.
4. **`repositories/<feature>/controller.py`** — write the queries.
5. **`api_routers/<feature>/`** — add `data_model.py` (contracts) and `route.py`
   (endpoints).
6. **`services/`** — only if the feature orchestrates multiple repositories.
7. **`app/main.py`** — register the new router.

See [`crud-api-setup-guide.md`](../app/standards/crud-api-setup-guide.md) for the
detailed walkthrough.
