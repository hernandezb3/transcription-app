export type TranscriptSection = {
  id: number;
  transcription_id: number;
  section_id: number;
  speaker_id: number | null;
  speaker: string | null;
  begin_timestamp: string | null;
  end_timestamp: string | null;
  original_text: string | null;
  edited_text: string | null;
  tags: string[];
  is_active: number;
};

export type TranscriptSpeaker = {
  id: number;
  transcription_id: number;
  speaker_label: string | null;
  display_name: string | null;
  is_active: number;
};

export type TranscriptComment = {
  id: number;
  transcription_id: number;
  section_id: number | null;
  comment: string | null;
  created_by: number | null;
  created_at: string | null;
  is_active: number;
};

export type ActivityLogEntry = {
  id: number;
  action: string;
  section_id: number | null;
  summary: string | null;
  user_display_name: string | null;
  created_at: string | null;
  section_db_id: number | null;
};

export type EditingState = {
  sectionId: number;
  field: "speaker" | "edited_text";
} | null;

export type RecentEdit = {
  id: number;
  transcription_id: number;
  action: string;
  section_id: number | null;
  summary: string | null;
  user_id: number | null;
  user_display_name: string | null;
  created_at: string | null;
  section_db_id: number | null;
  section_edited_text: string | null;
  section_original_text: string | null;
  section_speaker: string | null;
  section_begin_timestamp: string | null;
  text_preview: string | null;
};
