/**
 * The path to billing — the ONE status vocabulary on the site.
 *
 * Every card, page, filter and headline that says how far capacity has got
 * reads its words from here. There used to be four vocabularies for the same
 * idea (this path, compute.js's stage shorts, the lead story's journey and the
 * passport's momentum labels), and a reader met "Switched on", "Energised",
 * "Grid live" and "Invoicing" for two underlying facts.
 *
 * Five stages, all physically sequential. Two were removed:
 *  - `announced`: every tracked site has been announced, so it said nothing.
 *  - `contracted`: a signature is not a delivery step — customers sign before
 *    the concrete is poured — so it broke the left-to-right reading. It is now
 *    a customer tag beside the track (see `customerSigned`), not a stage.
 *
 * Each stage names the real gates that evidence it; a stage with no evidenced
 * gate is not disclosed. `plain` is the one-line meaning used in keys.
 */
export const PATH = [
  { id: 'power', label: 'Power secured', short: 'Power', gates: ['utilityAgreement', 'interconnection'],
    plain: 'The grid connection or power contract is signed.' },
  { id: 'construction', label: 'Under construction', short: 'Building', gates: ['constructionStarted'],
    plain: 'Physical construction is under way on site.' },
  { id: 'energised', label: 'Energised', short: 'Energised', gates: ['utilityEnergised', 'criticalItEnergised'],
    plain: 'The halls have power and the equipment is switched on.' },
  { id: 'acceptance', label: 'Accepted', short: 'Accepted', gates: ['customerAccepted'],
    plain: 'The customer has tested the capacity and formally taken it.' },
  { id: 'billing', label: 'Billing', short: 'Billing', gates: ['revenueCommenced'],
    plain: 'The company has said it is being paid for this capacity.' }
];

export const PATH_BY_ID = Object.fromEntries(PATH.map(s => [s.id, s]));
