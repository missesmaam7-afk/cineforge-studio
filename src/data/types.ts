export type MediaKind = 'video' | 'audio' | 'image'
export type EffectKind = 'fade-in' | 'fade-out' | 'zoom-in' | 'zoom-out' | 'shake' | 'blur' | 'glitch' | 'flash'
export type TransitionKind = 'cross-dissolve' | 'fade-black' | 'wipe-left' | 'wipe-right' | 'zoom-transition' | 'flash-transition'
export type MediaAsset = { id: string; name: string; kind: MediaKind; url: string; duration: number; sizeLabel: string; file?: File; width?: number; height?: number }
export type TimelineClip = { id: string; assetId: string; track: number; start: number; duration: number; trimIn: number; color: string; effects: EffectKind[]; transitionIn?: TransitionKind; transitionDuration?: number }
export type Track = { id: number; name: string; kind: 'video' | 'audio' }