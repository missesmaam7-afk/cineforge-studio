"""Generate a short vertical Facebook video and Hindi/Hinglish caption.

Uses Pollinations for copy and image generation. If a video model is configured,
it attempts native AI video generation; otherwise FFmpeg animates the generated
full-frame image into a vertical MP4 (pan/zoom motion).
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import quote

import requests

BASE = "https://gen.pollinations.ai"
API_KEY = os.getenv("POLLINATIONS_API_KEY", "").strip()
IMAGE_MODEL = os.getenv("POLLINATIONS_IMAGE_MODEL", "black-forest-labs/flux.1-schnell").strip()
VIDEO_MODEL = os.getenv("POLLINATIONS_VIDEO_MODEL", "").strip()
TEXT_MODEL = os.getenv("POLLINATIONS_TEXT_MODEL", "openai/gpt-5.4-nano").strip()
THEME = os.getenv("CONTENT_THEME", "").strip() or "A positive, engaging, family-friendly Hindi social media short"
VIDEO_PATH = Path(os.getenv("VIDEO_OUTPUT", "output/facebook-video.mp4"))
META_PATH = Path(os.getenv("METADATA_OUTPUT", "output/post.json"))
WORK = VIDEO_PATH.parent
TIMEOUT = 240
HEADERS = {"Authorization": f"Bearer {API_KEY}"} if API_KEY else {}


def require_key() -> None:
    if not API_KEY:
        raise RuntimeError("Missing POLLINATIONS_API_KEY GitHub secret. Add a secret key from https://enter.pollinations.ai/keys")


def ask_for_post() -> dict:
    prompt = f"""Create one original Facebook Reel concept for the page Missesmaam7.
Theme: {THEME}
Return ONLY valid JSON with keys: visual_prompt, caption, hashtags.
Requirements: visual_prompt is a detailed cinematic image/video prompt, vertical 9:16, no text, no logo, no watermark, no copyrighted characters, no imitation of a living artist. caption is natural Hindi or Hinglish, concise and engaging, with a gentle call to comment. hashtags is an array of 4 to 7 relevant hashtags. Keep it suitable for a broad family audience."""
    response = requests.post(
        f"{BASE}/v1/chat/completions",
        headers={**HEADERS, "Content-Type": "application/json"},
        json={"model": TEXT_MODEL, "messages": [
            {"role": "system", "content": "You write original, safe, high-quality social media content. Output strict JSON only."},
            {"role": "user", "content": prompt},
        ], "temperature": 0.85},
        timeout=90,
    )
    response.raise_for_status()
    raw = response.json()["choices"][0]["message"]["content"]
    raw = re.sub(r"^\s*```(?:json)?|\```\s*$", "", raw.strip(), flags=re.I)
    data = json.loads(raw)
    if not data.get("visual_prompt") or not data.get("caption"):
        raise ValueError("AI response did not include visual_prompt and caption")
    tags = data.get("hashtags", [])
    if isinstance(tags, str):
        tags = re.findall(r"#[\w]+", tags)
    data["hashtags"] = [("#" + t.lstrip("#").replace(" ", "")) for t in tags[:8]]
    return data


def download_image(prompt: str) -> Path:
    url = f"{BASE}/image/{quote(prompt, safe='')}"
    response = requests.get(url, headers=HEADERS, params={
        "model": IMAGE_MODEL, "width": 1080, "height": 1920, "nologo": "true"
    }, timeout=TIMEOUT)
    response.raise_for_status()
    if not response.headers.get("content-type", "").startswith("image/"):
        raise RuntimeError("Pollinations did not return an image")
    path = WORK / "generated-cover.jpg"
    path.write_bytes(response.content)
    return path


def try_native_video(prompt: str, image_path: Path) -> bool:
    if not VIDEO_MODEL:
        return False
    # Pollinations video generation is synchronous. If the selected model or
    # account does not support it, fall back to a locally animated image.
    url = f"{BASE}/video/{quote(prompt, safe='')}"
    try:
        response = requests.get(url, headers=HEADERS, params={
            "model": VIDEO_MODEL, "duration": 8, "aspectRatio": "9:16"
        }, timeout=TIMEOUT)
        response.raise_for_status()
        ctype = response.headers.get("content-type", "")
        if "video/" in ctype or response.content[:4] == b"\x00\x00\x00":
            VIDEO_PATH.write_bytes(response.content)
            return True
        # Some API responses may return JSON containing a public video URL.
        payload = response.json()
        video_url = payload.get("data", [{}])[0].get("url") or payload.get("url")
        if video_url:
            video = requests.get(video_url, timeout=TIMEOUT)
            video.raise_for_status()
            VIDEO_PATH.write_bytes(video.content)
            return True
    except Exception as exc:
        print(f"Native video generation unavailable; using FFmpeg image motion: {exc}", file=sys.stderr)
    return False


def render_motion_video(image_path: Path) -> None:
    # 8-second vertical motion clip, 30 fps, H.264 MP4.
    vf = (
        "scale=1200:2134:force_original_aspect_ratio=increase,"
        "crop=1200:2134,"
        "zoompan=z='min(zoom+0.0007,1.08)':d=240:s=1080x1920:fps=30,"
        "setsar=1,format=yuv420p"
    )
    cmd = [
        "ffmpeg", "-y", "-loop", "1", "-i", str(image_path),
        "-vf", vf, "-t", "8", "-r", "30",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-movflags", "+faststart", str(VIDEO_PATH),
    ]
    subprocess.run(cmd, check=True)


def main() -> None:
    require_key()
    WORK.mkdir(parents=True, exist_ok=True)
    VIDEO_PATH.parent.mkdir(parents=True, exist_ok=True)
    print("Generating original post concept and caption...")
    post = ask_for_post()
    prompt = post["visual_prompt"] + ", premium cinematic composition, visually bold main subject, crisp details, rich natural colors, vertical 9:16"
    image_path = download_image(prompt)
    if not try_native_video(prompt, image_path):
        render_motion_video(image_path)
    if not VIDEO_PATH.exists() or VIDEO_PATH.stat().st_size < 50_000:
        raise RuntimeError("Rendered video is missing or unexpectedly small")
    post["caption"] = post["caption"].strip() + "\n\n" + " ".join(post["hashtags"])
    post["generated_at_utc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    post["video_file"] = str(VIDEO_PATH)
    META_PATH.write_text(json.dumps(post, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Video ready: {VIDEO_PATH} ({VIDEO_PATH.stat().st_size} bytes)")
    print(f"Caption: {post['caption']}")


if __name__ == "__main__":
    main()
