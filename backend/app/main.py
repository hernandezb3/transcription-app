# initialize app imports

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

#importing routers
from app.api_routers.home import router as home_router
from app.api_routers.user import router as user_router
from app.api_routers.transcriptions.route import router as transcription_router
from app.api_routers.transcript_details.route import router as transcript_details_router
from app.api_routers.microphone_colors.route import router as microphone_colors_router
from app.api_routers.participants.route import router as participants_router
from app.api_routers.transcripts.route import router as transcripts_router
from app.api_routers.transcript_files.route import router as transcript_files_router
from app.api_routers.lesson_subjects.route import router as lesson_subjects_router

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
app.include_router(transcript_details_router, tags=["Transcript Details"])
app.include_router(microphone_colors_router, tags=["Microphone Colors"])
app.include_router(participants_router, tags=["Participants"])
app.include_router(transcripts_router, tags=["Transcript Management - CRUD"])
app.include_router(transcript_files_router, tags=["Transcript Files"])
app.include_router(lesson_subjects_router, tags=["Lesson Subjects"])
