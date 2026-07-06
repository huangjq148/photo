interface ImageViewerResetState {
  zoom: number
  scrollLeft: number
  scrollTop: number
}

export function getImageViewerResetState(): ImageViewerResetState {
  return {
    zoom: 1,
    scrollLeft: 0,
    scrollTop: 0,
  }
}

interface ImageViewerDragScrollInput {
  startScrollLeft: number
  startScrollTop: number
  deltaX: number
  deltaY: number
}

interface ImageViewerDragScrollOutput {
  scrollLeft: number
  scrollTop: number
}

export function getImageViewerDragScrollPosition({
  startScrollLeft,
  startScrollTop,
  deltaX,
  deltaY,
}: ImageViewerDragScrollInput): ImageViewerDragScrollOutput {
  return {
    scrollLeft: startScrollLeft - deltaX,
    scrollTop: startScrollTop - deltaY,
  }
}
