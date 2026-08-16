/**
 * Customer-map tests.
 *
 * The map puts two separately sourced facts side by side — what a customer
 * contracted, and what that customer publishes. The single failure mode worth
 * testing for is the two merging: a model becoming attached to a megawatt, a
 * site or a contract. Everything here exists to make that regression loud.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTRACTS } from '../data/projects.js';
import { CUSTOMERS, CUSTOMER_KINDS, isUndisclosedCustomer } from '../data/customers.js';
import { SOURCE_BY_ID } from '../data/sources.js';
import { customerMap, undisclosedCustomers, unmappedCustomers } from '../src/lib/customers.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const chainHtml = () => fs.readFileSync(path.join(ROOT, 'dist', 'chain', 'index.html'), 'utf8');

/* ---- the join is complete ---- */

test('every contract counterparty is either mapped or recorded as withheld', () => {
  assert.deepEqual(unmappedCustomers(), []);
});

test('the mapped and withheld sets together account for every contract', () => {
  const mapped = customerMap().reduce((a, r) => a + r.contracts.length, 0);
  assert.equal(mapped + undisclosedCustomers().count, CONTRACTS.length);
});

test('a customer is never both named and withheld', () => {
  for (const c of CUSTOMERS) assert.equal(isUndisclosedCustomer(c.name), false, c.id);
});

/* ---- models are sourced, and never attributed to capacity ---- */

test('every model family cites the customer\'s own publication', () => {
  for (const r of customerMap()) {
    for (const m of r.models) {
      assert.ok(m.source, `${r.id}/${m.family} cites no source`);
      assert.ok(m.source.isPrimary, `${r.id}/${m.family} rests on a second-hand source`);
      assert.ok(/^https:\/\//.test(m.source.url), `${r.id}/${m.family} has no https source URL`);
    }
  }
});

test('a customer with no models says why rather than showing an empty list', () => {
  for (const r of customerMap()) {
    if (!r.models.length) {
      assert.ok(r.noModelsReason && r.noModelsReason.length > 30,
        `${r.id} shows no models and does not explain the absence`);
    }
  }
});

test('no model record carries a site, contract or megawatt figure', () => {
  // The whole point. A model may never be joined to delivered capacity, because
  // no operator or customer has disclosed which model runs where.
  for (const c of CUSTOMERS) {
    for (const m of c.models || []) {
      for (const forbidden of ['mw', 'projectIds', 'siteId', 'companyId', 'contractId']) {
        assert.ok(!(forbidden in m),
          `${c.id}/${m.family} attributes a model to ${forbidden} — nothing published supports that`);
      }
    }
  }
});

test('the rendered map repeats the attribution caveat rather than footnoting it', () => {
  const html = chainHtml();
  assert.ok(/never attributes a model to a\s+megawatt, a contract or a campus/.test(html),
    'the chain page does not carry the model-attribution caveat');
});

/* ---- capacity is summed honestly ---- */

test('contracted capacity is null, never zero, when nothing states megawatts', () => {
  for (const r of customerMap()) {
    if (r.sizedContracts === 0) {
      assert.equal(r.contractedMw, null, `${r.id} reports a total over no sized contract`);
    } else {
      assert.ok(r.contractedMw > 0, `${r.id} sums sized contracts to ${r.contractedMw}`);
    }
  }
});

test('a customer sums only its own contracts, and reports what it excluded', () => {
  for (const r of customerMap()) {
    const sized = r.contracts.filter(c => typeof c.mw === 'number' && c.mw > 0);
    assert.equal(r.sizedContracts, sized.length);
    assert.equal(r.unsizedContracts, r.contracts.length - sized.length);
    if (sized.length) {
      assert.equal(r.contractedMw, sized.reduce((a, c) => a + c.mw, 0));
    }
    for (const c of r.contracts) assert.equal(c.customer, r.name);
  }
});

test('customers with no sized contract sort last rather than reading as zero buyers', () => {
  const rows = customerMap();
  const firstNull = rows.findIndex(r => r.contractedMw === null);
  if (firstNull > -1) {
    assert.ok(rows.slice(firstNull).every(r => r.contractedMw === null),
      'a sized customer sorts below an unsized one');
  }
});

/* ---- withheld counterparties are shown as withheld ---- */

test('withheld contracts show the credit description and never a guessed name', () => {
  const u = undisclosedCustomers();
  assert.ok(u.count > 0);
  for (const d of u.descriptions) {
    assert.ok(isUndisclosedCustomer(d), `"${d}" is listed as withheld but reads like a name`);
  }
  const html = chainHtml();
  for (const d of u.descriptions) {
    assert.ok(html.includes(d), `the page omits the withheld description "${d}"`);
  }
});

/* ---- kinds are declared, not implied ---- */

test('every customer declares a kind the UI can define', () => {
  for (const r of customerMap()) {
    assert.ok(CUSTOMER_KINDS[r.kind], `${r.id} has an undefined kind`);
    assert.ok(r.kindDefinition.length > 40, `${r.id}'s kind is not explained`);
    assert.ok(r.what.length > 40, `${r.id} does not say what it is`);
  }
});

test('the model sources are registered in the shared source table', () => {
  for (const c of CUSTOMERS) {
    for (const m of c.models || []) {
      assert.ok(SOURCE_BY_ID[m.sourceId], `${c.id}/${m.family} cites an unregistered source`);
    }
  }
});
