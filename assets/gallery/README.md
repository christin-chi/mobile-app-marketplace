# Therapist gallery (images + video)

Add files here, then register them in `src/data/profileGallery.ts` with **static** `require(...)` paths (Metro cannot scan this folder at runtime).

## Why did my MP4 end up in the Simulator’s Photos app?

**Dragging a file onto the iOS Simulator** (or using certain share actions) often **imports media into the Simulator’s Photos library**, not into your React Native project. That copy is **only inside the Simulator** — it is **not** bundled with your app.

To ship a video in the app:

1. In **Finder**, copy your `.mp4` into this folder: `assets/gallery/` (e.g. `alexandra-video.mp4`).
2. In **`profileGallery.ts`**, add a gallery item:
   ```ts
   { kind: "video", source: require("../../assets/gallery/alexandra-video.mp4") },
   ```
3. Rebuild / reload the app. The video is **bundled** and played with **`expo-video`** in the profile gallery — **not** from the Photos app.

## Images

- `alexandra-1.png` … `alexandra-3.png` — Alexandra de Castro (profile id `1`)
- `alexandra-video-1.mp4` — same profile, fourth item in the horizontal gallery

**Suggested naming for more therapists**

- `alex-1.png`, `alex-2.png` — Alex De Basto (`2`)
- `jordan-1.png`, … — Jordan Rivera (`3`)
- Or `profile-{id}-{slot}.png`

## Video

- Use `.mp4` for broad compatibility.
- **Copy files in Finder** (or `cp` in Terminal) into `assets/gallery/` — don’t drop them on the Simulator; that only adds to Photos.

`alexandra-video-1.mp4` is registered in `profileGallery.ts` for profile `1`.
