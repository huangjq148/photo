export type MediaType = "image" | "video";

export type MediaVariant = "originals" | "previews" | "thumbnails" | "posters" | "playbacks";

export type MediaFileLike = {
  type: string;
  size: number;
};
