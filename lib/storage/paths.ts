import { join } from "node:path";

export type StorageLayout = {
  root: string;
  originals: string;
  previews: string;
  thumbnails: string;
};

export function getStorageLayout(root: string): StorageLayout {
  return {
    root,
    originals: join(root, "originals"),
    previews: join(root, "previews"),
    thumbnails: join(root, "thumbnails")
  };
}
