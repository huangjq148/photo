export type MediaDeleteScope = "album" | "trash";

export type MediaDeleteActionKind =
  | "removeFromAlbum"
  | "moveToTrash"
  | "restoreFromTrash"
  | "permanentDelete";

export type MediaDeleteAction = {
  kind: MediaDeleteActionKind;
  label: string;
  requiresConfirmation: boolean;
  danger?: boolean;
};

export function getMediaDeleteActions(context: {
  scope: MediaDeleteScope;
  albumIsDefault: boolean;
  isOwnMedia: boolean;
}): MediaDeleteAction[] {
  if (context.scope === "trash") {
    return [
      {
        kind: "restoreFromTrash",
        label: "恢复",
        requiresConfirmation: false,
      },
      {
        kind: "permanentDelete",
        label: "永久删除",
        requiresConfirmation: true,
        danger: true,
      },
    ];
  }

  if (context.albumIsDefault) {
    return [
      {
        kind: "moveToTrash",
        label: "移入回收站",
        requiresConfirmation: false,
        danger: true,
      },
    ];
  }

  if (context.isOwnMedia) {
    return [
      {
        kind: "removeFromAlbum",
        label: "移出相册",
        requiresConfirmation: false,
      },
      {
        kind: "moveToTrash",
        label: "移入回收站",
        requiresConfirmation: false,
        danger: true,
      },
    ];
  }

  return [
    {
      kind: "removeFromAlbum",
      label: "移出相册",
      requiresConfirmation: false,
    },
  ];
}
