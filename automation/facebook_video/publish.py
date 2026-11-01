"""Publish a rendered vertical MP4 as a Facebook Page Reel."""
from __future__ import annotations

import json
import os
from pathlib import Path

import requests

PAGE_ID = os.getenv("FACEBOOK_PAGE_ID", "").strip()
TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "").strip()
VERSION = os.getenv("FACEBOOK_GRAPH_API_VERSION", "v25.0").strip()
VIDEO = Path(os.getenv("VIDEO_OUTPUT", "output/facebook-video.mp4"))
META = Path(os.getenv("METADATA_OUTPUT", "output/post.json"))
TIMEOUT = 180


def main() -> None:
    if not PAGE_ID or not TOKEN:
        raise RuntimeError("Missing FACEBOOK_PAGE_ID or FACEBOOK_PAGE_ACCESS_TOKEN GitHub secrets")
    if not VIDEO.exists():
        raise FileNotFoundError(f"Video not found: {VIDEO}")
    post = json.loads(META.read_text(encoding="utf-8"))
    caption = post.get("caption", "Naya video Missesmaam7 par!")

    base = f"https://graph.facebook.com/{VERSION}/{PAGE_ID}/video_reels"
    auth = {"Authorization": f"OAuth {TOKEN}"}

    # Phase 1: initialize resumable Reel upload.
    start = requests.post(base, headers=auth, data={"upload_phase": "start"}, timeout=60)
    start.raise_for_status()
    session = start.json()
    video_id = session["video_id"]
    upload_url = session.get("upload_url") or f"https://rupload.facebook.com/video-upload/{VERSION}/{video_id}"

    # Phase 2: upload the MP4 bytes.
    size = VIDEO.stat().st_size
    with VIDEO.open("rb") as stream:
        upload = requests.post(
            upload_url,
            headers={
                **auth,
                "offset": "0",
                "file_size": str(size),
                "Content-Type": "application/octet-stream",
            },
            data=stream,
            timeout=TIMEOUT,
        )
    upload.raise_for_status()

    # Phase 3: finish and publish the Reel.
    finish = requests.post(
        base,
        headers=auth,
        data={
            "upload_phase": "finish",
            "video_id": video_id,
            "video_state": "PUBLISHED",
            "description": caption,
        },
        timeout=90,
    )
    finish.raise_for_status()
    result = finish.json()
    if result.get("success") is False:
        raise RuntimeError(f"Facebook did not confirm publishing: {result}")
    print(f"Facebook Reel publish request completed. video_id={video_id}; response={result}")


if __name__ == "__main__":
    main()
