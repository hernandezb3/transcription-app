from sqlalchemy import Column, Integer, String, Identity, Text, DateTime, ForeignKey
from app.db_models.base import Base, Schema


class TranscriptSpeakersT(Base):
    __tablename__ = 'transcript_speakers_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    transcription_id = Column(Integer, nullable=False)
    speaker_label = Column(String(200), nullable=True)
    display_name = Column(String(200), nullable=True)
    is_active = Column(Integer, nullable=False, default=1)


class TranscriptsT(Base):
    __tablename__ = 'transcripts_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    unique_id = Column(String(50), nullable=True)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), nullable=True)

    microphone_color_id = Column(Integer, nullable=True)
    participant_id = Column(Integer, nullable=True)
    lesson_number = Column(String(50), nullable=True)
    lesson_subject = Column(String(200), nullable=True)
    tags = Column(Text, nullable=True)

    created = Column(DateTime, nullable=False)
    created_by = Column(Integer, nullable=False)
    modified = Column(DateTime, nullable=False)
    modified_by = Column(Integer, nullable=False)
    active = Column(Integer, nullable=False, default=1)

class TranscriptCommentsT(Base):
    __tablename__ = 'transcript_comments_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    transcription_id = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)

    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    is_active = Column(Integer, nullable=False, default=1)

class TranscriptDetailsT(Base):
    __tablename__ = 'transcript_details_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    transcription_id = Column(Integer, nullable=True)
    section_id = Column(Integer, nullable=True)
    speaker_id = Column(Integer, ForeignKey(f'{Schema}.transcript_speakers_t.id'), nullable=True)
    speaker = Column(String(200), nullable=True)
    begin_timestamp = Column(String(50), nullable=True)
    end_timestamp = Column(String(50), nullable=True)
    original_text = Column(Text, nullable=True)
    edited_text = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)
    modified_at = Column(DateTime, nullable=True)
    modified_by = Column(Integer, nullable=True)
    is_active = Column(Integer, nullable=False, default=1)


class TranscriptDetailsCommentsT(Base):
    __tablename__ = 'transcript_details_comments_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    transcription_id = Column(Integer, nullable=True)
    section_id = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    is_active = Column(Integer, nullable=False, default=1)

class TranscriptFilesT(Base):
    __tablename__ = 'transcript_files_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    transcription_id = Column(Integer, nullable=True)
    file_name = Column(String(200), nullable=True)
    file_type = Column(String(50), nullable=True)
    file_path = Column(Text, nullable=True)

    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    is_active = Column(Integer, nullable=False, default=1)


class TranscriptActivityLogT(Base):
    __tablename__ = 'transcript_activity_log_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    transcription_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)           # e.g. section_edited, comment_added, speaker_renamed, section_added, section_deleted
    section_id = Column(Integer, nullable=True)            # section_id within the transcript (nullable for transcript-level actions)
    summary = Column(Text, nullable=True)                  # human-readable description
    user_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False)


class TranscriptTodosT(Base):
    __tablename__ = 'transcript_todos_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    transcription_id = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    is_completed = Column(Integer, nullable=False, default=0)   # 0 = open, 1 = done
    sort_order = Column(Integer, nullable=False, default=0)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    is_active = Column(Integer, nullable=False, default=1)


class TranscriptThreadsT(Base):
    __tablename__ = 'transcript_threads_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    transcription_id = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    is_active = Column(Integer, nullable=False, default=1)


class ThreadPostsT(Base):
    __tablename__ = 'thread_posts_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    thread_id = Column(Integer, nullable=False)
    parent_post_id = Column(Integer, nullable=True)
    body = Column(Text, nullable=False)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    edited_at = Column(DateTime, nullable=True)
    is_active = Column(Integer, nullable=False, default=1)