import type { CSSProperties } from 'react';
import type { ResponsiveAsset } from '../../data/content-model';

type Props = {
  asset: ResponsiveAsset;
  decorative?: boolean;
  priority?: boolean;
  className?: string;
};

export function ResponsiveCutout({ asset, decorative = false, priority = false, className = '' }: Props) {
  const style = {
    '--asset-scale': asset.optics?.scale ?? 1,
    '--asset-x': asset.optics?.x ?? '0%',
    '--asset-y': asset.optics?.y ?? '0%',
  } as CSSProperties;

  return (
    <span className={`t2c-cutout-stage ${className}`} style={style}>
      <picture>
        <source
          type="image/webp"
          srcSet={`${asset.basePath}-192.webp 192w, ${asset.basePath}-384.webp 384w, ${asset.basePath}-768.webp 768w`}
          sizes={`(max-width: 640px) 132px, (max-width: 1100px) 192px, ${asset.maxCssWidth}px`}
        />
        <img
          src={asset.fallbackPath}
          width={asset.intrinsicWidth}
          height={asset.intrinsicHeight}
          alt={decorative ? '' : asset.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </picture>
    </span>
  );
}

