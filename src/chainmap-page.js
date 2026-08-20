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
  chainMap, commercialTimeline, chainGeometry, singleMakerNodes, adjacency
} from './lib/chainmap.js';
import {
  ARCHITECTURES, MAP_PILLARS, TRACE_MODES, REACH_BANDS,
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
      pillars: MAP_PILLARS, pillar: null, showInferred: true
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

      <!-- These figures must agree with the readout on the map. They are both
           derived from the same graph for exactly that reason: two counts of
           the same thing that disagree would undermine every other number on
           the page. -->
      <p class="cm-coverage">
        This map draws the whole chain, and labels every node with how well T2C can stand behind it.
        <b>${deployed.counts.evidencedNodes} of ${deployed.counts.nodes}</b> nodes come from a T2C
        record; the other <b>${deployed.counts.referenceNodes}</b> are industry structure with
        example companies, marked <b>REFERENCE</b>, and naming a company there is not a claim that it
        supplies anyone tracked here. Of the links, exactly
        <b>${deployed.counts.direct}</b> is a named, dated agreement between two named companies —
        the rest describe how the technology fits together, not who sells to whom.
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

  ${/* This page names around twenty-five listed companies against stages of a
        chain, beside real delivery and revenue records, so it states its own
        position rather than leaning on the site footer. The stage ladder orders
        operators by delivery progress, and a reader scanning for "who is
        furthest along" is doing exactly what the ladder invites — so it says
        plainly that being further along is not a reason to prefer anyone's
        shares. Nothing here ranks investment merit. */''}
  <p class="cm-foot">Chain Mapping shows dependencies and commercial position. A relationship shown
    here is only ever as strong as the document beside it, and the order-to-revenue ladder orders
    operators by delivery progress only &mdash; it is not a ranking of investment merit, and being
    further along it is not a reason to prefer one company's shares over another's.
    <b>T2C is not authorised or regulated by the Financial Conduct Authority.</b> Nothing on this
    page is a recommendation to buy, sell or hold any security, and nothing on it is investment
    advice.
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

  /* Adjacency for chain tracing. Derived by the same function the server uses,
     rather than rebuilt here — two implementations of "what connects to what"
     would eventually disagree, and the one in the browser would be the one the
     reader sees. */
  const adj = adjacency(deployed);
  const adjNext = adjacency(next);
  const merged = { up: { ...adj.up }, down: { ...adj.down } };
  for (const dir of ['up', 'down']) {
    for (const [k, v] of Object.entries(adjNext[dir])) {
      merged[dir][k] = [...new Set([...(merged[dir][k] || []), ...v])];
    }
  }

  return {
    adjacency: merged,
    nodes: byId,
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
