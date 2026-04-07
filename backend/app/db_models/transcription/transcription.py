from sqlalchemy import Column, Integer, String, Identity, Text,DateTime
from app.db_models.base import Base, Schema

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
    speaker = Column(String(200), nullable=True)
    begin_timestamp = Column(String(50), nullable=True)
    end_timestamp = Column(String(50), nullable=True)
    original_text = Column(Text, nullable=True)
    edited_text = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)
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