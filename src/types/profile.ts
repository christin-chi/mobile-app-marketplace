import type { ImageSourcePropType } from "react-native";

export type Profile = {
  id: string;
  displayName: string;
  heroImage: ImageSourcePropType;
  /**
   * Optional override for the profile sheet gallery (images only). If omitted, media
   * comes from `getGalleryMediaForProfile(id)` in `src/data/profileGallery.ts`.
   */
  galleryImages?: ImageSourcePropType[];
};
