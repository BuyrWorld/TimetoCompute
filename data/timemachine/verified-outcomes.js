/**
 * Verified historical outcomes for the AI Time Machine.
 *
 * PORTED VERBATIM IN BEHAVIOUR from the reference `app/verified-outcomes.ts`,
 * including the empty registry, because the empty registry IS the feature.
 *
 * THE FAIL-CLOSED RULE, which the rest of this site already lives by:
 *
 *   A market result appears only when an adjusted-close figure for the exact
 *   entry and exit sessions has come from a licensed source and passed editorial
 *   review. Until then the outcome screen says "Market result awaiting
 *   verification" and shows nothing else.
 *
 *   It never estimates. It never interpolates between two dates it does have. It
 *   never substitutes an index. It never renders a missing return as 0%, because
 *   a flat line is a claim — that nothing happened — and no such claim has been
 *   evidenced.
 *
 * Everything else in the chapter still works with the registry empty: the
 * decision is recorded, the physical chain is explained, the later evidence
 * opens, the debrief runs and the chapter completes. Only the price is withheld,
 * which is the only part that needs a price.
 *
 * A chapter with no verified outcome also contributes NOTHING to the campaign's
 * running capital — `appliedEvents` stays empty for it — so the recap total is
 * the sum of verified chapters and says so.
 *
 * To populate: add `[eventId][choiceId] = { returnRatio, benchmarkReturnRatio,
 * entrySession, exitSession, methodology, provider, verifiedAt }`. The shape is
 * validated by the build, so a half-filled record fails rather than ships.
 */
export const VERIFIED_OUTCOMES = Object.freeze({});

/** Every field a verified outcome must carry before it may be displayed. */
export const OUTCOME_FIELDS = [
  'returnRatio', 'benchmarkReturnRatio', 'entrySession', 'exitSession',
  'methodology', 'provider', 'verifiedAt'
];

/** The single sentence shown when a price cannot be evidenced. */
export const AWAITING_VERIFICATION = 'Market result awaiting verification';

/**
 * Look up an outcome, returning null rather than a partial record.
 *
 * A record missing any field is treated as absent: half a verification is not a
 * verification, and rendering "+12%" beside a blank provider would look more
 * authoritative than the empty state it replaced.
 */
export function verifiedOutcome(eventId, choiceId) {
  const row = VERIFIED_OUTCOMES[eventId]?.[choiceId];
  if (!row) return null;
  for (const f of OUTCOME_FIELDS) {
    if (row[f] === undefined || row[f] === null) return null;
  }
  if (typeof row.returnRatio !== 'number' || !Number.isFinite(row.returnRatio)) return null;
  return row;
}
