import re
from typing import List, Dict, Any
from app.services.video_lookup import video_lookup_service


class TranslationService:
    def __init__(self):
        self.video_lookup = video_lookup_service
        
        # Mapping of single words and multi-word phrases to ISL glosses
        self.gloss_map: Dict[str, str] = {
            # Multi-word phrases
            "thank you": "THANK_YOU",
            "thanks a lot": "THANK_YOU",
            "thank you very much": "THANK_YOU",
            "good morning": "GOOD",
            "good afternoon": "GOOD",
            "good evening": "GOOD",
            
            # Greetings
            "hello": "HELLO",
            "hi": "HELLO",
            "hey": "HELLO",
            "greetings": "HELLO",
            
            # Politeness & Responses
            "thanks": "THANK_YOU",
            "thank": "THANK_YOU",
            "please": "PLEASE",
            "kindly": "PLEASE",
            "yes": "YES",
            "yeah": "YES",
            "yep": "YES",
            "ok": "YES",
            "okay": "YES",
            "no": "NO",
            "nope": "NO",
            "not": "NO",
            
            # People & Education
            "student": "STUDENT",
            "students": "STUDENT",
            "teacher": "TEACHER",
            "teachers": "TEACHER",
            "sir": "TEACHER",
            "madam": "TEACHER",
            "mam": "TEACHER",
            "learn": "LEARN",
            "learning": "LEARN",
            "learned": "LEARN",
            "study": "LEARN",
            "studying": "LEARN",
            "book": "BOOK",
            "books": "BOOK",
            "read": "BOOK",
            "reading": "BOOK",
            "question": "QUESTION",
            "questions": "QUESTION",
            "ask": "QUESTION",
            "asking": "QUESTION",
            "query": "QUESTION",
            "understand": "UNDERSTAND",
            "understands": "UNDERSTAND",
            "understood": "UNDERSTAND",
            "understanding": "UNDERSTAND",
            
            # Common Concepts & Actions
            "water": "WATER",
            "drink": "WATER",
            "drinking": "WATER",
            "good": "GOOD",
            "great": "GOOD",
            "nice": "GOOD",
            "fine": "GOOD",
            "bad": "BAD",
            "poor": "BAD",
            "help": "HELP",
            "helping": "HELP",
            "helped": "HELP",
            "assist": "HELP",
        }

    def normalize_text(self, text: str) -> str:
        text = text.strip().lower()
        text = re.sub(r"[^\w\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def tokenize(self, text: str) -> List[str]:
        return text.split()

    def to_gloss(self, tokens: List[str]) -> List[str]:
        gloss_sequence = []
        n = len(tokens)
        i = 0

        while i < n:
            matched = False

            # Check 3-word then 2-word phrases first
            for length in (3, 2):
                if i + length <= n:
                    phrase = " ".join(tokens[i:i + length])
                    if phrase in self.gloss_map:
                        gloss_sequence.append(self.gloss_map[phrase])
                        i += length
                        matched = True
                        break

            if not matched:
                token = tokens[i]
                gloss = self.gloss_map.get(token, token.upper())
                gloss_sequence.append(gloss)
                i += 1

        return gloss_sequence

    def translate(self, text: str) -> Dict[str, Any]:
        normalized = self.normalize_text(text)
        tokens = self.tokenize(normalized)
        gloss_sequence = self.to_gloss(tokens)

        videos = []
        for gloss in gloss_sequence:
            video_info = self.video_lookup.lookup(gloss)
            videos.append(video_info)

        return {
            "original_text": text,
            "gloss_sequence": gloss_sequence,
            "videos": videos
        }


translation_service = TranslationService()