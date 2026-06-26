import os

from otterai import OtterAI
from pydub import AudioSegment

username = os.environ.get("OTTER_USERNAME")
password = os.environ.get("OTTER_PASSWORD")

otter = OtterAI()

otter.login(username, password)

# Try the MP3 with an explicit example
file = "/Users/brittneyhernandez/Library/CloudStorage/OneDrive-UniversityofConnecticut/focus/project focus/focus_audio2/focus_meeting/focus_meeting_recorder_test_1.WAV"

audio = AudioSegment.from_wav('yourfile.wav')
audio.export('yourfile.mp3', format='mp3')

result = otter.upload_speech(file, content_type="audio/wav")

print(result)

# Then poll/get speeches until processing finishes
speeches = otter.get_speeches()
print(speeches)
