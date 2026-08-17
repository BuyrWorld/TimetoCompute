/**
 * Chain Mapping — the graph, derived.
 *
 * Every node and edge here is built from a record that already exists elsewhere
 * in this repository, carrying the evidence grade that record already has. There
 * is no second store of supplier facts to drift from the first, and nothing in
 * the pack's demo fixtures reaches production — the pack's `sample-chain.ts` and
 * `preview/chain-mapping.js` are interaction fixtures and are never imported.
 *
 * WHAT THE MAP CAN AND CANNOT SHOW, stated once because the honest answer is
 * unusual and a reader deserves it up front:
 *
 *   INPUTS          One node. AXT supplies indium phosphide to Lumentum under a
 *                   named, dated agreement — the only company-to-company supply
 *                   relationship T2C holds anywhere.
 *   COMPONENTS      Six photonics components with their makers, each carrying
 *                   the evidence grade from data/suppliers.js. Most are
 *                   "makes the component" — capability, not an award.
 *   SYSTEMS         Empty. T2C holds no accelerator, switch or server supplier
 *                   record. The column is declared, not hidden.
 *   INFRASTRUCTURE  Six operators and their sites, from the real project records.
 *   MONETISATION    Named customers and withheld counterparties, from contracts.
 *
 * A column with nothing in it says so. That is the same treatment the chain page
 * already gives its four untracked stages, and for the same reason: an empty
 * column that is drawn is a finding, and one that is hidden is a lie of omission.
 */
import {
  COLUMNS, PILLARS, ARCHITECTURES, INTERCONNECT, COMMERCIAL_STAGES,
  RELATIONSHIPS, CONFIDENCES, MATURITIES
} from '../../data/chainmap.js';
import { PHOTONICS_SUPPLIERS, EVIDENCE_GRADES, SUPPLIER_ROLES } from '../../data/suppliers.js';
import { EXPLAINER_BY_SLUG, explainerHref } from '../../data/explainers.js';
import { SOURCE_BY_ID } from '../../data/sources.js';
import { COMPANIES } from '../../data/companies.js';
import { PROJECTS, PROJECTS_BY_COMPANY, CONTRACTS } from '../../data/projects.js';
import { customerMap, undisclosedCustomers } from './customers.js';
import { getMeasure, isKnown } from './compute.js';
import { path as projectPath } from './sites.js';

/**
 * How a supplier's evidence grade maps onto the two separate axes the pack
 * requires: what KIND of connection is asserted, and how well evidenced it is.
 *
 * Collapsing these is the mistake the supplier table was built to avoid, so the
 * map inherits the same separation rather than re-deriving it.
 */
const GRADE_TO_AXES = {
  'supply-agreement': { relationship: 'direct', confidence: 'high' },
  'volume-order': { relationship: 'reported', confidence: 'high' },
  demonstration: { relationship: 'ecosystem', confidence: 'medium' },
  capability: { relationship: 'ecosystem', confidence: 'medium' }
};

/**
 * How far a supplier's own evidence carries it up the commercial ladder.
 *
 * A capability record supports nothing beyond "this company makes the part", so
 * it gets no commercial stage at all rather than a default of `capacity` — a
 * default would be an invention dressed as a floor.
 */
const GRADE_TO_STAGE = {
  'supply-agreement': 'ordered',
  'volume-order': 'ordered',
  demonstration: null,
  capability: null
};

const node = o => ({
  org: null, orgTicker: null, pillar: 'photonics',
  architectureModes: ['deployed', 'next'],
  maturity: 'unknown', relationship: 'unknown', confidence: 'unverified',
  commercialStage: null, evidenceIds: [], explainerHref: null, inputs: null, outputs: null,
  ...o
});

/* ------------------------------------------------------------- the nodes ---- */

/** Inputs: substrates and materials. One evidenced record. */
function inputNodes() {
  const out = [];
  for (const s of PHOTONICS_SUPPLIERS.filter(x => x.role === 'material-supplier')) {
    const axes = GRADE_TO_AXES[s.grade];
    const ex = EXPLAINER_BY_SLUG[s.components[0]];
    out.push(node({
      id: `input-${s.id}`, column: 'inputs',
      title: ex ? ex.name : s.components[0],
      org: s.company, orgTicker: s.ticker, orgExchange: s.exchange,
      simple: ex ? ex.simple : null,
      technical: ex ? ex.definition : s.what,
      whyItMatters: ex ? ex.whyAi : s.what,
      inputs: ex ? ex.inputs : null, outputs: ex ? ex.outputs : null,
      maturity: 'deployed',
      relationship: axes.relationship, confidence: axes.confidence,
      commercialStage: GRADE_TO_STAGE[s.grade],
      counterparty: s.counterparty, evidenceSummary: s.evidence, asOf: s.asOf,
      evidenceIds: s.sourceIds,
      explainerHref: ex ? explainerHref(ex) : null,
      supplierId: s.id
    }));
  }
  return out;
}

/**
 * Components: one node per photonics part that has at least one sourced maker.
 *
 * The interconnect pair is handled separately, because it is the one node that
 * differs between architecture modes.
 */
function componentNodes() {
  const ARCH_SLUGS = new Set(['optical-transceiver', 'co-packaged-optics']);
  /* A substrate belongs to Inputs, not Components. Without this it appeared in
     both columns, which made the map claim AXT sits in two places at once. */
  const INPUT_SLUGS = new Set(
    PHOTONICS_SUPPLIERS.filter(s => s.role === 'material-supplier').flatMap(s => s.components)
  );
  const bySlug = new Map();

  for (const s of PHOTONICS_SUPPLIERS) {
    for (const slug of s.components) {
      if (ARCH_SLUGS.has(slug) || INPUT_SLUGS.has(slug)) continue;
      if (!EXPLAINER_BY_SLUG[slug]) continue;
      if (!bySlug.has(slug)) bySlug.set(slug, []);
      bySlug.get(slug).push(s);
    }
  }

  return [...bySlug.entries()].map(([slug, suppliers]) => {
    const ex = EXPLAINER_BY_SLUG[slug];
    /* The strongest evidence on the node is the strongest any of its makers
       carries — never an average, which would let three weak records outvote
       one named agreement. */
    const best = suppliers.slice()
      .sort((a, b) => EVIDENCE_GRADES[b.grade].rank - EVIDENCE_GRADES[a.grade].rank)[0];
    const axes = GRADE_TO_AXES[best.grade];
    return node({
      id: `component-${slug}`, column: 'components', slug,
      title: ex.name,
      org: suppliers.length === 1 ? best.company : `${suppliers.length} makers on file`,
      orgTicker: suppliers.length === 1 ? best.ticker : null,
      orgExchange: suppliers.length === 1 ? best.exchange : null,
      simple: ex.simple, technical: ex.definition, whyItMatters: ex.whyAi,
      inputs: ex.inputs, outputs: ex.outputs,
      maturity: 'deployed',
      relationship: axes.relationship, confidence: axes.confidence,
      commercialStage: GRADE_TO_STAGE[best.grade],
      evidenceSummary: best.evidence, asOf: best.asOf,
      evidenceIds: [...new Set(suppliers.flatMap(x => x.sourceIds))],
      explainerHref: explainerHref(ex),
      suppliers: suppliers.map(x => ({
        id: x.id, company: x.company, ticker: x.ticker, exchange: x.exchange,
        role: x.role, roleLabel: SUPPLIER_ROLES[x.role].label,
        grade: x.grade, gradeLabel: EVIDENCE_GRADES[x.grade].label,
        confirmed: EVIDENCE_GRADES[x.grade].confirmed,
        evidence: x.evidence, counterparty: x.counterparty, asOf: x.asOf,
        sourceIds: x.sourceIds
      }))
    });
  });
}

/**
 * The interconnect nodes — the only place the two architecture modes differ.
 *
 * Three nodes, not two: copper sits in BOTH modes. Drawing it only in `deployed`
 * would say copper goes away, which is the exact misreading this feature exists
 * to prevent.
 */
function interconnectNodes() {
  const build = (spec, modes, pillarNote) => {
    const ex = spec.slug ? EXPLAINER_BY_SLUG[spec.slug] : null;
    const suppliers = spec.slug
      ? PHOTONICS_SUPPLIERS.filter(s => s.components.includes(spec.slug))
      : [];
    const best = suppliers.slice()
      .sort((a, b) => EVIDENCE_GRADES[b.grade].rank - EVIDENCE_GRADES[a.grade].rank)[0] || null;
    const axes = best ? GRADE_TO_AXES[best.grade] : { relationship: 'unknown', confidence: 'unverified' };
    return node({
      id: spec.id, column: 'components', slug: spec.slug || null,
      title: spec.title, isInterconnect: true,
      org: best ? (suppliers.length === 1 ? best.company : `${suppliers.length} makers on file`) : null,
      orgTicker: suppliers.length === 1 && best ? best.ticker : null,
      orgExchange: suppliers.length === 1 && best ? best.exchange : null,
      simple: spec.simple, technical: spec.technical, whyItMatters: spec.whyItMatters,
      inputs: ex ? ex.inputs : null, outputs: ex ? ex.outputs : null,
      architectureModes: modes,
      maturity: spec.maturity,
      relationship: axes.relationship, confidence: axes.confidence,
      commercialStage: best ? GRADE_TO_STAGE[best.grade] : null,
      evidenceSummary: best ? best.evidence : pillarNote,
      asOf: best ? best.asOf : null,
      evidenceIds: [...new Set(suppliers.flatMap(x => x.sourceIds))],
      explainerHref: ex ? explainerHref(ex) : null,
      art: spec.art || null,
      suppliers: suppliers.map(x => ({
        id: x.id, company: x.company, ticker: x.ticker, exchange: x.exchange,
        role: x.role, roleLabel: SUPPLIER_ROLES[x.role].label,
        grade: x.grade, gradeLabel: EVIDENCE_GRADES[x.grade].label,
        confirmed: EVIDENCE_GRADES[x.grade].confirmed,
        evidence: x.evidence, counterparty: x.counterparty, asOf: x.asOf,
        sourceIds: x.sourceIds
      }))
    });
  };

  return [
    build(INTERCONNECT.deployed, ['deployed']),
    build(INTERCONNECT.next, ['next']),
    build(INTERCONNECT.copper, ['deployed', 'next'],
      'Copper interconnect is industry practice rather than a T2C supplier record. ' +
      'No named cable or connector supplier is on file.')
  ];
}

/**
 * Infrastructure: the operators, with their real delivery position.
 *
 * `commercialStage` comes from the furthest gate each operator has actually
 * reached — never from the contract it signed, because a contract is not a
 * delivery.
 */
function infrastructureNodes() {
  return COMPANIES.map(c => {
    const sites = PROJECTS_BY_COMPANY[c.id] || [];
    const accepted = sites.some(p => projectPath(p).some(s => s.id === 'acceptance' && s.status === 'complete'));
    const billing = isKnown(getMeasure(c, 'revenueLiveMw'));
    const energised = isKnown(getMeasure(c, 'energisedCriticalItMw'));
    return node({
      id: `operator-${c.id}`, column: 'infrastructure',
      title: c.name, org: c.name, orgTicker: c.ticker,
      pillar: 'power-cooling',
      simple: 'an operator building and running the halls',
      technical: `Operator of ${sites.length} tracked site${sites.length === 1 ? '' : 's'}.`,
      whyItMatters: 'Securing power, building the halls and energising them are separate gates that ' +
        'each take years. This is where most announced capacity stalls.',
      inputs: 'Accelerators, optics, power and years of construction.',
      outputs: 'Live, cooled, connected compute capacity.',
      maturity: 'deployed',
      relationship: 'direct', confidence: 'high',
      commercialStage: billing ? 'recognised' : accepted ? 'accepted' : energised ? 'capacity' : 'capacity',
      companySlug: c.slug, siteCount: sites.length,
      explainerHref: '/explainers/ai-factory/',
      evidenceIds: []
    });
  });
}

/** Monetisation: named customers, and the counterparties operators withheld. */
function monetisationNodes() {
  const out = customerMap().map(cu => node({
    id: `customer-${cu.id}`, column: 'monetisation',
    title: cu.display, org: cu.display,
    pillar: 'power-cooling',
    simple: 'a customer paying for the megawatts',
    technical: cu.what,
    whyItMatters: 'The chain only pays for itself here. A contract is not acceptance, and ' +
      'acceptance is not recognised revenue.',
    inputs: 'Accepted capacity.', outputs: 'Disclosed billing, then recognised revenue.',
    maturity: 'deployed',
    relationship: 'direct', confidence: 'high',
    commercialStage: 'accepted',
    contractedMw: cu.contractedMw, operators: cu.operators.map(o => o.ticker),
    companySlug: cu.id === 'coreweave' ? 'coreweave' : null,
    evidenceIds: [...new Set(cu.contracts.flatMap(c => c.sourceIds || []))]
  }));

  const withheld = undisclosedCustomers();
  if (withheld.count) {
    out.push(node({
      id: 'customer-withheld', column: 'monetisation',
      title: 'Withheld counterparties',
      pillar: 'power-cooling',
      simple: 'contracts whose buyer the operator would not name',
      technical: `${withheld.count} contracts disclose the deal but not the counterparty, describing ` +
        'only its credit quality.',
      whyItMatters: 'T2C does not guess which hyperscaler is meant. Naming one would be the easiest ' +
        'invention on this page and the hardest for a reader to detect.',
      maturity: 'deployed',
      relationship: 'reported', confidence: 'high',
      commercialStage: 'capacity',
      withheldDescriptions: withheld.descriptions,
      contractedMw: withheld.contractedMw,
      evidenceIds: [...new Set(withheld.rows.flatMap(c => c.sourceIds || []))]
    }));
  }
  return out;
}

/* ------------------------------------------------------------- the edges ---- */

/**
 * Edges.
 *
 * Only two kinds exist, and both are earned: a `direct` edge where a document
 * names both companies, and a `structural` edge where one column feeds the next
 * as a matter of how the thing is built. Structural edges are marked `inferred`
 * and drawn dashed, because "materials become components" is T2C's own framing
 * rather than anybody's disclosure.
 */
function buildEdges(nodes) {
  const edges = [];
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const inCol = id => nodes.filter(n => n.column === id);

  /* The one evidenced company-to-company supply edge on the whole site. */
  for (const s of PHOTONICS_SUPPLIERS.filter(x => x.grade === 'supply-agreement' && x.counterparty)) {
    const from = byId[`input-${s.id}`];
    const target = PHOTONICS_SUPPLIERS.find(x => x.company.startsWith(s.counterparty));
    const to = target && nodes.find(n => n.suppliers?.some(sup => sup.id === target.id));
    if (from && to) {
      edges.push({
        id: `edge-${s.id}-${target.id}`, from: from.id, to: to.id,
        relationship: 'direct', confidence: 'high', inferred: false,
        pillar: 'photonics', architectureModes: ['deployed', 'next'],
        label: `${s.ticker} supplies ${target.ticker}`,
        evidenceIds: s.sourceIds
      });
    }
  }

  /* Structural flow is COLUMN to COLUMN, not node to node.
     Joining every node to every node in the next column produced 41 lines that
     asserted 41 relationships nobody had disclosed — visually a hairball, and
     factually a claim that each input feeds each component. What is actually
     true is weaker and simpler: this column feeds the next one. That is one
     edge per adjacent pair, drawn as a band, marked inferred. */
  const chain = ['inputs', 'components', 'systems', 'infrastructure', 'monetisation'];
  for (let i = 0; i < chain.length - 1; i++) {
    const from = inCol(chain[i]), to = inCol(chain[i + 1]);
    if (!from.length) continue;

    if (to.length) {
      edges.push({
        id: `flow-${chain[i]}-${chain[i + 1]}`,
        fromColumn: chain[i], toColumn: chain[i + 1],
        from: null, to: null, columnLevel: true, broken: false,
        relationship: 'inferred', confidence: 'unverified', inferred: true,
        pillar: null, architectureModes: ['deployed', 'next'],
        label: 'Structural dependency — how the thing is built, not a disclosed relationship',
        evidenceIds: []
      });
      continue;
    }

    /* The next column is empty, so the chain visibly breaks here. That break is
       a finding and is drawn as one: without it, Components and Infrastructure
       would simply appear unconnected and read as a rendering bug rather than as
       "T2C cannot evidence this link". */
    const nextFilled = chain.slice(i + 1).find(c => inCol(c).length);
    if (!nextFilled) continue;
    edges.push({
      id: `break-${chain[i]}-${nextFilled}`,
      fromColumn: chain[i], toColumn: nextFilled,
      from: null, to: null, columnLevel: true, broken: true,
      skipped: chain.slice(i + 1, chain.indexOf(nextFilled)),
      relationship: 'unknown', confidence: 'unverified', inferred: true,
      pillar: null, architectureModes: ['deployed', 'next'],
      label: 'The chain continues, but T2C holds no record of what sits between these columns',
      evidenceIds: []
    });
  }
  return edges;
}

/* --------------------------------------------------------------- the map ---- */

/**
 * The whole graph for one architecture mode.
 *
 * `columns` always contains all five, each carrying its own nodes and — when it
 * has none — the reason. A column that would render empty is not dropped.
 */
export function chainMap({ architecture = 'deployed', pillar = null, showInferred = true } = {}) {
  const all = [
    ...inputNodes(), ...componentNodes(), ...interconnectNodes(),
    ...infrastructureNodes(), ...monetisationNodes()
  ];

  const visible = all.filter(n => n.architectureModes.includes(architecture))
    .filter(n => !pillar || n.pillar === pillar);

  const edges = buildEdges(visible)
    .filter(e => e.architectureModes.includes(architecture))
    .filter(e => showInferred || !e.inferred);

  const columns = COLUMNS.map(c => {
    const nodes = visible.filter(n => n.column === c.id);
    return {
      ...c, nodes,
      empty: nodes.length === 0,
      /* Why a column is empty is a finding, not an error. */
      emptyReason: nodes.length ? null : c.id === 'systems'
        ? 'T2C holds no accelerator, switch or server supplier record. Nothing is drawn here rather ' +
          'than a plausible-looking box with no document behind it.'
        : 'No sourced record matches the current filter.'
    };
  });

  return {
    architecture,
    architectureMeta: ARCHITECTURES.find(a => a.id === architecture),
    columns,
    nodes: visible,
    edges,
    counts: {
      nodes: visible.length,
      direct: edges.filter(e => e.relationship === 'direct').length,
      inferred: edges.filter(e => e.inferred).length,
      evidenced: visible.filter(n => n.evidenceIds.length).length
    }
  };
}

/** Sources behind a node, resolved. */
export const sourcesFor = ids =>
  [...new Set(ids || [])].map(id => SOURCE_BY_ID[id]).filter(Boolean);

/* ------------------------------------------------------------ the geometry -- */

/**
 * Where every node sits on the canvas, and what shape each link is.
 *
 * Pure arithmetic over the graph, kept here rather than in the renderer so the
 * layout can be asserted by test instead of only inspected by eye. The viewBox
 * grows with the tallest column; nothing is clipped and nothing scrolls
 * horizontally inside the SVG itself.
 */
export const GEOMETRY = Object.freeze({
  width: 1180, colWidth: 236, nodeW: 148, nodeH: 58, rowGap: 88,
  headroom: 46, minHeight: 400, notch: 15
});

/** A hexagon with clipped left and right points, as an SVG points list. */
export function hexPoints(cx, cy, w = GEOMETRY.nodeW, h = GEOMETRY.nodeH) {
  const { notch: k } = GEOMETRY;
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  return `${x0},${cy} ${x0 + k},${y0} ${x1 - k},${y0} ${x1},${cy} ${x1 - k},${y1} ${x0 + k},${y1}`;
}

/**
 * Positions, link paths and the canvas box for one graph.
 *
 * TWO KINDS OF LINK, DRAWN DIFFERENTLY BECAUSE THEY CLAIM DIFFERENT THINGS.
 *
 *   A `direct` edge joins two NODES and is drawn as a thin curve between them.
 *   T2C holds exactly one: AXT to Lumentum, under a named, dated agreement.
 *
 *   A structural edge joins two COLUMNS and is drawn as a wide, faint band
 *   between the column centroids. It is deliberately not fanned out into
 *   node-to-node curves: joining every node to every node in the next column
 *   would draw dozens of lines asserting dozens of relationships nobody has
 *   disclosed. What is true is weaker and simpler — this column feeds the next.
 *
 * Reading a band as "some node here supplies some node there" is the one
 * misreading the shape has to prevent, so a band never touches a node.
 */
export function chainGeometry(graph) {
  const G = GEOMETRY;
  const cols = graph.columns.map(c => c.nodes);
  const rows = Math.max(1, ...cols.map(c => c.length));
  const height = Math.max(G.minHeight, rows * G.rowGap + G.headroom * 2);

  const pos = {};
  const columnBox = graph.columns.map((c, ci) => {
    const cx = G.colWidth * ci + G.colWidth / 2;
    const top = (height - c.nodes.length * G.rowGap) / 2 + G.rowGap / 2;
    c.nodes.forEach((n, i) => { pos[n.id] = { x: cx, y: top + i * G.rowGap, column: ci }; });
    return {
      id: c.id, index: ci, cx,
      x0: G.colWidth * ci, x1: G.colWidth * (ci + 1),
      /* An empty column's band still needs a vertical anchor, and the canvas
         middle is the only honest one — it has no nodes to average. */
      cy: c.nodes.length
        ? c.nodes.reduce((a, n) => a + pos[n.id].y, 0) / c.nodes.length
        : height / 2,
      empty: c.empty
    };
  });

  const links = [];
  for (const e of graph.edges) {
    if (e.columnLevel) {
      const from = columnBox.find(c => c.id === e.fromColumn);
      const to = columnBox.find(c => c.id === e.toColumn);
      if (!from || !to) continue;
      /* The band stops short of both columns' node edges so it can never be
         mistaken for a line arriving at a particular box. */
      const x1 = from.cx + G.nodeW / 2 + 14;
      const x2 = to.cx - G.nodeW / 2 - 14;
      const mx = (x1 + x2) / 2;
      links.push({
        ...e, kind: 'band',
        d: `M ${x1} ${from.cy} C ${mx} ${from.cy}, ${mx} ${to.cy}, ${x2} ${to.cy}`,
        x1, y1: from.cy, x2, y2: to.cy
      });
      continue;
    }
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) continue;
    const x1 = a.x + G.nodeW / 2, x2 = b.x - G.nodeW / 2;
    const mx = (x1 + x2) / 2;
    links.push({
      ...e, kind: 'edge',
      d: `M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`,
      x1, y1: a.y, x2, y2: b.y
    });
  }

  return { width: G.width, height, pos, columnBox, links };
}

/**
 * Every node reachable from one node, following real edges in both directions.
 *
 * Bands are excluded on purpose. Tracing through a structural band would report
 * "this substrate reaches that customer" on the strength of T2C's own framing of
 * how a data centre is built, which is precisely the leap the two link types
 * exist to keep apart. With one direct edge on file the traced chain is short,
 * and the interface says so rather than padding it.
 */
export function traceChain(graph, id) {
  const up = {}, down = {};
  for (const e of graph.edges) {
    if (e.columnLevel || !e.from || !e.to) continue;
    (down[e.from] = down[e.from] || []).push(e.to);
    (up[e.to] = up[e.to] || []).push(e.from);
  }
  const seen = new Set([id]);
  const walk = (n, dir) => {
    for (const m of (dir[n] || [])) if (!seen.has(m)) { seen.add(m); walk(m, dir); }
  };
  walk(id, up); walk(id, down);
  return seen;
}

/**
 * Components with exactly one maker on file.
 *
 * The pack's mockup hand-flags "bottlenecks". This derives the nearest thing
 * that is actually checkable: a part for which T2C holds a single named maker.
 * It is labelled "single maker on file" everywhere and never "sole supplier" —
 * one maker in T2C's records is a statement about the records, not about the
 * world, and the gap between those two is where a chokepoint claim goes wrong.
 */
export function singleMakerNodes(graph) {
  return graph.nodes
    .filter(n => {
      /* Only the parts columns can answer this. An operator or a customer has
         no "maker", so counting them would mean flagging every one of them. */
      if (n.column !== 'inputs' && n.column !== 'components') return false;
      const makers = Array.isArray(n.suppliers) ? n.suppliers.length : (n.supplierId ? 1 : 0);
      return makers === 1;
    })
    .map(n => n.id);
}

/**
 * The commercial timeline for the tracked estate.
 *
 * Each stage reports how many sourced records actually sit at it. A stage with
 * no records shows zero and says so — it never borrows a count from the stage
 * before it, which is exactly how "announced capacity" becomes "revenue".
 */
export function commercialTimeline() {
  const accepted = PROJECTS.filter(p => projectPath(p).some(s => s.id === 'acceptance' && s.status === 'complete'));
  const billing = COMPANIES.filter(c => isKnown(getMeasure(c, 'revenueLiveMw')));
  const ordered = PHOTONICS_SUPPLIERS.filter(s => s.grade === 'volume-order' || s.grade === 'supply-agreement');

  const counts = {
    capacity: CONTRACTS.length,
    qualified: 0,
    ordered: ordered.length,
    shipping: 0,
    accepted: accepted.length,
    recognised: billing.length
  };
  const evidence = {
    capacity: [...new Set(CONTRACTS.flatMap(c => c.sourceIds || []))].length,
    qualified: 0,
    ordered: [...new Set(ordered.flatMap(s => s.sourceIds))].length,
    shipping: 0,
    accepted: [...new Set(accepted.flatMap(p => p.sourceIds || []))].length,
    /* Derived from the billing measures themselves rather than hardcoded. A
       stage reporting records but zero sources would be the exact defect this
       table exists to expose. */
    recognised: [...new Set(billing.flatMap(c => getMeasure(c, 'revenueLiveMw')?.sourceIds || []))].length
  };

  return COMMERCIAL_STAGES.map(s => ({
    ...s,
    count: counts[s.id],
    sourceCount: evidence[s.id],
    state: counts[s.id] > 0 ? 'evidenced' : 'none',
    /* A zero here is a real finding: T2C holds no qualification or shipment
       record anywhere, which is precisely why it cannot claim either. */
    emptyNote: counts[s.id] === 0
      ? 'No sourced record sits at this stage. It is not inferred from the stage before it.'
      : null
  }));
}

export {
  COLUMNS, PILLARS, ARCHITECTURES, INTERCONNECT, COMMERCIAL_STAGES,
  RELATIONSHIPS, CONFIDENCES, MATURITIES
};
