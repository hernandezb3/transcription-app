"""
Utility for parsing @mentions from user-generated text.

Mention format: @username  (e.g. "@jdoe" or "@jane.doe")
Stores the username between @ and the next whitespace / end-of-string.
"""
import re
from typing import List


# @username where username can contain word chars, dots, hyphens
_MENTION_RE = re.compile(r"@([\w.\-]+)")


def extract_mentions(text: str | None) -> List[str]:
    """Return a de-duplicated list of usernames mentioned in *text*."""
    if not text:
        return []
    return list(dict.fromkeys(_MENTION_RE.findall(text)))  # preserves order


def highlight_mentions(text: str | None) -> str:
    """Wrap @mentions in <strong> tags (for display)."""
    if not text:
        return ""
    return _MENTION_RE.sub(r"<strong>@\1</strong>", text)
