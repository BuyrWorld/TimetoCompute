/**
 * The AI supply chain, from atoms to revenue.
 *
 * THE HONEST PART, and the reason this file reads the way it does:
 *
 * T2C tracks the DELIVERY end of the chain. It holds sourced records for AI
 * infrastructure operators, their sites, contracts and gates. It holds nothing
 * at all about materials, wafers, chips, HBM or photonics — no suppliers, no
 * relationships, no qualification, no shipments. Not thin data: none.
 *
 * So the chain declares all seven stages, because the seven stages are the
 * product's argument, and marks four of them `tracked: false` with what would be
 * needed to track them. An untracked stage renders as an explicit gap, never as
 * an illustration standing in for evidence. A reader can see exactly how much of
 * the chain T2C can currently stand behind, which is more useful — and far more
 * defensible — than seven nodes that look equally authoritative.
 *
 * Counts on tracked stages are computed from the records, never written here.
 */
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS } from '../../data/projects.js';
import { getMeasure, isKnown } from './compute.js';
import { path as projectPath } from './sites.js';
import { STAGE_BY_ID } from '../../data/explainers.js';

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
 *   DOES T2C TRACK IT?  Separately: no. There is no supplier, order or shipment
 *                   record on file for any upstream stage.
 *
 * Collapsing these into one "not tracked" state made the chain read as though
 * the upstream might not have occurred, which is false. Each stage now carries
 * both, and the interface says both.
 */
export const STAGES = [
  {
    id: 'materials', label: 'Materials', icon: 'materials', asset: 'stage-materials',
    frame: 'amber', tracked: false,
    plain: 'Copper, substrates, rare earths and steel are mined and refined into the components ' +
      'everything downstream is built from.',
    role: 'Miners and refiners sell to component makers.',
    needs: 'Supplier records with lead times and order status, sourced to primary disclosure.'
  },
  {
    id: 'wafers', label: 'Wafers', icon: 'wafer', asset: 'stage-wafer',
    frame: 'neutral', tracked: false,
    plain: 'A foundry grows silicon ingots, slices them into wafers and prints circuits onto them, ' +
      'before they are cut into individual dies.',
    role: 'Foundries sell fabrication capacity to chip designers.',
    needs: 'Foundry capacity and allocation records tied to a named product generation.'
  },
  {
    id: 'chips', label: 'Chips + HBM', icon: 'chip', asset: 'stage-chips-hbm',
    frame: 'neutral', tracked: false,
    plain: 'Dies are packaged with high-bandwidth memory stacked beside them, then assembled into ' +
      'accelerator boards. This is usually the headline bottleneck.',
    role: 'Chip designers and memory makers sell accelerators to server builders.',
    needs: 'Qualification, volume-order and shipment records per supplier and generation.'
  },
  {
    id: 'photonics', label: 'Photonics', icon: 'photonics', asset: 'stage-photonics',
    frame: 'cyan', tracked: false,
    plain: 'Lasers and optical transceivers move data between racks fast enough that thousands of ' +
      'accelerators behave as one machine.',
    role: 'Optics makers sell transceivers to network and server builders.',
    needs: 'Transceiver order and shipment records, and the cluster bandwidth they serve.'
  },
  {
    id: 'factory', label: 'AI Factory', icon: 'factory', asset: 'stage-ai-factory',
    frame: 'lime', tracked: true,
    plain: 'An operator secures power, builds the halls, energises them and installs the equipment. ' +
      'This takes years and is where most announced capacity stalls.',
    role: 'Operators sell capacity to the companies training and running models.',
    needs: null
  },
  {
    id: 'accepted', label: 'Accepted', icon: 'accepted', asset: 'stage-accepted',
    frame: 'lime', tracked: true,
    plain: 'The customer tests the delivered capacity and formally accepts it under the contract. ' +
      'Acceptance is the milestone that normally starts the revenue clock.',
    role: 'The customer signs off; the operator has delivered.',
    needs: null
  },
  {
    id: 'revenue', label: 'Revenue', icon: 'revenue', asset: 'stage-revenue',
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

  const counts = {
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
    const ex = STAGE_BY_ID[s.id];
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
