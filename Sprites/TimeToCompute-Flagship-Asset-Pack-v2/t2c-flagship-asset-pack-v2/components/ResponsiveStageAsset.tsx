import type { CSSProperties } from "react";

export type StageAssetName =
  | "materials" | "wafer" | "chips-hbm" | "photonics"
  | "ai-factory" | "accepted" | "revenue" | "server-rack" | "power-cooling";

type Props = {
  name: StageAssetName;
  alt: string;
  className?: string;
  sizes?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  style?: CSSProperties;
};

const base = "/assets/t2c/responsive";

export function ResponsiveStageAsset({
  name,
  alt,
  className,
  sizes = "(max-width: 640px) 128px, 180px",
  loading = "lazy",
  fetchPriority = "auto",
  style,
}: Props) {
  return (
    <picture className={className}>
      <source
        type="image/webp"
        srcSet={`${base}/stage-${name}-192.webp 192w, ${base}/stage-${name}-384.webp 384w, ${base}/stage-${name}-768.webp 768w`}
        sizes={sizes}
      />
      <img
        src={`${base}/stage-${name}-1280.png`}
        alt={alt}
        width={1280}
        height={1280}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "contain", ...style }}
      />
    </picture>
  );
}
