from otterai import OtterAI
import time

otter = OtterAI()
otter.login("brittney.hernandez476@gmail.com", "ENTER_PASSWORD")

# Try the MP3 with an explicit content type
result = otter.upload_speech("audio.mp3", content_type="audio/mpeg")

print(result)

# Then poll/get speeches until processing finishes
speeches = otter.get_speeches()
print(speeches)