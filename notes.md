User Interface
Routing
Data Fetching
Routing
Performance and Scalability
Integrations and Infrastructure


Javascript Library

## how to create a basic template
    npm create next-app


# overall format

each folder is a route



# setting up infrastructure

## one-time setup — create shared network
    podman network create transcription-shared

## step 1 — start infra (postgres, pgadmin, azurite)
    podman compose -f docker-compose.infra.yml up -d

## step 2 — start apps (backend + frontend)
    podman compose -f docker-compose.apps.yml up -d

## rebuild apps only (no infra restart)
    podman compose -f docker-compose.apps.yml up --build -d

## tear down apps only
    podman compose -f docker-compose.apps.yml down

## tear down everything (infra + apps)
    podman compose -f docker-compose.apps.yml down
    podman compose -f docker-compose.infra.yml down -v