# Missesmaam7 — Facebook AI Video Publisher

This workflow generates an original Hindi/Hinglish social post, creates a vertical visual with Pollinations, renders an MP4, and publishes it as a Facebook Page Reel.

## Schedule

GitHub Actions cron uses UTC. The schedule below corresponds to India Standard Time (UTC+05:30):

| IST | UTC |
|---|---|
| 10:00 | 04:30 |
| 15:00 | 09:30 |
| 19:00 | 13:30 |

GitHub scheduled workflows can start a few minutes late during platform load. Use **Actions → Facebook AI Video Publisher → Run workflow** for a manual run.

## Required GitHub Actions secrets

Open **Settings → Secrets and variables → Actions → New repository secret**:

- `POLLINATIONS_API_KEY` — secret key from https://enter.pollinations.ai/keys (server-side `sk_` key; do not commit it).
- `FACEBOOK_PAGE_ID` — Page ID for Missesmaam7.
- `FACEBOOK_PAGE_ACCESS_TOKEN` — Page access token with the permissions required to publish Page Reels (including `pages_manage_posts`; token must be valid and authorized for this Page).

The Facebook Page ID previously supplied for this project is `436135029576334`. It is intentionally read from a secret at runtime rather than hard-coded in source.

## Optional Actions variables

Open **Settings → Secrets and variables → Actions → Variables**:

- `POLLINATIONS_IMAGE_MODEL` — default `black-forest-labs/flux.1-schnell`.
- `POLLINATIONS_TEXT_MODEL` — default `openai/gpt-5.4-nano`.
- `POLLINATIONS_VIDEO_MODEL` — optional Pollinations video model ID. If empty or unavailable, the workflow makes an 8-second motion video from the generated image using FFmpeg.
- `FACEBOOK_GRAPH_API_VERSION` — optional Graph API version supported by your Meta app, e.g. `v25.0`.

## Run safely

1. Add the three required secrets above.
2. In **Actions**, enable workflows if GitHub asks.
3. Run the workflow manually with **dry_run = true** first. This generates an MP4 and uploads it as a workflow artifact without publishing.
4. Review the artifact. Then run manually with **dry_run = false** to publish.
5. Scheduled runs publish automatically once secrets and permissions are valid.

## What is and is not AI-generated

- Text: AI-generated caption and concept via Pollinations.
- Image: AI-generated vertical visual via Pollinations.
- Video: native AI video is attempted only when `POLLINATIONS_VIDEO_MODEL` is configured. Otherwise FFmpeg applies smooth pan/zoom motion to the generated image. This fallback is an animated video, not generative frame-by-frame AI video.
- Rendering: FFmpeg H.264 MP4, 1080×1920, 30 fps, 8 seconds.

## Troubleshooting

- Pollinations 401/403: check that `POLLINATIONS_API_KEY` is a secret key with image/text permissions and sufficient balance.
- Facebook OAuth error: refresh the Page access token and confirm it belongs to the target Page and has publishing permissions.
- Graph API version error: set `FACEBOOK_GRAPH_API_VERSION` to a currently supported version for your Meta app.
- Artifact review: open the completed workflow run and download the `facebook-video-<run number>` artifact.

No Facebook credential should ever be pasted into chat or committed to this repository.
