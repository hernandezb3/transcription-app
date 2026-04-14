"""
Parse a plain-text transcript file with the format:

    speaker timestamp
    text
    ...
    speaker timestamp
    text

Each block consists of a header line ("speaker timestamp") followed by
one or more lines of text.  Blocks are separated by one or more blank
lines.

Returns a list of segment dicts compatible with the rest of the
transcript-process pipeline (keys: speaker, start, end, text).
"""

from __future__ import annotations

import re
from typing import Any


# Matches timestamps like 00:01:23, 00:01:23.456, 1:23, 1:23.456, 01:23
_TS_PATTERN = re.compile(
    r"(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)"
)


def _parse_timestamp_to_seconds(ts: str) -> float:
    """Convert a timestamp string (HH:MM:SS.mmm, MM:SS, etc.) to seconds."""
    parts = ts.split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    if len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(ts)


def format_timestamp(seconds: float) -> str:
    """Convert seconds to HH:MM:SS.mmm display string."""
    total_milliseconds = int(round(seconds * 1000))
    hours, remainder = divmod(total_milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, milliseconds = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02}.{milliseconds:03}"


def _parse_header_line(line: str) -> tuple[str, float] | None:
    """
    Try to parse a line as "speaker timestamp".
    Returns (speaker, seconds) or None if the line doesn't match.
    """
    match = _TS_PATTERN.search(line)
    if not match:
        return None

    ts_str = match.group(1)
    seconds = _parse_timestamp_to_seconds(ts_str)

    # Everything before the timestamp is the speaker label
    speaker = line[: match.start()].strip()
    if not speaker:
        return None

    return speaker, seconds


def parse_transcript_file(content: str) -> dict[str, Any]:
    """
    Parse transcript text content and return a dict with:
      - combined_diarized_segments: list of {speaker, start, end, text}

    The ``end`` of each segment is set to the ``start`` of the next segment.
    For the last segment, ``end`` equals ``start`` (the caller / player can
    handle this gracefully).
    """
    lines = content.splitlines()

    raw_segments: list[dict[str, Any]] = []
    current_speaker: str | None = None
    current_start: float | None = None
    current_text_lines: list[str] = []

    def _flush():
        if current_speaker is not None and current_start is not None:
            text = " ".join(t.strip() for t in current_text_lines if t.strip())
            if text:
                raw_segments.append({
                    "speaker": current_speaker,
                    "start": current_start,
                    "text": text,
                })

    for line in lines:
        stripped = line.strip()

        # Skip blank lines (but flush any current block first)
        if not stripped:
            continue

        header = _parse_header_line(stripped)
        if header:
            # Flush the previous block
            _flush()
            current_speaker, current_start = header
            current_text_lines = []
        else:
            # Accumulate text for the current block
            current_text_lines.append(stripped)

    # Flush the last block
    _flush()

    # Assign end timestamps: each segment ends when the next begins
    for i in range(len(raw_segments) - 1):
        raw_segments[i]["end"] = raw_segments[i + 1]["start"]
    if raw_segments:
        raw_segments[-1]["end"] = raw_segments[-1]["start"]

    return {
        "combined_diarized_segments": raw_segments,
    }
