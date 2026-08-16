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

/**
 * Frame colour carries meaning, per the pack: cyan for photonics, lime for
 * completed/revenue, amber for a bottleneck or an untracked gap, neutral
 * otherwise. It is never the only signal — every stage also states its status
 * in words.
 */
export const STAGES = [
  {
    id: 'materials', label: 'Materials', icon: 'materials', asset: 'stage-materials',
    frame: 'amber', tracked: false,
    plain: 'The raw inputs — copper, substrates, rare earths — that everything downstream is built from.',
    needs: 'Supplier records with lead times and order status, sourced to primary disclosure.'
  },
  {
    id: 'wafers', label: 'Wafers', icon: 'wafer', asset: 'stage-wafer',
    frame: 'neutral', tracked: false,
    plain: 'Silicon wafers fabricated at a foundry, before they are cut and packaged into chips.',
    needs: 'Foundry capacity and allocation records tied to a named product generation.'
  },
  {
    id: 'chips', label: 'Chips + HBM', icon: 'chip', asset: 'stage-chips-hbm',
    frame: 'neutral', tracked: false,
    plain: 'Accelerators and the high-bandwidth memory stacked beside them. Usually the headline bottleneck.',
    needs: 'Qualification, volume-order and shipment records per supplier and generation.'
  },
  {
    id: 'photonics', label: 'Photonics', icon: 'photonics', asset: 'stage-photonics',
    frame: 'cyan', tracked: false,
    plain: 'Optical transceivers and the fabric that moves data between racks fast enough to matter.',
    needs: 'Transceiver order and shipment records, and the cluster bandwidth they serve.'
  },
  {
    id: 'factory', label: 'AI Factory', icon: 'factory', asset: 'stage-ai-factory',
    frame: 'lime', tracked: true,
    plain: 'The data centre itself: power secured, built, energised and handed to a customer.',
    needs: null
  },
  {
    id: 'accepted', label: 'Accepted', icon: 'accepted', asset: 'stage-accepted',
    frame: 'lime', tracked: true,
    plain: 'Capacity the customer has formally accepted under its contract.',
    needs: null
  },
  {
    id: 'revenue', label: 'Revenue', icon: 'revenue', asset: 'stage-revenue',
    frame: 'lime', tracked: true,
    plain: 'Capacity the operator has disclosed is billing. The end of the chain.',
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

  return STAGES.map(s => ({
    ...s,
    count: s.tracked ? counts[s.id] : { primary: 'Not tracked', secondary: 'No sourced records yet' },
    href: s.tracked ? stageHref(s.id) : null
  }));
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
