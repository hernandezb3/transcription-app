# CRUD API Router Setup Guide

## Architecture Overview

```
Request → api_routers/ (route.py + data_model.py)
              ↓
          repositories/ (controller.py — uses mapper + db_models internally)
              │
              ├── mappers/ (data_model ↔ db_model conversion)
              ├── db_models/ (SQLAlchemy ORM — imports Base from db_models/base.py)
              └── infrastructure/databases/ (factory.py → sql.py — engine + session)
```

---

## Layer Definitions

| Layer | Path | Responsibility |
|-------|------|----------------|
| **Router** | `app/api_routers/<feature>/route.py` | HTTP endpoint definitions. Accepts/returns **Data Models** only. No mapper or DB knowledge. |
| **Router Data Model** | `app/api_routers/<feature>/data_model.py` | Pydantic schemas for request/response contracts (scoped to the route). |
| **Data Models** | `app/data_models/<feature>.py` | Generic Pydantic models shared across layers (e.g. `UserCreate`). |
| **Repository** | `app/repositories/<feature>/controller.py` | Builds SQLAlchemy queries against **DB Models**, uses **Mapper** to convert results, calls `DatabaseFactory`. Returns mapped data to the router. |
| **Mapper** | `app/mappers/<feature>_mapper.py` | Converts between DB row dicts ↔ Data Models. Called **by the repository**, never by the router. |
| **DB Models** | `app/db_models/<feature>/<model>.py` | SQLAlchemy ORM table classes. Import `Base` and `Schema` from `db_models/base.py`. |
| **DB Infrastructure** | `app/infrastructure/databases/factory.py` → `sql.py` | Singleton `DatabaseFactory` that wraps sync/async engine creation and query execution. |

---

## File Structure (for a new feature called `widgets`)

```
app/
├── api_routers/
│   └── widgets/
│       ├── data_model.py          # Pydantic request/response schemas
│       └── route.py               # FastAPI router
├── data_models/
│   └── widget.py                  # (optional) shared Pydantic models if used across features
├── db_models/
│   ├── base.py                    # Declarative Base + Schema (already exists)
│   └── widget/
│       └── widget.py              # SQLAlchemy ORM table model
├── mappers/
│   └── widget_mapper.py           # DB row ↔ data model conversion
├── repositories/
│   └── widget/
│       └── controller.py          # DB queries via DatabaseFactory
├── infrastructure/
│   └── databases/
│       ├── factory.py             # Singleton DatabaseFactory (already exists)
│       └── sql.py                 # Engine creation + query execution (already exists)
└── main.py                        # Register the new router here
```

---

## Step-by-Step: Adding a New CRUD Feature

### 1. DB Model (`app/db_models/widget/widget.py`)

Define the SQLAlchemy ORM class mapped to your database table. Always import `Base` and `Schema` from `app.db_models.base`.

```python
from sqlalchemy import Column, Integer, String, DateTime, Identity
from app.db_models.base import Base, Schema


class WidgetsT(Base):
    __tablename__ = 'widgets_t'
    __table_args__ = {'schema': Schema}

    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))
    name = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    status = Column(String(50), nullable=False, default='active')

    created = Column(DateTime, nullable=False)
    created_by = Column(Integer, nullable=False)
    modified = Column(DateTime, nullable=False)
    modified_by = Column(Integer, nullable=False)
    active = Column(Integer, nullable=False, default=1)
```

> **Convention:** Table class names end with `T` (e.g. `WidgetsT`, `TranscriptsT`).  
> **Convention:** `Schema` comes from settings (`TransactionalDatabase.Settings.BaseSchema`).

---

### 2. Router Data Model (`app/api_routers/widgets/data_model.py`)

Pydantic schemas that define the API contract. These are **framework-agnostic** — no SQLAlchemy imports allowed here.

```python
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class Widget(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    active: Optional[int] = 1

    model_config = ConfigDict(from_attributes=True)


class WidgetCreate(BaseModel):
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WidgetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
```

---

### 3. Mapper (`app/mappers/widget_mapper.py`)

Handles any transformation between raw DB row dicts and data model shapes. If no transformation is needed the mapper can be thin, but it should **always exist** as the boundary.

```python
from typing import Any, List

from app.mappers.shared import SharedMapper


class WidgetMapper:

    _shared = SharedMapper()

    @staticmethod
    def to_widget(row: dict) -> dict:
        """Map a DB row dict into an API-friendly widget payload."""
        mapped = dict(row)
        # Add any field transformations here
        return WidgetMapper._shared.normalize_nulls(mapped)

    @staticmethod
    def to_widget_list(rows: List[dict]) -> List[dict]:
        return [WidgetMapper.to_widget(row) for row in rows]
```

> **Important:** Always run `normalize_nulls()` on mapped output. The database driver may return `NaN` or `NaT` for nullable numeric/datetime columns, which Pydantic will reject. `SharedMapper.normalize_nulls()` converts all null-like sentinels (`NaN`, `NaT`, `pd.NaT`, `np.nan`) to proper Python `None`.

---

### 4. Repository (`app/repositories/widget/controller.py`)

All database access lives here. Uses `DatabaseFactory` (singleton) to execute queries against `db_models`.

```python
import sqlalchemy
from datetime import datetime

from app.infrastructure.databases.factory import DatabaseFactory
from app.db_models.widget.widget import WidgetsT
from app.mappers.widget_mapper import WidgetMapper


class WidgetRepository:
    def __init__(self):
        self.database = DatabaseFactory()
        self.mapper = WidgetMapper()

    async def list(self):
        query = sqlalchemy.select(
            WidgetsT.id,
            WidgetsT.name,
            WidgetsT.description,
            WidgetsT.status,
            WidgetsT.created,
            WidgetsT.modified,
            WidgetsT.active,
        ).where(WidgetsT.active == 1)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        return self.mapper.to_widget_list(rows)

    async def get(self, widget_id: int):
        query = sqlalchemy.select(
            WidgetsT.id,
            WidgetsT.name,
            WidgetsT.description,
            WidgetsT.status,
            WidgetsT.created,
            WidgetsT.modified,
            WidgetsT.active,
        ).where(WidgetsT.id == widget_id)
        result = await self.database.aread(query)
        rows = result.get("data", [])
        if not rows:
            return None
        return self.mapper.to_widget(rows[0])

    async def create(self, data: dict, user_id: int):
        now = datetime.utcnow()
        stmt = sqlalchemy.insert(WidgetsT).values(
            name=data["name"],
            description=data.get("description"),
            status="active",
            created=now,
            created_by=user_id,
            modified=now,
            modified_by=user_id,
            active=1,
        )
        result = await self.database.acreate(stmt)
        return result

    async def update(self, widget_id: int, updates: dict):
        stmt = (
            sqlalchemy.update(WidgetsT)
            .where(WidgetsT.id == widget_id)
            .values(**updates)
        )
        result = await self.database.aupdate(stmt)
        return result

    async def delete(self, widget_id: int):
        """Soft delete — sets active = 0."""
        stmt = (
            sqlalchemy.update(WidgetsT)
            .where(WidgetsT.id == widget_id)
            .values(active=0)
        )
        result = await self.database.aupdate(stmt)
        return result
```

> **Convention:** The repository owns all mapper usage — the router never calls mappers directly.  
The FastAPI router — entry point for HTTP requests. It only knows about **data models** and the **repository**. The router **never imports or calls mappers** — that's the repo's job.

```python
from fastapi import APIRouter, HTTPException

from app.api_routers.widgets.data_model import Widget, WidgetCreate, WidgetUpdate
from app.repositories.widget.controller import WidgetRepository

router = APIRouter(prefix="/widgets")

repository = WidgetRepository()


@router.get("/")
async def get_all_widgets():
    data = await repository.list()
    return [Widget(**row).model_dump() for row in data]


@router.get("/{widget_id}")
async def get_widget(widget_id: int):
    data = await repository.get(widget_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Widget not found")
    return Widget(**data).model_dump()


@router.post("/", status_code=201)
async def create_widget(body: WidgetCreate):
    data = body.model_dump()
    # TODO: replace with actual authenticated user id
    result = await repository.create(data, user_id=1)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.put("/{widget_id}")
async def update_widget(widget_id: int, body: WidgetUpdate):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await repository.update(widget_id, updates)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
    return result


@router.delete("/{widget_id}", status_code=204)
async def delete_widget(widget_id: int):
    result = await repository.delete(widget_id)
    status = result.get("status_code", 500)
    if status >= 400:
        raise HTTPException(status_code=status, detail=result.get("message"))
```

---

### 6. Register the Router (`app/main.py`)

Add the new router to the FastAPI app.

```python
from app.api_routers.widgets.route import router as widget_router

# ... existing routers ...

app.include_router(widget_router, tags=["Widget Management"])
```

---

## Request Flow Summary

```
┌────────────┐    Data Model     ┌─────────────────────────────────────────────────────────────────┐
│            │  ──────────────►  │  Repository (controller.py)                                     │
│   Router   │   WidgetCreate    │                                                                 │
│ (route.py) │  ◄──────────────  │   ┌──────────┐    ┌──────────┐    ┌────────────────────────┐    │
│            │   mapped dicts    │   │  Mapper   │ ◄──│ DB Model │ ◄──│  DatabaseFactory        │    │
│            │                   │   │           │    │ (WidgetsT)│    │  (infrastructure)      │    │
└────────────┘                   │   └──────────┘    └──────────┘    └────────────────────────┘    │
                                 └─────────────────────────────────────────────────────────────────┘
```

| Step | Layer | File | What Happens |
|------|-------|------|-------------|
| 1 | **Router** | `api_routers/widgets/route.py` | Receives request, validates via Pydantic data model, calls repo |
| 2 | **Repository** | `repositories/widget/controller.py` | Builds SQLAlchemy query using DB Model, calls `DatabaseFactory` |
| 3 | **Infrastructure** | `infrastructure/databases/factory.py` | Executes query via async engine from `sql.py` |
| 4 | **Repository** | `repositories/widget/controller.py` | Uses mapper to transform DB row dicts into data-model-friendly dicts |
| 5 | **Router** | `api_routers/widgets/route.py` | Wraps mapped result in Pydantic model, returns JSON response |

---

## Existing Infrastructure (Do Not Recreate)

These files already exist and are shared across all features:

- **`app/db_models/base.py`** — `Base` (declarative base) and `Schema` (from settings)
- **`app/infrastructure/databases/factory.py`** — Singleton `DatabaseFactory` wrapping all DB operations
- **`app/infrastructure/databases/sql.py`** — Engine creation, connection string parsing, async/sync support
- **`app/mappers/shared.py`** — `SharedMapper` with null normalization utilities
- **`app/config/app_settings.py`** — `SettingsConfig` singleton loading from `settings.local.json`

---

## Conventions

- **DB Model class names** end with `T` → `WidgetsT`, `TranscriptsT`
- **Repository methods** use simple names → `create`, `update`, `get`, `list`, `delete`
- **Soft deletes** → set `active = 0`, never hard delete
- **Router data models** live alongside routes in `api_routers/<feature>/data_model.py`
- **Shared data models** (used across features) go in `app/data_models/<feature>.py`
- **One repository per feature domain** in `app/repositories/<feature>/controller.py`
- **One mapper per feature** in `app/mappers/<feature>_mapper.py`
- **Use naive UTC datetimes** → `datetime.utcnow()`, **not** `datetime.now(timezone.utc)`. DB columns are `TIMESTAMP WITHOUT TIME ZONE`; mixing offset-aware and offset-naive datetimes causes PostgreSQL/asyncpg errors.
- **Always normalize nulls in mappers** → Call `SharedMapper().normalize_nulls(mapped)` on every mapper output. The DB driver can return `NaN`/`NaT` for nullable columns, which Pydantic rejects. This converts them to Python `None`.
