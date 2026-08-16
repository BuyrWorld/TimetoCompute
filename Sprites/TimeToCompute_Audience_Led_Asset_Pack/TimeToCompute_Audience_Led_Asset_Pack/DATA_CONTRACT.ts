export type EvidenceLevel = "confirmed" | "reported" | "estimated" | "not_disclosed";

export type DeliveryGate =
  | "announced"
  | "power_secured"
  | "construction"
  | "energised"
  | "customer_contracted"
  | "customer_accepted"
  | "billing";

export type GateState = "complete" | "current" | "pending" | "unknown" | "not_applicable";

export interface EvidenceRef {
  id: string;
  level: EvidenceLevel;
  documentType: string;
  publisher: string;
  publishedAt?: string | null;
  accessedAt?: string | null;
  url: string;
  excerpt?: string | null;
}

export interface DeliveryGateRecord {
  gate: DeliveryGate;
  state: GateState;
  actualDate?: string | null;
  guidedWindow?: string | null;
  evidence: EvidenceRef[];
}

export interface Measure {
  value: number | null;
  unit: "MW" | "GW" | "USD" | "GBP" | "years";
  basis: "gross_utility" | "critical_it" | "gpu_load" | "contract_value" | "other";
  qualifier: "actual" | "minimum" | "target" | "pipeline" | "potential" | "unknown";
  asOf?: string | null;
  evidence: EvidenceRef[];
}

export interface LeadStory {
  id: string;
  companyId: string;
  projectId?: string | null;
  customerName?: string | null;
  plainEnglishHeadline: string;
  plainEnglishConsequence: string;
  whatHappened: string;
  whyItMatters: string;
  whatChanged: string;
  whatHappensNext: string;
  blockers: string[];
  currentGate: DeliveryGate;
  gates: DeliveryGateRecord[];
  evidence: EvidenceRef[];
}

export interface CatalystSummary {
  id: string;
  companyId: string;
  title: string;
  certainty: "exact" | "guided_window" | "date_unknown";
  date?: string | null;
  window?: string | null;
  evidence: EvidenceRef[];
}

export interface ProjectEditorialCard {
  id: string;
  operatorName: string;
  customerName?: string | null;
  currentGate: DeliveryGate;
  nextGate?: DeliveryGate | null;
  capacity?: Measure | null;
  evidenceLevel: EvidenceLevel;
  imageAssetId:
    | "project-operational-campus"
    | "project-construction-campus"
    | "project-power-community";
}

/**
 * Presentation guardrail: values may be shown side-by-side only when their
 * qualifier, basis, unit and as-of date remain visible. Do not calculate a
 * percentage, difference or funnel conversion unless the underlying research
 * model explicitly marks the measures as comparable.
 */
export interface PromiseRealityPair {
  promise: Measure;
  reality: Measure;
  comparable: boolean;
  caveat: string;
}
