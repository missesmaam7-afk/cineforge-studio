import { useMemo, useRef, useState } from 'react'
import { Aperture, AudioLines, Download, FileAudio, FileImage, FileVideo, Film, FolderOpen, Play, Plus, Scissors, Settings2, Trash2, WandSparkles } from 'lucide-react'

type Asset = { id: string; file: File; url: string; kind: 'video' | 'audio' | 'image' }
type Clip = { id: string; assetId: string; start: number; duration: number; track: number; effects: string[]; transition: string }
const effects = ['Fade In', 'Fade Out', 'Zoom In', 'Zoom Out', 'Shake', 'Blur', 'Glitch', 'Flash']
const transitions = ['Cross Dissolve', 'Fade Through Black', 'Wipe Left', 'Wipe Right', 'Zoom', 'Flash']
export default function App() {
  const picker = useRef<HTMLInputElement>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [aspect, setAspect] = useState('16:9')
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [zoom, setZoom] = useState(40)
  const [overlayText, setOverlayText] = useState('')
  const [textColor, setTextColor] = useState('#ffffff')
  const [textSize, setTextSize] = useState(36)
  const [exportMessage, setExportMessage] = useState('')
  const activeClip = clips.find(c => c.id === selected) ?? null
  const activeAsset = activeClip
    ? assets.find(a => a.id === activeClip.assetId)
    : assets.find(a => a.id === selectedAssetId) ?? assets[0]
  const importFiles = (list: FileList | null) => {
    if (!list) return
    const incoming = Array.from(list).filter(f => /^(video|audio|image)\//.test(f.type)).map(file => ({
      id: crypto.randomUUID(), file, url: URL.createObjectURL(file),
      kind: (file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image') as Asset['kind']
    }))
    setAssets(old => [...old, ...incoming])
  }
  const addClip = (asset: Asset) => {
    const start = clips.reduce((end, c) => Math.max(end, c.start + c.duration), 0)
    const clip = { id: crypto.randomUUID(), assetId: asset.id, start, duration: 8, track: asset.kind === 'audio' ? 2 : 0, effects: [] as string[], transition: 'None' }
    setClips(old => [...old, clip]); setSelected(clip.id); setSelectedAssetId(asset.id)
  }
  const updateClip = (patch: Partial<Clip>) => setClips(old => old.map(c => c.id === selected ? { ...c, ...patch } : c))
  const toggleEffect = (effect: string) => { if (activeClip) updateClip({ effects: activeClip.effects.includes(effect) ? activeClip.effects.filter(e => e !== effect) : [...activeClip.effects, effect] }) }
  const total = Math.max(30, ...clips.map(c => c.start + c.duration))
  const activeFilters = activeClip?.effects.map(effect => ({'Blur':'blur(2px)','Glitch':'contrast(1.25) saturate(1.8)','Flash':'brightness(1.3)','Shake':'contrast(1.1)'} as Record<string,string>)[effect]).filter(Boolean).join(' ') || 'none'
  const exportProject = () => {
    const blob = new Blob([JSON.stringify({ app: 'CineForge Studio', version: '0.1.0', aspect, clips, assets: assets.map(a => ({ id: a.id, name: a.file.name, kind: a.kind })), exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'cineforge-project.json'; link.click(); URL.revokeObjectURL(url)
  }
  const currentTime = useMemo(() => `00:${Math.floor(playhead / 60).toString().padStart(2,'0')}:${Math.floor(playhead % 60).toString().padStart(2,'0')}`, [playhead])
  return <main className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark"><Aperture size={22}/></div><div><strong>CINEFORGE <span>STUDIO</span></strong><small>CREATIVE POST-PRODUCTION</small></div></div><div className="project-title"><Film size={15}/> Untitled Project <span className="saved">● All changes local</span></div><div className="header-actions"><button className="icon-button" onClick={exportProject}><Download size={15}/> Project JSON</button><button className="primary" onClick={()=>{setExportMessage('MP4 renderer is being prepared; this build can export the editable project JSON.');}}><Film size={15}/> Export MP4</button></div></header>
    <nav className="toolbar"><span className="tab active"><Scissors size={15}/> Edit</span><span className="tab"><WandSparkles size={15}/> Effects</span><span className="tab"><AudioLines size={15}/> Audio</span><span className="spacer"/><label>Canvas <select value={aspect} onChange={e=>setAspect(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option></select></label><button className="icon-button" title="Settings"><Settings2 size={16}/></button></nav>
    <section className="workspace">
      <aside className="panel media"><div className="panel-heading"><div><small>PROJECT</small><h2>Media bin</h2></div><button className="icon-button" onClick={()=>picker.current?.click()} title="Import media"><Plus size={17}/></button></div><input ref={picker} type="file" hidden multiple accept="video/*,audio/*,image/*" onChange={e=>importFiles(e.target.files)}/><button className="import-box" onClick={()=>picker.current?.click()}><FolderOpen size={24}/><b>Import media</b><span>Video, audio, images</span></button><div className="asset-list">{assets.map(a=><button className={activeAsset?.id===a.id?'asset selected':'asset'} key={a.id} onClick={()=>{setSelectedAssetId(a.id);setSelected(clips.find(c=>c.assetId===a.id)?.id ?? null)}} onDoubleClick={()=>addClip(a)}>{a.kind==='audio'?<FileAudio/>:a.kind==='image'?<FileImage/>:<FileVideo/>}<span><b>{a.file.name}</b><small>{a.kind.toUpperCase()} · {(a.file.size/1024/1024).toFixed(1)} MB</small></span><Plus size={14} onClick={e=>{e.stopPropagation();addClip(a)}}/></button>)}{!assets.length&&<p className="muted empty">Your media will appear here after import.</p>}</div></aside>
      <div className="center"><section className="panel monitor"><div className="panel-heading"><div><small>VIEWER</small><h2>Program monitor</h2></div><span className="pill">{aspect}</span></div><div className="stage"><div className={'canvas ratio-'+aspect.replace(':','-')}>{activeAsset?.kind==='video'?<video src={activeAsset.url} controls className="preview-media" style={{filter:activeFilters}}/>:activeAsset?.kind==='image'?<img src={activeAsset.url} className="preview-media" style={{filter:activeFilters}} alt={activeAsset.file.name}/>:activeAsset?.kind==='audio'?<div className="placeholder"><AudioLines size={40}/><b>{activeAsset.file.name}</b><audio src={activeAsset.url} controls/></div>:<div className="placeholder"><div className="play-orb"><Play size={24}/></div><b>Your story starts here</b><span>Import footage, then double-click an asset to add it to the timeline.</span></div>}{overlayText&&<div className="text-overlay" style={{color:textColor,fontSize:textSize}}>{overlayText}</div>}</div></div><div className="transport"><button className="icon-button" onClick={()=>setPlayhead(0)}>↤</button><button className="play-button" onClick={()=>setPlaying(!playing)}><Play size={15}/>{playing?'Pause':'Play'}</button><button className="icon-button" onClick={()=>setPlayhead(p=>p+1)}>↦</button><span>{currentTime} / 00:00:30</span></div></section>
      <section className="panel timeline"><div className="panel-heading"><div><small>SEQUENCE</small><h2>Timeline</h2></div><label className="zoom">Zoom <input type="range" min="18" max="80" value={zoom} onChange={e=>setZoom(+e.target.value)}/></label></div><div className="ruler"><span>00:00</span><span>00:10</span><span>00:20</span><span>00:30</span><span>00:40</span></div>{['V1 · Main video','V2 · Overlay','A1 · Music','A2 · Voiceover'].map((name,track)=><div className="track" key={name}><div className="track-name">{name}</div><div className="track-lane">{clips.filter(c=>c.track===track).map(c=>{const asset=assets.find(a=>a.id===c.assetId);return <button key={c.id} className={'clip '+(selected===c.id?'clip-selected':'')} style={{left:c.start*zoom/4,width:Math.max(70,c.duration*zoom/4)}} onClick={()=>setSelected(c.id)} title={asset?.file.name}>{asset?.file.name}<small>{c.effects.length?c.effects.join(', '):'Media clip'}</small></button>})}</div></div>)}<div className="timeline-footer"><span>● Timeline ready</span><span>{clips.length} clips · {total.toFixed(0)} sec sequence</span></div><div className="timeline-actions"><button onClick={()=>activeAsset&&addClip(activeAsset)}><Plus size={14}/> Add selected media</button><button onClick={()=>{setClips(old=>old.filter(c=>c.id!==selected));setSelected(null)}} disabled={!selected}><Trash2 size={14}/> Delete clip</button></div></section></div>
      <aside className="panel inspector"><div className="panel-heading"><div><small>CONTROLS</small><h2>Inspector</h2></div><Settings2 size={17}/></div>{activeClip?<div className="inspector-body"><b className="filename">{assets.find(a=>a.id===activeClip.assetId)?.file.name}</b><label>Position (seconds)<input type="number" min="0" step=".1" value={activeClip.start} onChange={e=>updateClip({start:Math.max(0,+e.target.value)})}/></label><label>Duration (seconds)<input type="number" min="1" step=".1" value={activeClip.duration} onChange={e=>updateClip({duration:Math.max(1,+e.target.value)})}/></label><hr/><h3><WandSparkles size={14}/> Clip effects</h3><div className="effects">{effects.map(effect=><button key={effect} className={activeClip.effects.includes(effect)?'effect on':'effect'} onClick={()=>toggleEffect(effect)}>{effect}</button>)}</div><label>Transition<select value={activeClip.transition} onChange={e=>updateClip({transition:e.target.value})}>{['None',...transitions].map(t=><option key={t}>{t}</option>)}</select></label><hr/><h3><Film size={14}/> Text overlay</h3><label>Overlay text<input value={overlayText} onChange={e=>setOverlayText(e.target.value)} placeholder="Type title or caption"/></label><label>Text size<input type="number" min="12" max="96" value={textSize} onChange={e=>setTextSize(Math.min(96,Math.max(12,+e.target.value||12)))}/></label><label>Text color<input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></label><p className="note">Text is shown in the program preview. MP4 rendering still needs the encoding pipeline.</p><button className="delete" onClick={()=>{setClips(old=>old.filter(c=>c.id!==selected));setSelected(null)}}><Trash2 size={14}/> Delete selected clip</button></div>:<div className="empty inspector-empty"><Settings2 size={26}/><b>No clip selected</b><span>Select a clip on the timeline to edit its properties.</span></div>}</aside>
    </section>{exportMessage&&<div className="export-notice" role="status">{exportMessage}<button onClick={()=>setExportMessage('')}>Dismiss</button></div>}<footer className="statusbar"><span>● READY　/　{assets.length} MEDIA FILES　/　{clips.length} TIMELINE CLIPS</span><span>Space: Play/Pause · Double-click media to add</span><span>CINEFORGE v0.1.0</span></footer>
  </main>
}