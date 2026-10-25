/**
 * Who a piece of news touches, read off the disclosed supply-chain links.
 *
 * This is exposure, not a forecast: "CoreWeave leases Polaris Forge 1 from
 * Applied Digital" is a filed fact, so news about Polaris Forge reaches
 * CoreWeave. Whether that is good or bad for anyone is not said here.
 */
import { CHAIN_COMPANY_BY_ID, CHAIN_LINKS, LINK_KINDS } from '../../data/chain.js';

/** Ledger company ids that differ from chain ids. */
const LEDGER_TO_CHAIN = { keel: null };

export function chainIdFor(companyId) {
  if (companyId in LEDGER_TO_CHAIN) return LEDGER_TO_CHAIN[companyId];
  return CHAIN_COMPANY_BY_ID[companyId] ? companyId : null;
}

/** Direct neighbours, each with the relationship that connects them. */
export function touches(chainId) {
  if (!chainId) return [];
  return CHAIN_LINKS
    .filter(l => l.from === chainId || l.to === chainId)
    .map(l => {
      const other = CHAIN_COMPANY_BY_ID[l.from === chainId ? l.to : l.from];
      const role = l.from === chainId ? 'customer' : 'supplier';
      return { id: other.id, name: other.name, stage: other.stage, role, kind: LINK_KINDS[l.kind].label, what: l.what };
    })
    .filter(t => t.stage !== 'applications');
}
