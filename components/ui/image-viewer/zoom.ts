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

type ImageViewerFitInput = {
  imageWidth: number
  imageHeight: number
  viewportWidth: number
  viewportHeight: number
  padding?: number
  chromeHeight?: number
}

export function getImageViewerFitZoom({
  imageWidth,
  imageHeight,
  viewportWidth,
  viewportHeight,
  padding = 64,
  chromeHeight = 96,
}: ImageViewerFitInput): number {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return 1
  }

  const availableWidth = Math.max(1, viewportWidth - padding * 2)
  const availableHeight = Math.max(1, viewportHeight - padding * 2 - chromeHeight)
  const fitScale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight)

  return clampImageViewerZoom(Math.min(1, fitScale))
}
