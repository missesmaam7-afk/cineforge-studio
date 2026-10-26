# CineForge Studio — current status and next steps

## What is implemented

The current application is a React + TypeScript + Vite editor UI. It supports:
- Importing local video, image, and audio files into a temporary browser media bin.
- Adding clips to a simple multi-track timeline and selecting/deleting clips.
- Changing clip start and duration.
- Storing effect and transition selections in React state.
- Choosing 16:9, 9:16, or 1:1 canvas layouts.
- Downloading a project JSON file.

## Limitations to be aware of

- **MP4 export is not implemented.** The current “Export project JSON” button exports edit metadata, not a rendered movie.
- **Effects are not composited.** Effect and transition controls only record settings in the editor state; they do not render those effects into a final video.
- **The timeline is not a true playback engine.** The preview currently displays the selected media asset directly. The Play/Pause and playhead buttons are only UI controls and are not synchronized with a composed timeline.
- **Projects are not fully persistent.** Imported media uses browser object URLs and is lost after the page reloads. The JSON file stores asset names and clip metadata, not the media file contents.
- **No AI editing integration is configured.** A ChatGPT-controlled workflow would require an explicit AI/API integration and user-provided credentials; API secrets must stay on the server and must never be committed into this public repository.

## Recommended implementation sequence

1. Fix editor fundamentals: media selection independent from clip selection, project save/load, timeline playhead state, and correct project metadata.
2. Add an export pipeline that accepts a validated edit-decision list and renders a real MP4 with FFmpeg on a backend or an explicitly packaged local runtime.
3. Translate supported effects, transitions, aspect ratio, audio trimming/mixing, and image duration into rendering commands; validate paths and constrain file sizes and render duration.
4. Add export progress, actionable errors, and an output download.
5. Only after rendering is stable, add optional AI-assisted editing commands with explicit consent and securely managed API credentials.

## Run locally

Requirements: Node.js 18+ (Node.js 20+ recommended) and npm.

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

This document describes the code as it exists now; it does not claim that MP4 export or AI-powered editing is already available.
