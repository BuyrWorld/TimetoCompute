import { ResponsiveStageAsset, type StageAssetName } from "./ResponsiveStageAsset";

type Props = {
  asset: StageAssetName;
  label: string;
  state?: string;
  tone?: "neutral" | "cyan" | "lime" | "amber";
  selected?: boolean;
  onSelect?: () => void;
};

export function StageNode({ asset, label, state, tone = "neutral", selected, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`t2c-node t2c-node--${tone}`}
      aria-pressed={selected}
      aria-label={`Open ${label} stage${state ? `: ${state}` : ""}`}
      onClick={onSelect}
    >
      <span className="t2c-node-frame" aria-hidden="true">
        <ResponsiveStageAsset
          name={asset}
          alt=""
          className={`t2c-node-picture ${asset === "photonics" ? "t2c-photonics-asset" : ""}`}
        />
      </span>
      <span className="t2c-node-label">{label}</span>
      {state && <span className="t2c-node-state">{state}</span>}
    </button>
  );
}
