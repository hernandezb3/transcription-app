import { describe, it, expect } from "vitest";

import {
  timestampToSeconds,
  formatTimestamp,
  normalizeTimestamp,
  formatSecondsToTime,
  countOccurrences,
  getSpeakerInitials,
} from "./helpers";

describe("timestampToSeconds", () => {
  it("parses HH:MM:SS", () => expect(timestampToSeconds("01:02:03")).toBe(3723));
  it("parses MM:SS", () => expect(timestampToSeconds("02:03")).toBe(123));
  it("parses bare seconds", () => expect(timestampToSeconds("83")).toBe(83));
  it("returns 0 for null", () => expect(timestampToSeconds(null)).toBe(0));
});

describe("normalizeTimestamp", () => {
  it("carries overflow on bare seconds", () => expect(normalizeTimestamp("90")).toBe("00:01:30"));
  it("pads MM:SS to HH:MM:SS", () => expect(normalizeTimestamp("1:30")).toBe("00:01:30"));
  it("keeps milliseconds", () => expect(normalizeTimestamp("00:00:15.5")).toBe("00:00:15.500"));
  it("returns empty string for blank input", () => expect(normalizeTimestamp("  ")).toBe(""));
  it("passes through unparseable input unchanged", () => expect(normalizeTimestamp("abc")).toBe("abc"));
});

describe("formatTimestamp", () => {
  it("defaults null to 00:00", () => expect(formatTimestamp(null)).toBe("00:00"));
  it("returns the raw value otherwise", () => expect(formatTimestamp("00:01:02")).toBe("00:01:02"));
});

describe("formatSecondsToTime", () => {
  it("formats durations under an hour", () => expect(formatSecondsToTime(83)).toBe("1:23"));
  it("formats durations over an hour", () => expect(formatSecondsToTime(3723)).toBe("1:02:03"));
});

describe("countOccurrences", () => {
  it("counts case-insensitively", () => expect(countOccurrences("The the THE", "the")).toBe(3));
  it("returns 0 when the needle is absent", () => expect(countOccurrences("abc", "z")).toBe(0));
});

describe("getSpeakerInitials", () => {
  it("returns ? for null", () => expect(getSpeakerInitials(null)).toBe("?"));
  it("uses the first letter of the first two words", () => expect(getSpeakerInitials("Student A")).toBe("SA"));
  it("handles a single-word name", () => expect(getSpeakerInitials("Teacher")).toBe("T"));
});
