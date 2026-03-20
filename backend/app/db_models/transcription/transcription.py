from sqlalchemy import Column, Integer, String, Identity, Text
from app.db_models.base import Base, Schema

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
