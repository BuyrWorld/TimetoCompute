import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText, verifyPoints, pickExhibits, indexUrl, parseFilingUrl, DIGEST_SCHEMA } from '../api/_digest.js';
import { SEC_CIK } from '../data/review.js';

const CIKS = Object.values(SEC_CIK);

test('a filing becomes readable text: no tags, no hidden XBRL header, entities decoded', () => {
  const html = `<html><head><title>x</title></head><body><ix:header><ix:hidden>dei:Junk</ix:hidden></ix:header>
    <p>IREN&#8217;s Childress campus reached&nbsp;750&nbsp;MW &amp; is <b>energised</b>.</p><table><tr><td>Q1</td><td>$1.2m</td></tr></table></body></html>`;
  const t = htmlToText(html);
  assert.ok(!/[<>]/.test(t), t);
  assert.ok(!t.includes('dei:Junk'), 'the inline-XBRL header leaked into the text');
  assert.match(t, /IREN’s Childress campus reached 750 MW & is energised\./);
  assert.match(t, /Q1\s+\$1\.2m/);
});

test('a point survives only if its quote is in the filing, word for word', () => {
  const text = 'The Company entered into a  multi-year agreement with Microsoft for 200 MW of capacity at Childress.\nDeliveries begin in 2027.';
  const { kept, dropped } = verifyPoints([
    { point: 'A Microsoft deal', quote: '“The Company entered into a multi-year agreement with Microsoft for 200 MW”' },
    { point: 'Elided but real', quote: 'entered into a multi-year agreement … Deliveries begin in 2027' },
    { point: 'Paraphrased', quote: 'The Company signed a multi-year Microsoft contract for 200 MW' },
    { point: 'Pieces out of order', quote: 'Deliveries begin in 2027 … entered into a multi-year agreement' },
    { point: 'Too short to prove anything', quote: 'MW' }
  ], text);
  assert.deepEqual(kept.map(p => p.point), ['A Microsoft deal', 'Elided but real']);
  assert.equal(dropped, 3);
});

test('only EDGAR archive documents of tracked companies can be digested', () => {
  const ok = parseFilingUrl('https://www.sec.gov/Archives/edgar/data/1878848/000187884826000123/iren-20260930.htm', CIKS);
  assert.equal(ok.cik, '1878848');
  assert.equal(ok.dir, 'https://www.sec.gov/Archives/edgar/data/1878848/000187884826000123/');
  for (const bad of [
    'https://www.sec.gov/Archives/edgar/data/320193/000032019326000001/aapl.htm',      // not tracked
    'http://www.sec.gov/Archives/edgar/data/1878848/000187884826000123/iren.htm',       // not https
    'https://evil.example/Archives/edgar/data/1878848/000187884826000123/iren.htm',     // not EDGAR
    'https://www.sec.gov/Archives/edgar/data/1878848/000187884826000123/../x.htm',      // traversal
    'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany', 'not a url'
  ]) assert.equal(parseFilingUrl(bad, CIKS), null, bad);
});

test('a current report is read through its press-release exhibit, found by type not by name', () => {
  // IREN's FY26 results 8-K names its exhibit irenreportsfy26results.htm — no "ex99" in sight.
  const row = (n, type, doc) => `<tr><td scope="row">${n}</td><td scope="row">${type}</td><td scope="row"><a href="/Archives/x/${doc}">${doc}</a></td><td scope="row">${type}</td><td>1</td></tr>`;
  const html = `<table class="tableFile">${row(1, '8-K', 'iren-20260827.htm')}${row(2, 'EX-99.1', 'irenreportsfy26results.htm')}
    ${row(3, 'EX-10.1', 'loan.htm')}${row(4, 'EX-99.2', 'deck.htm')}${row(5, 'EX-99.3', 'third.htm')}${row(6, 'GRAPHIC', 'a.jpg')}</table>`;
  assert.deepEqual(pickExhibits(html, 'iren-20260827.htm'), ['irenreportsfy26results.htm', 'deck.htm']);
  assert.deepEqual(pickExhibits('', 'x.htm'), []);
  assert.equal(indexUrl(parseFilingUrl('https://www.sec.gov/Archives/edgar/data/1878848/000187884826000051/iren-20260827.htm', CIKS)),
    'https://www.sec.gov/Archives/edgar/data/1878848/000187884826000051/0001878848-26-000051-index.html');
});

test('the digest schema is strict: a headline and points that each carry a quote', () => {
  assert.equal(DIGEST_SCHEMA.additionalProperties, false);
  assert.deepEqual(DIGEST_SCHEMA.items?.required ?? DIGEST_SCHEMA.properties.points.items.required, ['point', 'quote']);
});
