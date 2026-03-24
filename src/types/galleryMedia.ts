import type { ImageSourcePropType } from "react-native";

export type GalleryImageItem = {
  kind: "image";
  source: ImageSourcePropType;
};

export type GalleryVideoItem = {
  kind: "video";
  /** Bundle with `require("../../assets/gallery/clip.mp4")` */
  source: number;
};

export type GalleryMediaItem = GalleryImageItem | GalleryVideoItem;
