import json
import os
import time
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv

load_dotenv()


KIE_API_KEY = os.getenv("KIE_API_KEY")

BASE_URL = "https://api.kie.ai"

# Kie.ai model we are using
MODEL = "wan/2-7-text-to-video"


class KieService:

    def __init__(self):
        if not KIE_API_KEY:
            raise RuntimeError(
                "KIE_API_KEY is not configured in backend/.env"
            )

        self.api_key = KIE_API_KEY

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def create_isl_video(
        self,
        text: str,
        duration: int = 5,
        resolution: str = "720p",
        ratio: str = "16:9",
    ) -> Dict[str, Any]:

        if not text or not text.strip():
            raise ValueError("Text cannot be empty.")

        prompt = self._build_isl_prompt(text)

        payload = {
            "model": MODEL,
            "input": {
                "prompt": prompt,
                "negative_prompt": (
                    "blurry, distorted hands, extra fingers, "
                    "extra arms, deformed hands, bad anatomy, "
                    "camera movement, shaky camera, subtitles, "
                    "text, watermark, multiple people"
                ),
                "resolution": resolution,
                "ratio": ratio,
                "duration": duration,
                "prompt_extend": True,
                "watermark": False,
                "seed": 123456,
            },
        }

        url = f"{BASE_URL}/api/v1/jobs/createTask"

        try:
            response = requests.post(
                url,
                headers=self._headers(),
                json=payload,
                timeout=60,
            )
        except requests.RequestException as e:
            raise RuntimeError(
                f"Could not connect to Kie.ai: {e}"
            ) from e

        if response.status_code >= 400:
            raise RuntimeError(
                f"Kie.ai API error {response.status_code}: "
                f"{response.text}"
            )

        try:
            data = response.json()
        except ValueError as e:
            raise RuntimeError(
                "Kie.ai returned invalid JSON."
            ) from e

        if data.get("code") != 200:
            raise RuntimeError(
                f"Kie.ai error: {data.get('msg', 'Unknown error')}"
            )

        task_data = data.get("data", {})
        task_id = task_data.get("taskId")

        if not task_id:
            raise RuntimeError(
                "Kie.ai did not return a taskId."
            )

        return {
            "task_id": task_id,
            "model": MODEL,
            "prompt": prompt,
            "status": "waiting",
        }

    def get_task_status(self, task_id: str) -> Dict[str, Any]:

        if not task_id:
            raise ValueError("task_id is required.")

        url = f"{BASE_URL}/api/v1/jobs/recordInfo"

        params = {
            "taskId": task_id
        }

        try:
            response = requests.get(
                url,
                headers=self._headers(),
                params=params,
                timeout=30,
            )
        except requests.RequestException as e:
            raise RuntimeError(
                f"Could not connect to Kie.ai: {e}"
            ) from e

        if response.status_code >= 400:
            raise RuntimeError(
                f"Kie.ai status error {response.status_code}: "
                f"{response.text}"
            )

        try:
            data = response.json()
        except ValueError as e:
            raise RuntimeError(
                "Kie.ai returned invalid JSON."
            ) from e

        if data.get("code") not in (200, 500):
            raise RuntimeError(
                f"Kie.ai error: {data.get('msg', 'Unknown error')}"
            )

        task_data = data.get("data", {})

        state = task_data.get("state")

        video_url = self._extract_video_url(
            task_data.get("resultJson")
        )

        return {
            "task_id": task_id,
            "state": state,
            "progress": task_data.get("progress"),
            "video_url": video_url,
            "fail_code": task_data.get("failCode"),
            "fail_message": task_data.get("failMsg"),
        }

    def wait_for_video(
        self,
        task_id: str,
        max_wait_seconds: int = 300,
    ) -> Dict[str, Any]:

        start_time = time.time()

        while True:

            result = self.get_task_status(task_id)

            state = result.get("state")

            if state == "success":

                if not result.get("video_url"):
                    raise RuntimeError(
                        "Kie.ai reported success but no video URL was found."
                    )

                return result

            if state == "fail":

                raise RuntimeError(
                    result.get("fail_message")
                    or "Kie.ai video generation failed."
                )

            if time.time() - start_time > max_wait_seconds:

                raise RuntimeError(
                    "Kie.ai video generation timed out."
                )

            time.sleep(5)

    def _extract_video_url(
        self,
        result_json: Optional[str],
    ) -> Optional[str]:

        if not result_json:
            return None

        try:
            result_data = json.loads(result_json)
        except (json.JSONDecodeError, TypeError):
            return None

        # Typical Kie.ai response:
        #
        # {
        #     "resultUrls": [
        #         "https://....mp4"
        #     ]
        # }

        result_urls = result_data.get("resultUrls")

        if isinstance(result_urls, list) and result_urls:
            return result_urls[0]

        # Some APIs may return a single URL
        if isinstance(result_urls, str):
            return result_urls

        # Fallback for different result structures
        for key in (
            "videoUrl",
            "video_url",
            "url",
        ):
            value = result_data.get(key)

            if isinstance(value, str):
                return value

        return None

    def _build_isl_prompt(self, text: str) -> str:

        return f"""
Create an educational Indian Sign Language (ISL) demonstration
video for this sentence:

"{text}"

IMPORTANT:

Show ONE human signer only.

The signer must demonstrate the meaning of the sentence
using Indian Sign Language.

The signer should be centered in the frame.

Show the signer from approximately the waist/chest upward.

Both hands must remain clearly visible.

Use clear, deliberate hand movements.

Use natural facial expressions.

Keep the camera completely fixed.

Use a simple plain background.

Use good lighting.

Do not show other people.

Do not show objects.

Do not add subtitles.

Do not add captions.

Do not add written text.

Do not add logos.

Do not add distracting animations.

The purpose of the video is to demonstrate Indian Sign Language
to a student.

Sentence to demonstrate:

"{text}"
""".strip()


kie_service = KieService()