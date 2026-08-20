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

/**
 * Frame colour carries meaning, per the pack: cyan for photonics, lime for
 * completed/revenue, amber for a bottleneck or an untracked gap, neutral
 * otherwise. It is never the only signal — every stage also states its status
 * in words.
 */
/**
 * Two facts per stage, and they are not the same fact:
 *
 *   DID IT HAPPEN?  A data centre that is billing a customer proves that
 *                   materials were mined, wafers were fabbed, chips were
 *                   packaged and optics were installed. You cannot bill for
 *                   compute that was never built. Every stage upstream of an
 *                   evidenced one therefore certainly happened.
 *
 *   DOES T2C TRACK IT?  Separately, and stage by stage. Photonics has supplier
 *                   records; materials, wafers and chips have none. This line
 *                   used to read "Separately: no" for every upstream stage,
 *                   which stopped being true without anyone noticing.
 *
 * Collapsing these into one "not tracked" state made the chain read as though
 * the upstream might not have occurred, which is false. Each stage now carries
 * both, and the interface says both.
 */
export const STAGES = [
  {
    id: 'materials', label: 'Materials', icon: 'materials', asset: 'stage-materials',
    axis: 'chain', stages: [1],
    frame: 'amber', tracked: false,
    plain: 'Copper, substrates, rare earths and steel are mined and refined into the components ' +
      'everything downstream is built from.',
    role: 'Miners and refiners sell to component makers.',
    needs: 'Supplier records with lead times and order status, sourced to primary disclosure.'
  },
  {
    id: 'wafers', label: 'Wafers', icon: 'wafer', asset: 'stage-wafer',
    axis: 'chain', stages: [2],
    frame: 'neutral', tracked: false,
    plain: 'A foundry grows silicon ingots, slices them into wafers and prints circuits onto them, ' +
      'before they are cut into individual dies.',
    role: 'Foundries sell fabrication capacity to chip designers.',
    needs: 'Foundry capacity and allocation records tied to a named product generation.'
  },
  {
    id: 'chips', label: 'Chips + HBM', icon: 'chip', asset: 'stage-chips-hbm',
    axis: 'chain', stages: [2, 4],
    frame: 'neutral', tracked: false,
    plain: 'Dies are packaged with high-bandwidth memory stacked beside them, then assembled into ' +
      'accelerator boards. This is usually the headline bottleneck.',
    role: 'Chip designers and memory makers sell accelerators to server builders.',
    needs: 'Qualification, volume-order and shipment records per supplier and generation.'
  },
  {
    id: 'photonics', label: 'Photonics', icon: 'photonics', asset: 'stage-photonics',
    axis: 'chain', stages: [3],
    /* Derived, not declared. See the note at the top of this file: this was
       `false` while seven sourced supplier records sat behind it. */
    frame: 'cyan', tracked: PHOTONICS_SUPPLIERS.length > 0,
    plain: 'Lasers and optical transceivers move data between racks fast enough that thousands of ' +
      'accelerators behave as one machine.',
    role: 'Optics makers sell transceivers to network and server builders.',
    needs: null
  },
  {
    id: 'factory', label: 'AI Factory', icon: 'factory', asset: 'stage-ai-factory',
    axis: 'chain', stages: [5, 6, 7, 8],
    frame: 'lime', tracked: true,
    plain: 'An operator secures power, builds the halls, energises them and installs the equipment. ' +
      'This takes years and is where most announced capacity stalls.',
    role: 'Operators sell capacity to the companies training and running models.',
    needs: null
  },
  {
    id: 'accepted', label: 'Accepted', icon: 'accepted', asset: 'stage-accepted',
    axis: 'commercial', stages: [], commercialStage: 'accepted',
    frame: 'lime', tracked: true,
    plain: 'The customer tests the delivered capacity and formally accepts it under the contract. ' +
      'Acceptance is the milestone that normally starts the revenue clock.',
    role: 'The customer signs off; the operator has delivered.',
    needs: null
  },
  {
    id: 'revenue', label: 'Revenue', icon: 'revenue', asset: 'stage-revenue',
    axis: 'commercial', stages: [], commercialStage: 'recognised',
    frame: 'lime', tracked: true,
    plain: 'Billing begins once the contract\'s conditions are met and the operator discloses it. ' +
      'Acceptance and billing are different stages and T2C never assumes one proves the other.',
    role: 'The operator is finally paid for the megawatts.',
    needs: null
  }
];

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
