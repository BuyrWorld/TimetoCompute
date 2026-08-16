import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { SupplyChainStage } from '../../data/content-model';
import { ResponsiveCutout } from './ResponsiveCutout';

export function HexStageNode({ stage }: { stage: SupplyChainStage }) {
  const tone = {
    lime: '#c7ff00',
    cyan: '#39e7ff',
    amber: '#ffb000',
    neutral: '#c7cfd3',
  }[stage.tone];

  return (
    <Link href={stage.href} className="t2c-hex-node" style={{ '--node-tone': tone } as CSSProperties}>
      <span className="t2c-hex-node__visual">
        <ResponsiveCutout asset={stage.asset} decorative />
      </span>
      <strong>{stage.name}</strong>
      <span className="t2c-plain-language">({stage.simpleDefinition})</span>
      <span aria-hidden="true">WHAT IS THIS? →</span>
    </Link>
  );
}

