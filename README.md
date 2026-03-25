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


## Running Locally

### Front-end
change directories into frontend
``` bash
cd frontend
```

installing node packages
``` bash
npm install
```

starting the frontend

``` bash
npm run dev
```

### Backend
open vs code to backend

verify venv is created


press play and debug button


#### update database stuff
to apply data base changes

1. activate venv
2. run
``` bash
alembic head upgrade
```

 # create the infrastructure

Install Podman Desktop. 

Podman is an open-source containerization application (like Docker).


## Running Infrastructure

Use Podman for all container commands.

### one-time setup (do this once)
Create the shared network:
    podman network create transcription-shared

### DEV mode (hot reload)
Use this when you are actively coding. File changes refresh automatically.

First run (or after dependency / Dockerfile changes):
    $env:AppEnvironment="dev"; $env:BackendTarget="dev"; $env:FrontendTarget="dev"; $env:WatchpackPolling="true"; podman compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

Normal dev start (faster, no rebuild):
    $env:AppEnvironment="dev"; $env:BackendTarget="dev"; $env:FrontendTarget="dev"; $env:WatchpackPolling="true"; podman compose -f docker-compose.yml -f docker-compose.dev.yml up -d

Stop dev stack:
    podman compose -f docker-compose.yml -f docker-compose.dev.yml down

### PROD-style mode (no hot reload)
Use this to test behavior close to deployment.

Build and run prod-style images:
    $env:AppEnvironment="live"; $env:BackendTarget="prod"; $env:FrontendTarget="prod"; $env:WatchpackPolling="false"; podman compose -f docker-compose.yml up --build -d

Stop prod-style stack:
    podman compose -f docker-compose.yml down

Remove everything including data volumes:
    podman compose -f docker-compose.yml down -v

### plain-English difference
- DEV mode = easier coding experience + auto refresh.
- PROD-style mode = packaged app behavior, no live code syncing.
 