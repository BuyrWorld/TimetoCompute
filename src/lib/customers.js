/**
 * The demand end of the chain: who buys the megawatts.
 *
 * Everything here is a join, never an assertion. Contracted capacity comes from
 * the operator's filings; the model families come from the customer's own
 * published index; the two are displayed adjacent and never merged. See the
 * header of data/customers.js for why that distinction is load-bearing.
 */
import { CONTRACTS } from '../../data/projects.js';
import { COMPANIES } from '../../data/companies.js';
import {
  CUSTOMERS, CUSTOMER_BY_NAME, CUSTOMER_KINDS, isUndisclosedCustomer,
  MODEL_ATTRIBUTION_CAVEAT
} from '../../data/customers.js';
import { SOURCE_BY_ID } from '../../data/sources.js';

const companyById = Object.fromEntries(COMPANIES.map(c => [c.id, c]));

/**
 * One row per named customer.
 *
 * `contractedMw` sums only contracts that state megawatts, and `unsizedContracts`
 * reports how many did not — a capacity total silently omitting the dollar-only
 * contracts would understate the customer while looking complete.
 */
export function customerMap() {
  const rows = CUSTOMERS.map(cust => {
    const contracts = CONTRACTS.filter(c => c.customer === cust.name);
    const sized = contracts.filter(c => typeof c.mw === 'number' && c.mw > 0);

    return {
      ...cust,
      kindLabel: CUSTOMER_KINDS[cust.kind].label,
      kindDefinition: CUSTOMER_KINDS[cust.kind].definition,
      models: (cust.models || []).map(m => ({ ...m, source: SOURCE_BY_ID[m.sourceId] || null })),
      contracts: contracts.map(c => ({
        ...c,
        operator: companyById[c.companyId] || null
      })),
      operators: [...new Set(contracts.map(c => c.companyId))]
        .map(id => companyById[id]).filter(Boolean),
      /** Null, not zero, when the customer has no sized contract on file. */
      contractedMw: sized.length ? sized.reduce((a, c) => a + c.mw, 0) : null,
      sizedContracts: sized.length,
      unsizedContracts: contracts.length - sized.length
    };
  });

  // Biggest disclosed buyer first; customers with no sized contract sort last
  // rather than being treated as buyers of zero.
  return rows.sort((a, b) => (b.contractedMw ?? -1) - (a.contractedMw ?? -1));
}

/**
 * Contracts whose counterparty the operator withheld.
 *
 * These are grouped rather than listed as customers, because the only disclosed
 * fact is a credit description. Guessing which hyperscaler is meant would be the
 * single easiest invention on this page, so the group exists to make the
 * withholding visible instead.
 */
export function undisclosedCustomers() {
  const contracts = CONTRACTS.filter(c => isUndisclosedCustomer(c.customer));
  const sized = contracts.filter(c => typeof c.mw === 'number' && c.mw > 0);
  return {
    count: contracts.length,
    contractedMw: sized.length ? sized.reduce((a, c) => a + c.mw, 0) : null,
    sizedContracts: sized.length,
    unsizedContracts: contracts.length - sized.length,
    descriptions: [...new Set(contracts.map(c => c.customer))],
    rows: contracts.map(c => ({ ...c, operator: companyById[c.companyId] || null }))
  };
}

/** Every contract counterparty is either mapped or explicitly withheld. */
export function unmappedCustomers() {
  return [...new Set(CONTRACTS.map(c => c.customer))]
    .filter(n => !CUSTOMER_BY_NAME[n] && !isUndisclosedCustomer(n));
}

export { MODEL_ATTRIBUTION_CAVEAT };
