import { useEffect, useMemo, useState } from "react";
import { Image, type StyleProp, type ViewStyle } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";

type Props = {
  /** `require()` result for an `.mp4` bundled in the app */
  source: number;
  rowHeight: number;
  /** Match gallery image chrome (e.g. `styles.galleryThumb` from the profile sheet) */
  thumbStyle: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

function sizeForBundledAsset(assetId: number, rowHeight: number) {
  const meta = Image.resolveAssetSource(assetId);
  const iw = meta.width ?? 0;
  const ih = meta.height ?? 0;
  if (iw <= 0 || ih <= 0) {
    return { width: rowHeight * (16 / 9), height: rowHeight };
  }
  return { width: (iw / ih) * rowHeight, height: rowHeight };
}

/**
 * Fixed row height; width from asset metadata when available, otherwise from `videoTrack` after load, else 16:9.
 */
export function GalleryVideoCell({
  source,
  rowHeight,
  thumbStyle,
  accessibilityLabel,
}: Props) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
  });

  const initialSize = useMemo(
    () => sizeForBundledAsset(source, rowHeight),
    [source, rowHeight],
  );

  const [size, setSize] = useState(initialSize);

  useEffect(() => {
    setSize(initialSize);
  }, [initialSize]);

  /** RN often omits video dimensions in `resolveAssetSource` — use native video track size when ready */
  useEffect(() => {
    const metaW = Image.resolveAssetSource(source).width ?? 0;
    if (metaW > 0) return;

    const id = setInterval(() => {
      const vt = player.videoTrack;
      if (vt?.size?.width && vt?.size?.height) {
        setSize({
          width: (vt.size.width / vt.size.height) * rowHeight,
          height: rowHeight,
        });
        clearInterval(id);
      }
    }, 64);
    const done = setTimeout(() => clearInterval(id), 8000);
    return () => {
      clearInterval(id);
      clearTimeout(done);
    };
  }, [player, source, rowHeight]);

  return (
    <VideoView
      player={player}
      style={[thumbStyle, { width: size.width, height: size.height }]}
      nativeControls
      contentFit="cover"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
