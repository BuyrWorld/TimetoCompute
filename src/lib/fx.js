/**
 * Exchange rates for showing a US-dollar API price in a reader's currency.
 *
 * The European Central Bank's daily euro reference rates, fetched at build
 * time (the daily rebuild keeps them current; no key is needed). If the ECB
 * cannot be reached the last reading below is used, and the page names the
 * date either way. Converted prices are always labelled as conversions: a
 * provider's own local price, where one exists, is shown instead.
 */
const SNAPSHOT = {
  date: '2026-10-23',
  perEur: { USD: 1.1193, GBP: 0.83728, JPY: 175.51, INR: 106.272, CAD: 1.5665, AUD: 1.5939, BRL: 5.6485, SGD: 1.4310 }
};

export async function ecbRates({ log = () => {} } = {}) {
  try {
    const r = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
    if (!r.ok) throw new Error(`ECB answered ${r.status}`);
    const xml = await r.text();
    const date = (xml.match(/time='(\d{4}-\d{2}-\d{2})'/) || [])[1];
    const perEur = {};
    for (const m of xml.matchAll(/currency='([A-Z]{3})' rate='([\d.]+)'/g)) perEur[m[1]] = Number(m[2]);
    if (!date || !perEur.USD) throw new Error('unexpected ECB format');
    log(`  exchange rates: ECB ${date}`);
    return { date, perEur, live: true };
  } catch (e) {
    log(`  exchange rates: using the ${SNAPSHOT.date} snapshot (${e.message})`);
    return { ...SNAPSHOT, live: false };
  }
}

/** Units of `currency` per US dollar. */
export const perUsd = (fx, currency) => currency === 'USD' ? 1 : currency === 'EUR' ? 1 / fx.perEur.USD : fx.perEur[currency] / fx.perEur.USD;
