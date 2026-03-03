# transcription-app

# Set up the backend
## Add required packages to the requirements
Add virtual environment in backend/app
- Python version 13.3.3
Match the Python version to what the Docker image (how it'll eventually be deployed) is.


# Set up the frontend
## Install nodeJS
https://nodejs.org/en
* ensure this installation meets the requirements (https://nextjs.org/docs/pages/getting-started/installation)

nodeJS is an asynchronous event-driven JavaScript runtime environment. Used to create servers, web apps, command line tools, and scripts
how you run JavaScript applications

nextJS is 

npm is the package manager for the application


## Set up the CLI environment
Add CLI environment to frontend/
npm install

Start the front end:
npm run dev



 # create the infrastructure

Install Podman Deskop. 

Podman is an open-source containerization application (like Docker).



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
 