// Run: node scripts/appstore-prices.mjs — refreshes data/appstore-prices.json for the models page.
// Collects each AI app's App Store in-app purchase list (plan name + local price) for ten countries.
// Output is a dated snapshot; every price is the provider's own App Store price in that storefront.
import fs from 'node:fs';
const APPS = { chatgpt: 6448311069, claude: 6473753684, gemini: 6477489729, grok: 6670324846, mistral: 6740410176,
  copilot: 541164041, metaai: 1558240027, deepseek: 6737597349 };
const CC = ['us', 'gb', 'de', 'fr', 'ca', 'au', 'in', 'jp', 'br', 'sg'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36';
const PAIR = /\{"\$kind":"textPair","leadingText":"((?:[^"\\]|\\.)*)","trailingText":"((?:[^"\\]|\\.)*)"\}/g;
const out = { accessedAt: new Date().toISOString().slice(0, 10), source: 'Apple App Store listing, In-App Purchases', apps: {} };
for (const [app, id] of Object.entries(APPS)) {
  out.apps[app] = { id, url: `https://apps.apple.com/us/app/id${id}`, countries: {} };
  for (const cc of CC) {
    try {
      const html = await (await fetch(`https://apps.apple.com/${cc}/app/id${id}?l=en`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })).text();
      const at = html.indexOf('"title":"In-App Purchases"');
      const win = at < 0 ? '' : html.slice(at, at + 4000);
      const items = [...win.matchAll(PAIR)].map(m => ({ name: JSON.parse(`"${m[1]}"`), price: JSON.parse(`"${m[2]}"`) }));
      out.apps[app].countries[cc] = items;
      process.stdout.write(`${app}/${cc}:${items.length} `);
    } catch (e) { out.apps[app].countries[cc] = null; process.stdout.write(`${app}/${cc}:ERR(${e.message.slice(0, 30)}) `); }
    await new Promise(r => setTimeout(r, 400));
  }
}
fs.writeFileSync('data/appstore-prices.json', JSON.stringify(out, null, 1));
console.log('\nsaved');
