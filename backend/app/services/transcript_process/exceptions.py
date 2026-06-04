"""
Custom exceptions for the transcript-upload pipeline.

Each one carries a **user-facing** ``message`` (safe to show directly in the
UI), a machine-readable ``code``, and which ``file`` ("audio" or "transcript")
caused the problem — so the frontend can show a friendly message and, if it
likes, highlight the offending upload zone.

They all inherit from :class:`TranscriptUploadError`, which the API router
catches and turns into a single structured HTTP response.
"""

from __future__ import annotations


class TranscriptUploadError(Exception):
    """Base class for a recoverable problem while uploading a lesson.

    Attributes
    ----------
    message:
        Human-friendly, user-safe description of what went wrong.
    code:
        Stable machine-readable identifier (used by the frontend / logs).
    file:
        Which uploaded file caused the error: ``"audio"``, ``"transcript"`` or
        ``None`` when it isn't specific to one file.
    status_code:
        HTTP status the API should respond with. Defaults to 422
        (Unprocessable Entity): the request was well-formed but the file
        *contents* couldn't be used.
    detail:
        Optional extra technical context for the logs. Never shown to the user.
    """

    code: str = "transcript_upload_error"
    file: str | None = None
    status_code: int = 422

    def __init__(self, message: str, *, detail: str | None = None):
        super().__init__(message)
        self.message = message
        self.detail = detail

    def to_dict(self) -> dict:
        """Serialise to the structured payload returned in the HTTP body."""
        return {"message": self.message, "code": self.code, "file": self.file}


# --------------------------------------------------------------------------- #
#  Audio file problems                                                         #
# --------------------------------------------------------------------------- #


class AudioFileError(TranscriptUploadError):
    """The audio file is missing, empty, or not a usable audio file."""

    code = "bad_audio_file"
    file = "audio"


class EmptyAudioFileError(AudioFileError):
    code = "empty_audio_file"

    def __init__(self, message: str | None = None, *, detail: str | None = None):
        super().__init__(
            message
            or "The audio file appears to be empty. Please choose a valid .mp3 or .wav recording.",
            detail=detail,
        )


class InvalidAudioFileError(AudioFileError):
    """The file isn't a recognisable MP3/WAV — corrupt, truncated, or wrong type."""

    code = "invalid_audio_file"

    def __init__(self, message: str | None = None, *, detail: str | None = None):
        super().__init__(
            message
            or "This doesn't look like a valid .mp3 or .wav file. It may be corrupted or in an unsupported format.",
            detail=detail,
        )


# --------------------------------------------------------------------------- #
#  Transcript file problems                                                    #
# --------------------------------------------------------------------------- #


class TranscriptFileError(TranscriptUploadError):
    """The transcript text file is missing, unreadable, or badly formatted."""

    code = "bad_transcript_file"
    file = "transcript"


class EmptyTranscriptFileError(TranscriptFileError):
    code = "empty_transcript_file"

    def __init__(self, message: str | None = None, *, detail: str | None = None):
        super().__init__(
            message
            or "The transcript file appears to be empty. Please upload a .txt transcript.",
            detail=detail,
        )


class TranscriptDecodeError(TranscriptFileError):
    """The transcript file isn't valid UTF-8 text (e.g. a binary/odd-encoding file)."""

    code = "transcript_not_text"

    def __init__(self, message: str | None = None, *, detail: str | None = None):
        super().__init__(
            message
            or "The transcript file couldn't be read as text. Please upload a plain-text .txt file (UTF-8).",
            detail=detail,
        )


class TranscriptParseError(TranscriptFileError):
    """The transcript text couldn't be parsed into speaker/timestamp segments."""

    code = "transcript_parse_failed"

    def __init__(self, message: str | None = None, *, detail: str | None = None):
        super().__init__(
            message
            or (
                "We couldn't read the transcript's format. Each block should look like:\n"
                "Speaker 00:00:00\nwhat they said"
            ),
            detail=detail,
        )


class EmptyTranscriptError(TranscriptFileError):
    """Parsed without error but produced zero usable segments."""

    code = "transcript_no_segments"

    def __init__(self, message: str | None = None, *, detail: str | None = None):
        super().__init__(
            message
            or (
                "No transcript lines were found. Make sure each section starts with a "
                'speaker and timestamp, e.g. "Speaker 00:00:00" followed by the text.'
            ),
            detail=detail,
        )
