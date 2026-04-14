# initialize app imports

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

#importing routers
from app.api_routers.home import router as home_router
from app.api_routers.auth import router as auth_router
from app.api_routers.user import router as user_router
from app.api_routers.transcriptions.route import router as transcription_router
from app.api_routers.transcript_details.route import router as transcript_details_router
from app.api_routers.microphone_colors.route import router as microphone_colors_router
from app.api_routers.participants.route import router as participants_router
from app.api_routers.transcripts.route import router as transcripts_router
from app.api_routers.transcript_files.route import router as transcript_files_router
from app.api_routers.lesson_subjects.route import router as lesson_subjects_router
from app.api_routers.transcript_speakers.route import router as transcript_speakers_router
from app.api_routers.transcript_overview.route import router as transcript_overview_router
from app.api_routers.transcript_todos.route import router as transcript_todos_router
from app.api_routers.transcript_threads.route import router as transcript_threads_router
# notifications
from app.api_routers.notifications.route import router as notification_router
# security routers
from app.api_routers.security.group import router as group_router
from app.api_routers.security.role import router as role_router
from app.api_routers.security.permission import router as permission_router
from app.api_routers.security.user_group import router as user_group_router
from app.api_routers.security.user_role import router as user_role_router
from app.api_routers.security.group_role import router as group_role_router
from app.api_routers.security.role_permission import router as role_permission_router

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
app.include_router(auth_router, tags=["Authentication"])
app.include_router(user_router, tags=["User Management"])
app.include_router(transcription_router, tags=["Transcription Management"])
app.include_router(transcript_details_router, tags=["Transcript Details"])
app.include_router(microphone_colors_router, tags=["Microphone Colors"])
app.include_router(participants_router, tags=["Participants"])
app.include_router(transcripts_router, tags=["Transcript Management - CRUD"])
app.include_router(transcript_files_router, tags=["Transcript Files"])
app.include_router(lesson_subjects_router, tags=["Lesson Subjects"])
app.include_router(transcript_speakers_router, tags=["Transcript Speakers"])
app.include_router(transcript_overview_router, tags=["Transcript Overview"])
app.include_router(transcript_todos_router, tags=["Transcript Todos"])
app.include_router(transcript_threads_router, tags=["Transcript Threads"])
# notifications
app.include_router(notification_router, tags=["Notifications"])
# security routes
app.include_router(group_router, tags=["Group Management"])
app.include_router(role_router, tags=["Role Management"])
app.include_router(permission_router, tags=["Permission Management"])
app.include_router(user_group_router, tags=["User Group Assignments"])
app.include_router(user_role_router, tags=["User Role Assignments"])
app.include_router(group_role_router, tags=["Group Role Assignments"])
app.include_router(role_permission_router, tags=["Role Permission Assignments"])
