/**
 * /chain-mapping/ — the research workspace.
 *
 * The whole graph for BOTH architecture modes is rendered server-side and the
 * client shows one at a time. The alternative — fetching or rebuilding on
 * toggle — would mean the map exists only for readers running JavaScript, and
 * the pack is explicit that this must stay real HTML so it is searchable,
 * accessible and readable without a script.
 *
 * The five columns, the list view and the timeline are therefore all in the
 * document at first paint. Only zoom, selection and playback need a script.
 */
import { esc } from './lib/format.js';
import {
  workspaceHeader, filterRail, chainMapCanvas, chainMapList, mapControls,
  nodeDrawer, drawerPayload, commercialTimelineView, boundaryPanel
} from './chainmap-ui.js';
import {
  chainMap, commercialTimeline, chainGeometry, singleMakerNodes
} from './lib/chainmap.js';
import {
  ARCHITECTURES, PILLARS, TRACE_MODES, REACH_BANDS,
  BOUNDARY_STATEMENT, BOUNDARY_SUPPORT
} from '../data/chainmap.js';
import { COMPANIES } from '../data/companies.js';

export function chainMappingBody() {
  const deployed = chainMap({ architecture: 'deployed' });
  const next = chainMap({ architecture: 'next' });
  const stages = commercialTimeline();
  const projects = COMPANIES.map(c => ({ id: c.id, label: `${c.name} (${c.ticker})` }));

  return `<div class="t2c-shell cm-page" data-architecture="deployed">
  ${workspaceHeader({
    architecture: 'deployed', architectures: ARCHITECTURES, projects, projectId: ''
  })}

  <div class="cm-layout">
    ${filterRail({
      traceModes: TRACE_MODES, traceMode: 'product',
      pillars: PILLARS, pillar: null, showInferred: true
    })}

    <div class="cm-main">
      <!-- Both modes ship in the document. The client shows one; a reader with
           no JavaScript sees the deployed map, which is the honest default. -->
      <div class="cm-mode" data-mode="deployed">
        ${mapControls()}
        ${chainMapCanvas(deployed, chainGeometry(deployed), {
          singleMakers: singleMakerNodes(deployed), mode: 'deployed'
        })}
        ${chainMapList(deployed)}
      </div>
      <div class="cm-mode" data-mode="next" hidden>
        ${mapControls()}
        ${chainMapCanvas(next, chainGeometry(next), {
          singleMakers: singleMakerNodes(next), mode: 'next'
        })}
        ${chainMapList(next)}
      </div>

      <p class="cm-coverage">
        This map draws <b>${deployed.counts.evidenced} of ${deployed.counts.nodes}</b> nodes from a
        sourced record, and exactly <b>${deployed.counts.direct}</b> edge from a named
        company-to-company agreement. Everything else is either T2C's own framing of how the thing is
        built, marked inferred, or a company's own statement of what it makes.
        <a class="press" href="/methodology/#chain">What it would take to track more</a>
      </p>
    </div>

    ${nodeDrawer()}
  </div>

  ${boundaryPanel({
    bands: REACH_BANDS, statement: BOUNDARY_STATEMENT,
    support: BOUNDARY_SUPPORT, architecture: 'deployed'
  })}

  ${commercialTimelineView(stages)}

  <p class="cm-foot">Chain Mapping shows dependencies and commercial position. It is research
    context, not investment advice, and a relationship shown here is only ever as strong as the
    document beside it.
    <a class="press" href="/chain/">The stage-level supply chain</a> &middot;
    <a class="press" href="/explainers/">Stage explainers</a></p>
</div>`;
}

/**
 * What the client needs.
 *
 * Node detail for both modes, keyed by id, so opening a drawer never refetches
 * and never re-derives copy that the server already wrote.
 */
export function chainMappingConfig() {
  const deployed = chainMap({ architecture: 'deployed' });
  const next = chainMap({ architecture: 'next' });
  const byId = {};
  for (const n of [...drawerPayload(deployed), ...drawerPayload(next)]) byId[n.id] = n;

  /* Adjacency for chain tracing, built from DIRECT edges only. Structural
     bands are excluded: following one would let the interface report that a
     substrate "reaches" a customer on the strength of T2C's own framing of how
     a data centre is built, rather than on any document. */
  const adjacency = { up: {}, down: {} };
  for (const e of [...deployed.edges, ...next.edges]) {
    if (e.columnLevel || !e.from || !e.to) continue;
    (adjacency.down[e.from] = adjacency.down[e.from] || []).push(e.to);
    (adjacency.up[e.to] = adjacency.up[e.to] || []).push(e.from);
  }

  return {
    nodes: byId,
    adjacency,
    modes: {
      deployed: deployed.nodes.map(n => n.id),
      next: next.nodes.map(n => n.id)
    },
    architectures: ARCHITECTURES.map(a => ({ id: a.id, summary: a.summary, detail: a.detail })),
    stages: commercialTimeline().map(s => ({ id: s.id, label: s.label, count: s.count })),
    /* Successors let the client keep a selection meaningful across a mode
       change instead of silently clearing it. */
    successors: { 'interconnect-deployed': 'interconnect-next', 'interconnect-next': 'interconnect-deployed' }
  };
}
