import { uploadFile } from "@/lib/client/upload-request";
import type { UploadRequestBusinessError, UploadRequestResult } from "@/lib/client/upload-request";

export type UploadQueueStatus = "queued" | "uploading" | "success" | "failed" | "cancelled";

export type UploadQueueProgress = {
  loaded: number;
  total: number;
};

export type UploadQueueItem = {
  id: string;
  albumId: string;
  file: File;
  fileKey: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string | null;
  status: UploadQueueStatus;
  progress: UploadQueueProgress;
  result?: unknown | null;
  error?: UploadRequestBusinessError | null;
};

export type UploadQueueState = {
  items: UploadQueueItem[];
  activeCount: number;
  completedCount: number;
  queuedCount: number;
};

export type UploadQueueDraft = {
  id?: string;
  albumId: string;
  file: File;
  fileKey: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string | null;
  status?: "queued";
  progress?: UploadQueueProgress;
};

export type UploadQueueReducerAction =
  | { type: "enqueue"; items: readonly UploadQueueDraft[] }
  | { type: "start"; itemIds: readonly string[] }
  | { type: "progress"; itemId: string; loaded: number; total: number }
  | { type: "success"; itemId: string; result: unknown }
  | { type: "failed"; itemId: string; error: UploadRequestBusinessError }
  | { type: "cancel"; itemId: string }
  | { type: "retry"; itemId: string }
  | { type: "cancel-all" }
  | { type: "remove"; itemId: string };

export type UploadRequestHandler = (options: {
  albumId: string;
  itemId: string;
  file: File;
  signal: AbortSignal;
  onProgress: (progress: UploadQueueProgress) => void;
}) => Promise<UploadRequestResult>;

export type CreateUploadQueueControllerOptions = {
  albumId: string;
  maxConcurrency?: number;
  requestUpload?: UploadRequestHandler;
  createObjectURL?: (file: File) => string;
  revokeObjectURL?: (url: string) => void;
  onBatchComplete?: () => void;
};

export type UploadQueueController = {
  getState: () => UploadQueueState;
  enqueueFiles: (files: readonly File[]) => string[];
  retry: (itemIds: readonly string[]) => string[];
  cancelAll: () => void;
  remove: (itemId: string) => void;
  dispose: () => void;
};

const DEFAULT_MAX_CONCURRENT_UPLOADS = 3;
const TERMINAL_STATUSES: ReadonlySet<UploadQueueStatus> = new Set(["success", "failed", "cancelled"]);

function buildFileKey(file: File) {
  return [file.name, file.size, file.lastModified, file.type].join("|");
}

function cloneItem(item: UploadQueueItem): UploadQueueItem {
  return {
    ...item,
    progress: { ...item.progress },
    result: item.result ?? null,
    error: item.error ? { ...item.error } : null,
  };
}

function cloneState(state: UploadQueueState): UploadQueueState {
  return {
    items: state.items.map((item) => cloneItem(item)),
    activeCount: state.activeCount,
    completedCount: state.completedCount,
    queuedCount: state.queuedCount,
  };
}

function createCounts(items: readonly UploadQueueItem[]) {
  let activeCount = 0;
  let completedCount = 0;
  let queuedCount = 0;

  for (const item of items) {
    if (item.status === "uploading") {
      activeCount += 1;
    } else if (item.status === "queued") {
      queuedCount += 1;
    } else {
      completedCount += 1;
    }
  }

  return { activeCount, completedCount, queuedCount };
}

function applyCounts(state: UploadQueueState): UploadQueueState {
  return {
    ...state,
    ...createCounts(state.items),
  };
}

export function createInitialState(): UploadQueueState {
  return {
    items: [],
    activeCount: 0,
    completedCount: 0,
    queuedCount: 0,
  };
}

export function fingerprintUploadFile(file: File) {
  return buildFileKey(file);
}

export function createUploadQueueDraftItem(
  file: File,
  options: { id: string; previewUrl: string | null }
): UploadQueueItem {
  return {
    id: options.id,
    albumId: "",
    file,
    fileKey: buildFileKey(file),
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: options.previewUrl,
    status: "queued",
    progress: { loaded: 0, total: 0 },
    result: null,
    error: null,
  };
}

function createQueuedItem({
  id,
  albumId,
  file,
  previewUrl,
}: {
  id?: string;
  albumId: string;
  file: File;
  previewUrl: string | null;
}): UploadQueueDraft {
  return {
    id: id ?? buildFileKey(file),
    albumId,
    file,
    fileKey: buildFileKey(file),
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl,
    status: "queued",
    progress: { loaded: 0, total: 0 },
  };
}

function updateItem(
  state: UploadQueueState,
  itemId: string,
  updater: (item: UploadQueueItem) => UploadQueueItem
): UploadQueueState {
  let changed = false;
  const items = state.items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    changed = true;
    return updater(cloneItem(item));
  });

  return changed ? applyCounts({ ...state, items }) : state;
}

function appendItems(state: UploadQueueState, items: readonly UploadQueueDraft[]): UploadQueueState {
  const seen = new Set(state.items.map((item) => item.fileKey));
  const nextItems = [...state.items];

  for (const item of items) {
    if (seen.has(item.fileKey)) {
      continue;
    }

    seen.add(item.fileKey);
    nextItems.push(
      cloneItem({
        id: item.id ?? buildFileKey(item.file),
        albumId: item.albumId,
        file: item.file,
        fileKey: item.fileKey,
        name: item.name,
        size: item.size,
        type: item.type,
        previewUrl: item.previewUrl,
        status: "queued",
        progress: { loaded: 0, total: 0 },
        result: null,
        error: null,
      })
    );
  }

  return nextItems.length === state.items.length ? state : applyCounts({ ...state, items: nextItems });
}

export function uploadQueueReducer(state: UploadQueueState = createInitialState(), action: UploadQueueReducerAction): UploadQueueState {
  switch (action.type) {
    case "enqueue":
      return appendItems(state, action.items);
    case "start": {
      let nextState = state;
      for (const itemId of action.itemIds) {
        nextState = updateItem(nextState, itemId, (item) =>
          item.status === "queued" ? { ...item, status: "uploading" } : item
        );
      }
      return nextState;
    }
    case "progress":
      return updateItem(state, action.itemId, (item) =>
        item.status === "uploading"
          ? {
              ...item,
              progress: { loaded: action.loaded, total: action.total },
            }
          : item
      );
    case "success":
      return updateItem(state, action.itemId, (item) =>
        item.status === "uploading"
          ? {
              ...item,
              status: "success",
              result: action.result,
              error: null,
            }
          : item
      );
    case "failed":
      return updateItem(state, action.itemId, (item) =>
        item.status === "uploading"
          ? {
              ...item,
              status: "failed",
              error: action.error,
            }
          : item
      );
    case "cancel":
      return updateItem(state, action.itemId, (item) =>
        item.status === "cancelled"
          ? item
          : {
              ...item,
              status: "cancelled",
            }
      );
    case "retry":
      return updateItem(state, action.itemId, (item) =>
        item.status === "failed" || item.status === "cancelled"
          ? {
              ...item,
              status: "queued",
              progress: { loaded: 0, total: 0 },
              result: null,
              error: null,
            }
          : item
      );
    case "cancel-all":
      return applyCounts({
        ...state,
        items: state.items.map((item) =>
          item.status === "queued" || item.status === "uploading"
            ? {
                ...item,
                status: "cancelled",
              }
            : item
        ),
      });
    case "remove":
      return applyCounts({
        ...state,
        items: state.items.filter((item) => item.id !== action.itemId).map((item) => cloneItem(item)),
      });
    default:
      return state;
  }
}

function createBusinessError(message: string): UploadRequestBusinessError {
  return {
    kind: "business-error",
    status: 0,
    code: "UPLOAD_FAILED",
    error: message,
  };
}

export function createUploadQueueController({
  albumId,
  maxConcurrency = DEFAULT_MAX_CONCURRENT_UPLOADS,
  requestUpload = ({ albumId: targetAlbumId, file, signal, onProgress }) =>
    uploadFile({
      albumId: targetAlbumId,
      file,
      signal,
      onProgress,
    }),
  createObjectURL,
  revokeObjectURL,
  onBatchComplete,
}: CreateUploadQueueControllerOptions): UploadQueueController {
  let state = createInitialState();
  let nextId = 1;
  let disposed = false;
  const activeRequests = new Map<string, AbortController>();
  const previewUrls = new Map<string, string>();
  let batchCompletionPending = false;

  const syncState = (nextState: UploadQueueState) => {
    state = nextState;
    if (state.items.some((item) => item.status === "queued" || item.status === "uploading")) {
      batchCompletionPending = true;
    }
  };

  const maybeCompleteBatch = () => {
    if (!batchCompletionPending) {
      return;
    }

    if (state.queuedCount > 0 || state.activeCount > 0 || activeRequests.size > 0) {
      return;
    }

    batchCompletionPending = false;
    onBatchComplete?.();
  };

  const settleItem = (itemId: string, result: UploadRequestResult) => {
    if (disposed) {
      activeRequests.delete(itemId);
      return;
    }

    const currentItem = state.items.find((item) => item.id === itemId);
    activeRequests.delete(itemId);

    if (!currentItem || currentItem.status !== "uploading") {
      maybePump();
      maybeCompleteBatch();
      return;
    }

    if (result.kind === "success") {
      syncState(
        uploadQueueReducer(state, {
          type: "success",
          itemId,
          result: result.data,
        })
      );
    } else if (result.kind === "business-error") {
      syncState(
        uploadQueueReducer(state, {
          type: "failed",
          itemId,
          error: result,
        })
      );
    } else {
      syncState(uploadQueueReducer(state, { type: "cancel", itemId }));
    }

    maybePump();
    maybeCompleteBatch();
  };

  const maybePump = () => {
    if (disposed) {
      return;
    }

    while (activeRequests.size < maxConcurrency) {
      const nextItem = state.items.find((item) => item.status === "queued" && !activeRequests.has(item.id));
      if (!nextItem) {
        break;
      }

      const controller = new AbortController();
      activeRequests.set(nextItem.id, controller);
      syncState(uploadQueueReducer(state, { type: "start", itemIds: [nextItem.id] }));

      void Promise.resolve(
        requestUpload({
          albumId,
          itemId: nextItem.id,
          file: nextItem.file,
          signal: controller.signal,
          onProgress: (progress) => {
            if (disposed) {
              return;
            }

            syncState(
              uploadQueueReducer(state, {
                type: "progress",
                itemId: nextItem.id,
                loaded: progress.loaded,
                total: progress.total,
              })
            );
          },
        })
      )
        .then((result) => settleItem(nextItem.id, result))
        .catch(() => {
          settleItem(nextItem.id, createBusinessError("上传失败"));
        });
    }
  };

  const enqueueFiles = (files: readonly File[]) => {
    if (disposed) {
      return [];
    }

    const existingKeys = new Set(state.items.map((item) => item.fileKey));
    const createdItems: UploadQueueDraft[] = [];
    const ids: string[] = [];

    for (const file of files) {
      const fileKey = buildFileKey(file);
      if (existingKeys.has(fileKey)) {
        continue;
      }

      existingKeys.add(fileKey);
      const id = `upload-${nextId++}`;
      const previewUrl = createObjectURL ? createObjectURL(file) : null;
      if (previewUrl) {
        previewUrls.set(id, previewUrl);
      }

      createdItems.push(createQueuedItem({ id, albumId, file, previewUrl }));
      ids.push(id);
    }

    if (createdItems.length === 0) {
      return [];
    }

    syncState(uploadQueueReducer(state, { type: "enqueue", items: createdItems }));
    maybePump();
    return ids;
  };

  const retry = (itemIds: readonly string[]) => {
    if (disposed) {
      return [];
    }

    const retriableIds = itemIds.filter((itemId) => {
      const item = state.items.find((currentItem) => currentItem.id === itemId);
      return item?.status === "failed" || item?.status === "cancelled";
    });

    if (retriableIds.length === 0) {
      return [];
    }

    syncState(
      retriableIds.reduce(
        (currentState, itemId) => uploadQueueReducer(currentState, { type: "retry", itemId }),
        state
      )
    );
    return retriableIds;
  };

  const cancelAll = () => {
    if (disposed) {
      return;
    }

    for (const request of activeRequests.values()) {
      request.abort();
    }

    syncState(uploadQueueReducer(state, { type: "cancel-all" }));
    maybeCompleteBatch();
  };

  const remove = (itemId: string) => {
    if (disposed) {
      return;
    }

    activeRequests.get(itemId)?.abort();
    activeRequests.delete(itemId);

    const previewUrl = previewUrls.get(itemId);
    if (previewUrl) {
      previewUrls.delete(itemId);
      revokeObjectURL?.(previewUrl);
    }

    syncState(uploadQueueReducer(state, { type: "remove", itemId }));
    maybePump();
    maybeCompleteBatch();
  };

  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;

    for (const request of activeRequests.values()) {
      request.abort();
    }
    activeRequests.clear();

    const urls = new Set(previewUrls.values());
    for (const url of urls) {
      revokeObjectURL?.(url);
    }

    previewUrls.clear();
    state = createInitialState();
    batchCompletionPending = false;
  };

  const getState = () => cloneState(state);

  return {
    getState,
    enqueueFiles,
    retry,
    cancelAll,
    remove,
    dispose,
  };
}

export const createUploadQueueScheduler = createUploadQueueController;
