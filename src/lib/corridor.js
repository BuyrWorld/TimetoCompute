/**
 * Supply-chain corridors and the relationships inside them.
 *
 * The brief names four corridors. T2C holds sourced records for exactly one —
 * AI-factory delivery — so that one is built from real contracts and the other
 * three are declared with what they would need. A corridor with no records is a
 * labelled gap, never a graph of invented edges.
 *
 * RELATIONSHIP TYPES, per the brief's contract:
 *   confirmed — the company itself disclosed the relationship, in a document
 *               T2C links. Every edge T2C currently holds is one of these.
 *   ecosystem — a partner or platform relationship, not a production award.
 *   inferred  — potential or indirect exposure, never a claim of supply.
 *
 * T2C holds no ecosystem or inferred edges today. The legend still names all
 * three, because a reader must be able to tell them apart the moment one
 * appears — and because their absence is itself worth stating.
 */
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS, CONTRACTS } from '../../data/projects.js';
import { SOURCE_BY_ID } from '../../data/sources.js';
import { path as projectPath } from './sites.js';

export const RELATIONSHIP_TYPES = [
  {
    id: 'confirmed', label: 'Confirmed', line: 'solid',
    definition: 'The company disclosed this relationship in a primary document, and that document is linked.'
  },
  {
    id: 'ecosystem', label: 'Ecosystem', line: 'dotted',
    definition: 'A partner or platform relationship. It is not evidence of a production award or a supply agreement.'
  },
  {
    id: 'inferred', label: 'Inferred exposure', line: 'dashed',
    definition: 'Potential or indirect exposure only. Never a claim that one company supplies another.'
  }
];

export const CORRIDORS = [
  {
    id: 'ai-factory', label: 'AI-factory delivery', tracked: true,
    plain: 'Operators building the data centres, the sites they are building, and the customers who have signed for the capacity.'
  },
  {
    id: 'photonics', label: 'Photonics', tracked: false,
    plain: 'Optical transceivers and the interconnect fabric between racks.',
    needs: 'Transceiver order, qualification and shipment records tied to a named product generation.'
  },
  {
    id: 'hbm', label: 'HBM + advanced packaging', tracked: false,
    plain: 'High-bandwidth memory and the packaging that binds it to the accelerator.',
    needs: 'Supplier qualification and volume-order records per memory generation.'
  },
  {
    id: 'power-cooling', label: 'Power + cooling', tracked: false,
    plain: 'Grid connections, transformers, switchgear and the cooling plant that make a hall usable.',
    needs: 'Equipment supplier records per site. T2C tracks the utility GATES today, but not who supplied the plant.'
  }
];

const COMPANY_BY_ID = Object.fromEntries(COMPANIES.map(c => [c.id, c]));

/**
 * The AI-factory corridor as a three-column graph: operator → site → customer.
 *
 * An edge exists only where a company named the link itself. A contract that
 * discloses a customer but not a site produces an operator→customer edge and no
 * site edge — guessing which site would put a fabricated delivery date into
 * every model downstream.
 */
export function aiFactoryGraph() {
  const operators = [];
  const sites = [];
  const customers = new Map();
  const edges = [];

  for (const c of COMPANIES) {
    const owned = PROJECTS.filter(p => p.companyId === c.id);
    operators.push({
      id: c.id, label: c.ticker, name: c.name, href: `/companies/${c.slug}/`,
      sub: `${owned.length} site${owned.length === 1 ? '' : 's'}`
    });
  }

  for (const p of PROJECTS) {
    const stages = projectPath(p);
    const furthest = [...stages].reverse().find(s => s.status === 'complete');
    sites.push({
      id: p.id, label: p.name, href: `/sites/${p.id}/`,
      operator: p.companyId,
      sub: furthest ? furthest.label : 'No stage evidenced',
      stage: furthest ? furthest.id : null
    });
    edges.push({
      from: p.companyId, to: p.id, type: 'confirmed',
      sourceIds: p.sourceIds || []
    });
  }

  for (const k of CONTRACTS) {
    const key = k.customer;
    if (!customers.has(key)) {
      customers.set(key, { id: key, label: key, sub: [], sourceIds: [] });
    }
    const cust = customers.get(key);
    cust.sourceIds = [...new Set([...cust.sourceIds, ...(k.sourceIds || [])])];
    if (k.mw) cust.sub.push(`${k.mw} MW`);

    // Only where the company itself named the site.
    if (Array.isArray(k.projectIds) && k.projectIds.length) {
      for (const pid of k.projectIds) {
        edges.push({ from: pid, to: key, type: 'confirmed', sourceIds: k.sourceIds || [], contract: k.id });
      }
    } else {
      edges.push({
        from: k.companyId, to: key, type: 'confirmed', sourceIds: k.sourceIds || [],
        contract: k.id, unsited: true
      });
    }
  }

  return {
    columns: [
      { id: 'operators', label: 'Operators', nodes: operators },
      { id: 'sites', label: 'Sites', nodes: sites },
      {
        id: 'customers', label: 'Customers',
        nodes: [...customers.values()].map(c => ({
          ...c, sub: c.sub.length ? c.sub.join(' + ') : 'MW not disclosed'
        }))
      }
    ],
    edges,
    counts: {
      confirmed: edges.filter(e => e.type === 'confirmed').length,
      ecosystem: edges.filter(e => e.type === 'ecosystem').length,
      inferred: edges.filter(e => e.type === 'inferred').length,
      unsited: edges.filter(e => e.unsited).length
    }
  };
}

/** Every relationship as a row, which is the accessible equal of the graph. */
export function relationshipRows() {
  const g = aiFactoryGraph();
  const nodeLabel = id => {
    for (const col of g.columns) {
      const n = col.nodes.find(x => x.id === id);
      if (n) return n.label;
    }
    return id;
  };
  return g.edges.map(e => ({
    from: nodeLabel(e.from),
    to: nodeLabel(e.to),
    type: e.type,
    typeLabel: RELATIONSHIP_TYPES.find(t => t.id === e.type).label,
    unsited: !!e.unsited,
    sources: (e.sourceIds || []).map(id => SOURCE_BY_ID[id]).filter(Boolean),
    sourceIds: e.sourceIds || []
  }));
}
