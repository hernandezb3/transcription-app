from otterai import OtterAI
import time

otter = OtterAI()
#otter.login("brittney.hernandez476@gmail.com", "Vw4@Q.yM-fLn2DU7WCBT")

otter.login("brittney.hernandez476@gmail.com", "LzKPnDh9e@GYYbNZKhhB")

# Try the MP3 with an explicit content type
result = otter.upload_speech(r"C:\Users\bhernandez\Desktop\gitrepos\github\transcription-app\backend\app\open-source\3_dudes.mp3", content_type="audio/mpeg")

print(result)

# Then poll/get speeches until processing finishes
speeches = otter.get_speeches()
print(speeches)