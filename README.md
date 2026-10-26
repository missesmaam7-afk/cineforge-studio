# CineForge Studio

A dark, professional video-editing workspace starter built with React, TypeScript, and Vite.

## Features
- Media bin for importing video, image, and audio assets
- Multi-track timeline model and clip selection
- Preview monitor and inspector panel
- 16:9, 9:16, and 1:1 canvas layouts
- Effect presets: fade, zoom, shake, blur, glitch, flash
- Transition presets: cross-dissolve, fade to black, wipes, zoom, flash
- Audio asset import and timeline placement
- Project JSON export

## Requirements
- Node.js 18+ (Node.js 20+ recommended)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
```

## Important status note
This is an editor UI and project-model starter. Effect and transition controls currently save edit settings in the project model; they are not yet composited into an exported MP4. Audio clips can be imported and placed, but full multitrack mixing and final video rendering still require a rendering pipeline such as FFmpeg.

## Project structure

- `src/App.tsx` — editor workspace
- `src/components/` — media bin, preview, timeline, inspector
- `src/hooks/useEditor.ts` — editor state and actions
- `src/data/types.ts` — project and clip types
- `src/styles.css` — dark editing UI

## License
MIT