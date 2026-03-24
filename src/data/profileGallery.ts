import type { ImageSourcePropType } from "react-native";
import type { GalleryMediaItem } from "../types/galleryMedia";
import type { Profile } from "../types/profile";

/**
 * Horizontal gallery for the profile detail sheet — **one array per therapist**
 * (`Profile.id`).
 *
 * - **Images**: `{ kind: "image", source: require("...png") }`
 * - **Video**: `{ kind: "video", source: require("...mp4") }` — file must live under `assets/gallery/`
 *
 * Metro needs **static** `require` paths (no dynamic `require`).
 */

/** Alexandra de Castro — profile id `"1"` */
const alexandraGallery: GalleryMediaItem[] = [
  { kind: "image", source: require("../../assets/gallery/alexandra-1.png") },
  { kind: "image", source: require("../../assets/gallery/alexandra-2.png") },
  { kind: "image", source: require("../../assets/gallery/alexandra-3.png") },
  { kind: "video", source: require("../../assets/gallery/alexandra-video-1.mp4") },
];

/** Alex De Basto — profile id `"2"` */
const alexGallery: GalleryMediaItem[] = [
  { kind: "image", source: require("../../assets/profile-2-hero.png") },
  { kind: "image", source: require("../../assets/profile-3-hero.png") },
  { kind: "image", source: require("../../assets/figma-rebrand-node-405-5465.png") },
];

/** Jordan Rivera — profile id `"3"` */
const jordanGallery: GalleryMediaItem[] = [
  { kind: "image", source: require("../../assets/profile-3-hero.png") },
  { kind: "image", source: require("../../assets/figma-rebrand-node-405-5465.png") },
  { kind: "image", source: require("../../assets/profile-2-hero.png") },
];

/**
 * Maps `Profile.id` → that therapist’s gallery media (order = left-to-right in the sheet).
 */
export const galleryMediaByProfileId: Record<string, GalleryMediaItem[]> = {
  "1": alexandraGallery,
  "2": alexGallery,
  "3": jordanGallery,
};

export function getGalleryMediaForProfileId(id: string): GalleryMediaItem[] {
  return galleryMediaByProfileId[id] ?? [];
}

/**
 * Uses `profile.galleryImages` when set (API override, images only); otherwise bundled media from id.
 */
export function getGalleryMediaForProfile(profile: Profile): GalleryMediaItem[] {
  if (profile.galleryImages?.length) {
    return profile.galleryImages.map((source) => ({
      kind: "image" as const,
      source,
    }));
  }
  return getGalleryMediaForProfileId(profile.id);
}

/** @deprecated use `getGalleryMediaForProfileId` */
export function getGalleryImagesForProfileId(
  id: string,
): ImageSourcePropType[] {
  return getGalleryMediaForProfileId(id)
    .filter((item): item is { kind: "image"; source: ImageSourcePropType } => item.kind === "image")
    .map((item) => item.source);
}
