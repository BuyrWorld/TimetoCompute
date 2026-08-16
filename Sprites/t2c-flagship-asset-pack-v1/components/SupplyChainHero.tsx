import { useState } from "react";
import { StageNode } from "./StageNode";

const stages = [
  ["materials", "MATERIALS", "Critical inputs", "amber"],
  ["wafer", "WAFERS", "Substrates", "amber"],
  ["chips-hbm", "CHIPS + HBM", "Packaged", "lime"],
  ["photonics", "PHOTONICS", "Volume ramp", "cyan"],
  ["ai-factory", "AI FACTORY", "Building", "neutral"],
  ["accepted", "ACCEPTED", "Verified", "neutral"],
  ["revenue", "REVENUE", "Recognised", "lime"],
] as const;

export function SupplyChainHero() {
  const [selected, setSelected] = useState("photonics");
  return (
    <section className="t2c-chain" aria-label="AI supply-chain stages">
      <div className="t2c-chain-grid">
        {stages.map(([asset, label, state, tone]) => (
          <StageNode key={asset} asset={asset} label={label} state={state} tone={tone}
            selected={selected === asset} onSelect={() => setSelected(asset)} />
        ))}
      </div>
    </section>
  );
}
