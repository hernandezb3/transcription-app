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


















front end structure
    /users - front end page - displaying users
        page.tsx
            - display / forward along information
            x retrive data from an external api service (fast api)
        current url
            localhost:3000/users

        url its calling
            localhost:3000/api/users
    
    /api
        /users
            route.ts

        - retrive data from an external api service (fast api)
        
        url: 
            localhost:3000/api/users
        
        url its calling:
            localhost:8000/api/users

backend
    api_router/
        users/
            route.py

        current url
            localhost:8000/api/users
    
    
database
    ??