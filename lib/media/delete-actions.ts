export type MediaDeleteSurface = "album" | "timeline" | "duplicate" | "trash";

export type MediaDeleteActionKind = "removeFromAlbum" | "moveToTrash" | "permanentDelete";

export type MediaDeleteAction = {
  kind: MediaDeleteActionKind;
  label: string;
  confirm: boolean;
  confirmMessage: string | null;
  undo: boolean;
  successMessage: string;
};

export type MediaDeleteActionContext = {
  surface: MediaDeleteSurface;
  isDefaultAlbum?: boolean;
  canTrash?: boolean;
  canRemoveFromAlbum?: boolean;
};

function buildAction(kind: MediaDeleteActionKind): MediaDeleteAction {
  switch (kind) {
    case "removeFromAlbum":
      return {
        kind,
        label: "从相册移除",
        confirm: false,
        confirmMessage: null,
        undo: true,
        successMessage: "已从相册移除",
      };
    case "moveToTrash":
      return {
        kind,
        label: "移入回收站",
        confirm: false,
        confirmMessage: null,
        undo: true,
        successMessage: "已移入回收站",
      };
    case "permanentDelete":
      return {
        kind,
        label: "永久删除",
        confirm: true,
        confirmMessage: "此操作不可撤销，确定永久删除吗？",
        undo: false,
        successMessage: "已永久删除",
      };
  }
}

export function getMediaDeleteActions(context: MediaDeleteActionContext): MediaDeleteAction {
  if (context.surface === "trash") {
    return buildAction("permanentDelete");
  }

  if (context.surface === "timeline" || context.surface === "duplicate") {
    return buildAction("moveToTrash");
  }

  if (context.isDefaultAlbum) {
    return buildAction(context.canTrash === false ? "removeFromAlbum" : "moveToTrash");
  }

  if (context.canRemoveFromAlbum === false && context.canTrash !== false) {
    return buildAction("moveToTrash");
  }

  return buildAction("removeFromAlbum");
}
