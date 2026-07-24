"""Basic contract tests for the transcript-section API models.

These also guard the speaker / begin_timestamp / end_timestamp fields that the
section-editing feature relies on.
"""

from app.api_routers.transcriptions.data_model import (
    TranscriptDetails,
    TranscriptSectionCreate,
    TranscriptSectionUpdate,
)


def test_section_update_accepts_speaker_and_timestamps():
    m = TranscriptSectionUpdate(
        speaker="Teacher",
        begin_timestamp="00:00:01",
        end_timestamp="00:00:05",
    )
    assert m.speaker == "Teacher"
    assert m.begin_timestamp == "00:00:01"
    assert m.end_timestamp == "00:00:05"


def test_section_update_all_fields_optional():
    m = TranscriptSectionUpdate()
    assert m.speaker is None
    assert m.speaker_id is None
    assert m.edited_text is None
    assert m.tags is None


def test_section_create_defaults():
    m = TranscriptSectionCreate()
    assert m.position is None
    assert m.speaker_id is None
    assert m.tags is None


def test_transcript_details_defaults():
    d = TranscriptDetails()
    assert d.tags == []
    assert d.is_active == 1
