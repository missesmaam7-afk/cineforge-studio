import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

export type RenderAsset = { id: string; file: File; url: string; kind: 'video' | 'audio' | 'image' }
export type RenderClip = { id: string; assetId: string; start: number; duration: number; track: number; effects: string[]; transition: string }

export async function renderTimelineToMp4(args: {
  assets: RenderAsset[]
  clips: RenderClip[]
  aspect: string
  text: { text: string; color: string; size: number }
  onProgress: (message: string) => void
}): Promise<Blob> {
  const { assets, clips, aspect, text, onProgress } = args
  if (!clips.length) throw new Error('Timeline mein pehle kam se kam ek clip add karein.')
  const visualClips = clips.filter(c => c.track < 2 && assets.some(a => a.id === c.assetId && a.kind !== 'audio'))
  if (!visualClips.length) throw new Error('MP4 banane ke liye V1/V2 track par image ya video clip add karein.')
  const duration = Math.max(...clips.map(c => c.start + c.duration))
  if (duration > 600) throw new Error('Browser export ki limit 10 minute hai. Chhota sequence export karein.')
  const [width, height] = aspect === '9:16' ? [720, 1280] : aspect === '1:1' ? [720, 720] : [1280, 720]
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas render start nahi ho saka.')
  const media = new Map<string, HTMLImageElement | HTMLVideoElement>()
  for (const clip of visualClips) {
    const asset = assets.find(a => a.id === clip.assetId)!
    if (media.has(asset.id)) continue
    if (asset.kind === 'image') {
      const image = new Image(); image.src = asset.url
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error(asset.file.name + ' image load nahi hui.')) })
      media.set(asset.id, image)
    } else {
      const video = document.createElement('video'); video.src = asset.url; video.muted = true; video.playsInline = true; video.preload = 'auto'
      await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error(asset.file.name + ' video load nahi hui.')); video.load() })
      media.set(asset.id, video)
    }
  }
  const stream = canvas.captureStream(30)
  let audioContext: AudioContext | undefined
  const audioSources: AudioBufferSourceNode[] = []
  let audioStream: MediaStream | undefined
  try {
    const audioClips = clips.filter(c => c.track >= 2 && assets.some(a => a.id === c.assetId && a.kind === 'audio'))
    if (audioClips.length) {
      audioContext = new AudioContext()
      const destination = audioContext.createMediaStreamDestination()
      audioStream = destination.stream
      for (const clip of audioClips) {
        const asset = assets.find(a => a.id === clip.assetId)!
        const buffer = await audioContext.decodeAudioData(await asset.file.arrayBuffer())
        const source = audioContext.createBufferSource(); source.buffer = buffer
        source.connect(destination); audioSources.push(source)
      }
    }
    if (audioStream) audioStream.getAudioTracks().forEach(track => stream.addTrack(track))
    const mime = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type => MediaRecorder.isTypeSupported(type))
    if (!mime) throw new Error('Is browser mein video recording supported nahi hai. Chrome/Edge ka latest version use karein.')
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5000000 })
    const chunks: BlobPart[] = []
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
    const finished = new Promise<Blob>((resolve, reject) => { recorder.onstop = () => resolve(new Blob(chunks, { type: mime })); recorder.onerror = () => reject(new Error('Browser video recording fail ho gayi.')) })
    onProgress('Timeline ko render kar rahe hain…')
    recorder.start(250)
    if (audioContext) {
      await audioContext.resume()
      audioSources.forEach((source, index) => source.start(audioContext!.currentTime + (audioClips[index].start || 0), 0, Math.max(0.01, audioClips[index].duration)))
    }
    const started = performance.now()
    await new Promise<void>((resolve, reject) => {
      const frame = async () => {
        const t = (performance.now() - started) / 1000
        if (t >= duration) { resolve(); return }
        ctx.fillStyle = '#08090d'; ctx.fillRect(0, 0, width, height)
        const active = visualClips.filter(c => t >= c.start && t < c.start + c.duration).sort((a,b)=>a.track-b.track)
        for (const clip of active) {
          const asset = assets.find(a => a.id === clip.assetId)!
          const element = media.get(asset.id)!
          if (element instanceof HTMLVideoElement) {
            const local = Math.max(0, t - clip.start)
            if (Math.abs(element.currentTime - local) > 0.25 && local < (element.duration || 0)) {
              try { element.currentTime = local } catch {}
            }
            if (element.paused) element.play().catch(()=>{})
          }
          const fade = clip.transition !== 'None' ? Math.min(1, (t-clip.start)/0.45, (clip.start+clip.duration-t)/0.45) : 1
          ctx.globalAlpha = Math.max(0.15, fade)
          const sw = element instanceof HTMLVideoElement ? element.videoWidth : element.naturalWidth
          const sh = element instanceof HTMLVideoElement ? element.videoHeight : element.naturalHeight
          if (sw && sh) {
            const scale = Math.max(width/sw, height/sh)
            const dw = sw*scale, dh = sh*scale
            ctx.save()
            if (clip.effects.includes('Blur')) ctx.filter = 'blur(3px)'
            if (clip.effects.includes('Glitch')) ctx.filter = 'contrast(1.25) saturate(1.8)'
            if (clip.effects.includes('Flash')) ctx.filter = 'brightness(1.5)'
            if (clip.effects.includes('Zoom In')) { ctx.translate(width/2,height/2); ctx.scale(1.12,1.12); ctx.translate(-width/2,-height/2) }
            ctx.drawImage(element, (width-dw)/2, (height-dh)/2, dw, dh)
            ctx.restore()
          }
          ctx.globalAlpha = 1
        }
        if (text.text) {
          ctx.save(); ctx.fillStyle = text.color; ctx.font = '800 ' + Math.round(text.size*width/1280) + 'px Arial, sans-serif'
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3
          const lines = text.text.split(/\n/).slice(0,3)
          lines.forEach((line, i) => ctx.fillText(line.slice(0,100), width/2, height*0.9 - (lines.length-1-i)*Math.round(text.size*width/1280)*1.2, width*0.88))
          ctx.restore()
        }
        onProgress('Rendering: ' + Math.min(100, Math.floor(t/duration*100)) + '%')
        requestAnimationFrame(()=>{ void frame().catch(reject) })
      }
      requestAnimationFrame(()=>{ void frame().catch(reject) })
    })
    recorder.stop()
    const webm = await finished
    onProgress('MP4 encoder load ho raha hai…')
    const ffmpeg = new FFmpeg()
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd'
    await ffmpeg.load({ coreURL: await toBlobURL(base + '/ffmpeg-core.js','text/javascript'), wasmURL: await toBlobURL(base + '/ffmpeg-core.wasm','application/wasm') })
    await ffmpeg.writeFile('input.webm', new Uint8Array(await webm.arrayBuffer()))
    onProgress('MP4 encode ho raha hai…')
    await ffmpeg.exec(['-i','input.webm','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart','-c:a','aac','-b:a','192k','output.mp4'])
    const data = await ffmpeg.readFile('output.mp4')
    if (typeof data === 'string') throw new Error('MP4 encoder ne invalid output diya.')
    onProgress('MP4 ready')
    return new Blob([data], { type: 'video/mp4' })
  } finally {
    stream.getTracks().forEach(t=>t.stop())
    audioStream?.getTracks().forEach(t=>t.stop())
    if (audioContext) await audioContext.close()
    media.forEach(el=>{ if (el instanceof HTMLVideoElement) { el.pause(); el.removeAttribute('src'); el.load() } })
  }
}
