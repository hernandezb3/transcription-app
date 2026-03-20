# initialize app imports

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

#importing routers
from app.api_routers.home import router as home_router
from app.api_routers.user import router as user_router
from app.api_routers.transcriptions.route import router as transcription_router

# settings and logging
from app.config.app_settings import SettingsConfig
from app.config.app_logging import AppLogging

logger = AppLogging().logger
settings = SettingsConfig().settings

#Define the servers
servers = [
    {"url": "/", "description": "Local server"}
]

app = FastAPI(title='transcription-services', servers=servers)
cors  = settings.RuntimeSettings.CORS

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# including routes
app.include_router(home_router, tags=["Home"])
app.include_router(user_router, tags=["User Management"])
app.include_router(transcription_router, tags=["Transcription Management"])
