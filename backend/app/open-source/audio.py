from pathlib import Path
import nemo.collections.asr as nemo_asr
import torch
from omegaconf import OmegaConf
from nemo.collections.asr.models import ClusteringDiarizer
from nemo.collections.asr.models.configs.diarizer_config import NeuralDiarizerInferenceConfig

audio_file = (Path.cwd() / "app" / "open-source" / "3_dudes.mp3").resolve()
diarization_dir = (Path.cwd() / "tmp" / "diarization").resolve()


def parse_rttm(rttm_file: Path) -> list[dict]:
    speakers = []

    for line in rttm_file.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue

        parts = line.split()
        if len(parts) < 8 or parts[0] != "SPEAKER":
            continue

        start = float(parts[3])
        duration = float(parts[4])
        speakers.append(
            {
                "speaker": parts[7],
                "start": start,
                "end": start + duration,
            }
        )

    return speakers


def get_overlap(start_a: float, end_a: float, start_b: float, end_b: float) -> float:
    return max(0.0, min(end_a, end_b) - max(start_a, start_b))


def attach_speakers(segments: list[dict], speakers: list[dict]) -> list[dict]:
    diarized_segments = []

    for segment in segments:
        best_speaker = "UNKNOWN"
        best_overlap = 0.0

        for speaker_turn in speakers:
            overlap = get_overlap(
                segment["start"],
                segment["end"],
                speaker_turn["start"],
                speaker_turn["end"],
            )
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = speaker_turn["speaker"]

        diarized_segments.append({**segment, "speaker": best_speaker})

    return diarized_segments


def combine_consecutive_speakers(segments: list[dict]) -> list[dict]:
    if not segments:
        return []

    combined_segments = [segments[0].copy()]

    for segment in segments[1:]:
        previous = combined_segments[-1]

        if previous["speaker"] == segment["speaker"]:
            previous["text"] = f'{previous["text"]} {segment["text"]}'
            previous["end"] = segment["end"]
        else:
            combined_segments.append(segment.copy())

    return combined_segments


def build_diarizer(audio_path: Path, out_dir: Path) -> ClusteringDiarizer:
    cfg = OmegaConf.structured(NeuralDiarizerInferenceConfig())
    cfg.device = "cuda" if torch.cuda.is_available() else "cpu"
    cfg.verbose = False
    cfg.num_workers = 0
    cfg.batch_size = 1
    cfg.diarizer.manifest_filepath = None
    cfg.diarizer.out_dir = str(out_dir)
    cfg.diarizer.oracle_vad = False
    cfg.diarizer.vad.model_path = "vad_multilingual_marblenet"
    cfg.diarizer.speaker_embeddings.model_path = "titanet_large"
    cfg.diarizer.clustering.parameters.max_num_speakers = 20

    return ClusteringDiarizer(cfg=cfg)


def build_transcript(audio_path: Path) -> dict:
    model = nemo_asr.models.ASRModel.from_pretrained("nvidia/parakeet-tdt-0.6b-v3")
    hyp = model.transcribe(
        [str(audio_path)],
        batch_size=1,
        return_hypotheses=True,
        timestamps=True,
    )[0]

    data = hyp.timestamp if hasattr(hyp, "timestamp") else hyp.timestep

    return {
        "text": hyp.text,
        "segments": [
            {
                "text": seg["segment"],
                "start": seg["start"],
                "end": seg["end"],
            }
            for seg in data["segment"]
        ],
        "words": [
            {
                "text": word["word"],
                "start": word["start"],
                "end": word["end"],
            }
            for word in data["word"]
        ],
    }


def add_speakers(parsed: dict, audio_path: Path, out_dir: Path) -> dict:
    diarizer = build_diarizer(audio_path, out_dir)
    diarizer.diarize(paths2audio_files=[str(audio_path)])

    rttm_file = out_dir / "pred_rttms" / f"{audio_path.stem}.rttm"
    speaker_turns = parse_rttm(rttm_file)
    parsed["speaker_turns"] = speaker_turns
    parsed["diarized_segments"] = attach_speakers(parsed["segments"], speaker_turns)
    parsed["combined_diarized_segments"] = combine_consecutive_speakers(parsed["diarized_segments"])
    return parsed

parsed = build_transcript(audio_file)
parsed = add_speakers(parsed, audio_file, diarization_dir)

print("SPEAKER TURNS:")
for turn in parsed["speaker_turns"]:
    print(f"{turn['speaker']} [{turn['start']:.2f}s - {turn['end']:.2f}s]")

print("\nDIARIZED TRANSCRIPT:")
for segment in parsed["combined_diarized_segments"]:
    print(
        f"{segment['speaker']}: {segment['text']} "
        f"[{segment['start']:.2f}s - {segment['end']:.2f}s]"
    )
