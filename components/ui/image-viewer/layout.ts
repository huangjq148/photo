export function getImageViewerOverlayClasses(): string {
  return 'fixed inset-0 z-[60] flex h-screen w-screen items-stretch justify-stretch bg-slate-950/90 backdrop-blur-md'
}

export function getImageViewerContentClasses(): string {
  return 'relative flex h-full w-full flex-1 flex-col items-stretch justify-stretch'
}

export function getImageViewerImageClasses(): string {
  return 'max-h-none max-w-none object-contain'
}
