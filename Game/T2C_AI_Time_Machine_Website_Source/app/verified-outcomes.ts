export interface VerifiedOutcome {
  returnRatio: number;
  benchmarkReturnRatio: number;
  entrySession: string;
  exitSession: string;
  methodology: string;
  provider: string;
  verifiedAt: string;
}

/**
 * Production integration boundary.
 *
 * Populate only from TimeToCompute's licensed adjusted-close source after the
 * entry/exit sessions and basket maths have passed independent editorial review.
 * The UI deliberately fails closed when an event/choice is absent.
 */
export const VERIFIED_OUTCOMES: Readonly<
  Record<string, Readonly<Record<string, VerifiedOutcome>>>
> = {};
