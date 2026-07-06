export const IMAGE_VIEWER_ZOOM_MIN = 0.25
export const IMAGE_VIEWER_ZOOM_MAX = 5
export const IMAGE_VIEWER_ZOOM_FACTOR = 1.12

export function clampImageViewerZoom(scale: number): number {
  if (!Number.isFinite(scale)) {
    return 1
  }

  return Math.min(IMAGE_VIEWER_ZOOM_MAX, Math.max(IMAGE_VIEWER_ZOOM_MIN, scale))
}

export function getNextImageViewerZoom(currentScale: number, deltaY: number): number {
  const baseScale = clampImageViewerZoom(currentScale)
  const direction = deltaY > 0 ? -1 : 1
  const nextScale = direction > 0
    ? baseScale * IMAGE_VIEWER_ZOOM_FACTOR
    : baseScale / IMAGE_VIEWER_ZOOM_FACTOR

  return clampImageViewerZoom(nextScale)
}

export function formatImageViewerZoomLabel(scale: number): string {
  return `${Math.round(clampImageViewerZoom(scale) * 100)}%`
}
