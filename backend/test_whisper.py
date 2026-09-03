import whisper

model = whisper.load_model("base")

result = model.transcribe(
    "Recording (2).m4a",
    language="en"
)

print(result["text"])