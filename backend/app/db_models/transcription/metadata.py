from sqlalchemy import Column, Integer, String, Identity, Text,DateTime
from app.db_models.base import Base, Schema

class MicrophoneColorsT(Base):
    __tablename__ = 'microphone_colors_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    color = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)

    created = Column(DateTime, nullable=False)
    created_by = Column(Integer, nullable=False)
    modified = Column(DateTime, nullable=False)
    modified_by = Column(Integer, nullable=False)
    active = Column(Integer, nullable=False, default=1)

class LessonSubjectsT(Base):
    __tablename__ = 'lesson_subjects_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    created = Column(DateTime, nullable=False)
    created_by = Column(Integer, nullable=False)
    modified = Column(DateTime, nullable=False)
    modified_by = Column(Integer, nullable=False)
    active = Column(Integer, nullable=False, default=1)

class ParticipantsT(Base):
    __tablename__ = 'participants_t'
    __table_args__ = {'schema': Schema}
    id = Column(Integer, primary_key=True, nullable=False, server_default=Identity(start=1, increment=1))

    name = Column(String(200), nullable=True)
    role = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    join_date = Column(DateTime, nullable=True)
    withdrawal_date = Column(DateTime, nullable=True)
    Status = Column(String(50), nullable=True)
    Number_of_Audio_Files = Column(Integer, nullable=True)
    Number_of_Videos = Column(Integer, nullable=True)

    created = Column(DateTime, nullable=False)
    created_by = Column(Integer, nullable=False)
    modified = Column(DateTime, nullable=False)
    modified_by = Column(Integer, nullable=False)
    active = Column(Integer, nullable=False, default=1)