# Overview
How to create sql scripts for the database

## Initialize
``` powershell
alembic init alembic
```

## Create a Version
Use to generate python db update scripts

``` powershell
alembic revision --autogenerate --rev-id 00 -m "add_transcript_indexes"
```

## How to create SQL script
``` powershell
alembic upgrade head --sql > alembic\versions\release.sql
```
## How to Auto Apply migration scripts
``` powershell
alembic upgrade head
```