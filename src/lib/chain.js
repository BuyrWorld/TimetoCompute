/**
 * The AI supply chain, from atoms to revenue.
 *
 * THE HONEST PART, and the reason this file reads the way it does:
 *
 * T2C tracks the DELIVERY end of the chain: sourced records for AI infrastructure
 * operators, their sites, contracts and gates. It also holds photonics supplier
 * records — seven of them, one a named company-to-company supply agreement.
 *
 * This paragraph used to say T2C held "nothing at all about materials, wafers,
 * chips, HBM or photonics — no suppliers, no relationships, no qualification, no
 * shipments. Not thin data: none." That was true when it was written and stopped
 * being true when data/suppliers.js arrived. The homepage went on marking
 * photonics `tracked: false` and rendering it as an empty gap while seven sourced
 * supplier records sat behind it. Understating the evidence is a smaller sin than
 * overstating it, but it is the same failure: the page stopped matching the data.
 *
 * `tracked` is therefore DERIVED for photonics rather than declared, so it cannot
 * drift from the records a second time.
 *
 * The chain declares all seven stages, because the seven stages are the product's
 * argument, and marks the ones with no supplier record `tracked: false` with what
 * would be needed to track them. An untracked stage renders as an explicit gap,
 * never as an illustration standing in for evidence.
 *
 * Counts on tracked stages are computed from the records, never written here.
 */
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS } from '../../data/projects.js';
import { getMeasure, isKnown } from './compute.js';
import { path as projectPath } from './sites.js';
import { EXPLAINER_BY_STAGE } from '../../data/explainers.js';
import { PHOTONICS_SUPPLIERS, EVIDENCE_GRADES } from '../../data/suppliers.js';
import { CHAIN_VIEW } from '../../data/chainstages.js';

/**
 * Frame colour carries meaning, per the pack: cyan for photonics, lime for
 * completed/revenue, amber for a bottleneck or an untracked gap, neutral
 * otherwise. It is never the only signal — every stage also states its status
 * in words.
 */
/* The homepage compression now lives in the data layer with the rest of the
   chain vocabulary; this file computes state over it and nothing more. */
export const STAGES = CHAIN_VIEW;

/** Projects whose path has reached a given stage id. */
const projectsAt = stageId =>
  PROJECTS.filter(p => projectPath(p).some(s => s.id === stageId && s.status === 'complete'));

/**
 * What T2C can currently say about each stage.
 *
 * A tracked stage reports counts derived from the records. An untracked stage
 * reports zero of everything and says what it would take — it never borrows a
 * number from a neighbour to look populated.
 */
export function chainState() {
  const accepted = projectsAt('acceptance');
  const billing = projectsAt('billing');
  const billingCompanies = COMPANIES.filter(c => isKnown(getMeasure(c, 'revenueLiveMw')));

  /* Photonics counts what T2C actually holds: supplier records, and how many of
     those carry a confirmed award rather than a capability or a demonstration.
     The distinction is the same one the supplier table makes, and it is the
     reason the count cannot just be "7 suppliers" — four of the seven are
     capability records, which evidence that a company makes the part and nothing
     about who it sells to. */
  const confirmedOptics = PHOTONICS_SUPPLIERS.filter(s => EVIDENCE_GRADES[s.grade].confirmed);

  const counts = {
    photonics: {
      primary: `${PHOTONICS_SUPPLIERS.length} suppliers`,
      secondary: confirmedOptics.length
        ? `${confirmedOptics.length} with a confirmed award`
        : 'None with a confirmed award'
    },
    factory: {
      primary: `${PROJECTS.length} sites`,
      secondary: `${COMPANIES.length} operators tracked`
    },
    accepted: {
      primary: accepted.length ? `${accepted.length} site${accepted.length === 1 ? '' : 's'}` : 'None yet',
      secondary: accepted.length
        ? 'Formally accepted by a customer'
        : 'No site has been formally accepted'
    },
    revenue: {
      primary: billingCompanies.length
        ? `${billingCompanies.length} operator${billingCompanies.length === 1 ? '' : 's'}`
        : 'None yet',
      secondary: billingCompanies.length
        ? 'Have disclosed billing capacity'
        : 'No operator has disclosed billing'
    }
  };

  /* A stage upstream of the furthest evidenced one certainly happened: capacity
     cannot be billing unless the chips it runs on were made. So `happened` is
     'evidenced' where T2C holds records and 'implied' where a later stage
     proves it — and never 'unknown' upstream of something evidenced. */
  const lastTracked = STAGES.reduce((acc, s, i) => (s.tracked ? i : acc), -1);
  const anchor = lastTracked > -1 ? STAGES[lastTracked] : null;

  return STAGES.map((s, i) => {
    const happened = s.tracked ? 'evidenced' : (i < lastTracked ? 'implied' : 'unknown');
    /* Every stage now has an explainer, so every node in the chain leads
       somewhere real. The explainer owns the plain-English one-liner, so the
       node and the page it opens cannot describe the stage differently. */
    const ex = EXPLAINER_BY_STAGE[s.id];
    return {
      ...s,
      happened,
      explainerHref: ex ? `/explainers/${ex.slug}/` : null,
      simple: ex ? ex.simple : s.plain,
      impliedBy: happened === 'implied' ? anchor.label : null,
      count: s.tracked
        ? counts[s.id]
        : {
          primary: happened === 'implied' ? 'Happened' : 'Unknown',
          secondary: happened === 'implied'
            ? 'Not tracked by T2C'
            : 'No sourced records yet'
        },
      href: s.tracked ? stageHref(s.id) : null
    };
  });
}

/** Where a tracked stage leads. An untracked stage leads nowhere, by design. */
function stageHref(id) {
  if (id === 'photonics') return '/chain-mapping/';
  if (id === 'factory') return '/sites/';
  if (id === 'accepted') return '/sites/?stage=acceptance';
  if (id === 'revenue') return '/sites/?stage=billing';
  return null;
}

/** How much of the chain is currently evidenced, for the honest coverage line. */
export function chainCoverage() {
  const tracked = STAGES.filter(s => s.tracked).length;
  return {
    tracked,
    total: STAGES.length,
    untracked: STAGES.filter(s => !s.tracked).map(s => s.label)
  };
}
