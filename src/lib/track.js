/**
 * The Track page reads the ledger. It does not keep a second copy of a gate.
 *
 * Horizon 1 and Horizons 2–4 are halls on the Childress campus. Land and grid
 * access are campus facts. A hall's own construction and acceptance are not.
 */

export const TRACK_POINTS = [
  { id: "land", name: "Land", gateId: "siteControl", operator: true },
  { id: "permits", name: "Permits", gateId: "buildingPermits", operator: true },
  { id: "grid", name: "Grid access", gateId: "interconnection", operator: true },
  { id: "gear", name: "Transformers and switchgear", gateId: "longLeadOrdered", operator: true },
  { id: "noise", name: "Noise", operator: true },
  { id: "air", name: "Clean air", operator: true },
  { id: "supply", name: "Supply chain", operator: true },
  { id: "residential", name: "Residential priority", operator: true },
  { id: "community", name: "Community political power", operator: true },
  { id: "fuel", name: "Fuel security", operator: false },
  { id: "casting", name: "Casting machines", operator: false },
  { id: "lathes", name: "Large lathes", operator: false },
];

const CHILDRESS = new Set(["iren-childress", "iren-horizon-1", "iren-horizons-2-4"]);

const GATE_LABEL = {
  complete: "Complete",
  inProgress: "In progress",
  notStarted: "Not started",
  notDisclosed: "Not disclosed",
};

function fromGate(gate) {
  const confidence = gate.confidence === "confirmed"
    ? "Confirmed."
    : gate.confidence === "reported"
      ? "Reported, not confirmed."
      : "";
  return {
    label: GATE_LABEL[gate.status] || gate.status,
    tone: gate.status === "complete" && gate.confidence === "confirmed"
      ? "ok"
      : gate.status === "complete" || gate.status === "inProgress"
        ? "warn"
        : "unknown",
    note: [gate.notes, confidence].filter(Boolean).join(" "),
    shared: false,
  };
}

function childressShare(project, pointId) {
  if (!CHILDRESS.has(project.id)) return null;
  if (pointId === "land") {
    return {
      label: "Same campus",
      tone: "ok",
      note: "Childress site control is confirmed. These halls stand on that land.",
      shared: true,
    };
  }
  if (pointId === "grid") {
    if (project.id === "iren-horizons-2-4") {
      return {
        label: "Campus is on the grid",
        tone: "warn",
        note: "Horizon 1’s 50 MW is energised here. A separate interconnect for the remaining 150 MW is not disclosed.",
        shared: true,
      };
    }
    return {
      label: "On the grid",
      tone: "ok",
      note: "Horizon 1 critical IT was energised on 13 Aug 2026. That is this campus.",
      shared: true,
    };
  }
  if (pointId === "permits") {
    if (project.id === "iren-horizons-2-4") {
      return {
        label: "Building on the same campus",
        tone: "warn",
        note: "Construction is reported in progress beside a hall that is already accepted. A named permit is not its own gate.",
        shared: true,
      };
    }
    return {
      label: "Already built here",
      tone: "ok",
      note: "Construction on this campus is confirmed. The ledger does not keep a separate permit.",
      shared: true,
    };
  }
  if (pointId === "noise" || pointId === "air" || pointId === "residential" || pointId === "community") {
    return {
      label: "Same campus, not scored",
      tone: "unknown",
      note: "One campus, so this is not a separate gap for each hall. T2C does not score it.",
      shared: true,
    };
  }
  return null;
}

export function trackRead(project, point) {
  if (!point.operator) {
    return {
      label: "Not the operator",
      tone: "unknown",
      note: "Elon’s list includes this. T2C does not treat it as a site gate.",
      shared: false,
    };
  }
  const own = point.gateId
    ? (project.gates || []).find((gate) => gate.id === point.gateId)
    : null;
  if (own) return fromGate(own);
  const shared = childressShare(project, point.id);
  if (shared) return shared;
  if (!point.gateId) {
    return {
      label: "Not a T2C gate",
      tone: "unknown",
      note: "Elon’s list asks this. The ledger does not score it, so this page does not tick it.",
      shared: false,
    };
  }
  return {
    label: "Not disclosed",
    tone: "unknown",
    note: "No gate on this record. That is not a fail.",
    shared: false,
  };
}
