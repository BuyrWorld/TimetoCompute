/**
 * Consumer subscriptions: what each plan costs, by country, and which
 * models it includes.
 *
 * Two kinds of price, never mixed up:
 *   web    the provider's own pricing page, in the currency it showed
 *          (USD unless a UK reading is all it gave, which is said)
 *   store  the provider's App Store in-app price in each country
 *          (data/appstore-prices.json, read 25 Oct 2026). These are set by
 *          the provider per storefront, include local tax, and can carry
 *          Apple's margin: Claude Max 5x is $100 on the web, $124.99 in-app.
 * `store` names the App Store item, matched exactly; where the same name
 * appears twice (monthly and annual), the lower price is the monthly one.
 */
import STORE from './appstore-prices.json' with { type: 'json' };

export const STOREFRONTS = [
  { cc: 'us', name: 'United States', currency: 'USD', locale: 'en-US' },
  { cc: 'gb', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB' },
  { cc: 'de', name: 'Germany', currency: 'EUR', locale: 'de-DE' },
  { cc: 'fr', name: 'France', currency: 'EUR', locale: 'fr-FR' },
  { cc: 'ca', name: 'Canada', currency: 'CAD', locale: 'en-CA' },
  { cc: 'au', name: 'Australia', currency: 'AUD', locale: 'en-AU' },
  { cc: 'in', name: 'India', currency: 'INR', locale: 'en-IN' },
  { cc: 'jp', name: 'Japan', currency: 'JPY', locale: 'ja-JP' },
  { cc: 'br', name: 'Brazil', currency: 'BRL', locale: 'pt-BR' },
  { cc: 'sg', name: 'Singapore', currency: 'SGD', locale: 'en-SG' }
];

export const STORE_ACCESSED = STORE.accessedAt;

const plan = (name, o) => ({ name, ...o });

export const PLAN_PROVIDERS = [
  { id: 'openai', name: 'ChatGPT', app: 'chatgpt', src: 'chatgpt-pricing', plans: [
    plan('Free', { web: { usd: 0 }, models: 'GPT-6 Luna' }),
    plan('Go', { web: { gbp: 7 }, store: 'ChatGPT Go', models: 'GPT-6 Luna, with more messages' }),
    plan('Plus', { web: { usd: 20, gbp: 20, src: 'chatgpt-plus-help' }, store: 'ChatGPT Plus', models: 'GPT-6 Astra, GPT-6.1 Sol, GPT-6 Luna' }),
    plan('Pro', { web: { usd: 100, gbp: 89, from: true }, store: 'ChatGPT Pro 100', models: '“Pro reasoning powered by GPT-6 Astra”; three usage tiers' })
  ] },
  { id: 'anthropic', name: 'Claude', app: 'claude', src: 'claude-pricing', plans: [
    plan('Free', { web: { usd: 0 }, models: 'Sonnet, Haiku' }),
    plan('Pro', { web: { usd: 20 }, store: 'Claude Pro - Monthly', models: 'Opus, Sonnet, Haiku; Fable through usage credits; Claude Code' }),
    plan('Max 5x', { web: { usd: 100, from: true }, store: 'Claude Max 5x - Monthly', models: 'Everything in Pro; Fable at 50% of weekly limits' }),
    plan('Max 20x', { web: {}, store: 'Claude Max 20x - Monthly', models: 'As Max 5x, with 20x Pro\'s usage' })
  ] },
  { id: 'google', name: 'Google AI', app: 'gemini', src: 'google-plans', plans: [
    plan('Free', { web: { gbp: 0 }, models: 'Flash-Lite, Deep Research, Gemini Live' }),
    plan('AI Plus', { web: { gbp: 4.49 }, store: 'Google AI Plus (400 GB)', models: 'Flash; 400 GB storage' }),
    plan('AI Pro', { web: { gbp: 18.99 }, store: 'Google AI Pro (5 TB)', models: 'Gemini 4 Argon, Deep Research, Omni Flash; 5 TB storage' }),
    plan('AI Ultra', { web: { gbp: 79.99, from: true }, store: 'Google AI Ultra (30 TB)', models: 'Highest Gemini 4 Argon access; Veo 3.1; from 20 TB storage' })
  ] },
  { id: 'xai', name: 'Grok', app: 'grok', src: 'appstore', plans: [
    plan('SuperGrok Lite', { web: {}, store: 'SuperGrok Lite', models: 'Not itemised by xAI' }),
    plan('SuperGrok', { web: {}, store: 'SuperGrok', models: '“Higher limits and multi-agent reasoning”' }),
    plan('SuperGrok Plus', { web: {}, store: 'SuperGrok Plus', models: 'Not itemised by xAI' }),
    plan('SuperGrok Heavy', { web: {}, store: 'SuperGrok Heavy', models: 'Not itemised by xAI' })
  ] },
  { id: 'mistral', name: 'Le Chat / Vibe', app: 'mistral', src: 'mistral-pricing', plans: [
    plan('Free', { web: { usd: 0 }, models: 'Limited messages and coding sessions' }),
    plan('Pro', { web: { usd: 14.99 }, store: 'Vibe Pro', models: 'More messages, all-day coding, $15 a month in API credits' }),
    plan('Team', { web: { usd: 24.99, perSeat: true }, models: 'Higher limits, 30 GB storage per user' })
  ] },
  { id: 'microsoft', name: 'Microsoft 365 with Copilot', app: 'copilot', src: 'microsoft-365-plans', plans: [
    plan('Personal', { web: { usd: 9.99 }, store: 'Microsoft 365 Personal', models: 'Copilot features; Microsoft names no model' }),
    plan('Family', { web: { usd: 12.99 }, store: 'Microsoft 365 Family', models: 'Copilot for the subscription owner only' }),
    plan('Premium', { web: { usd: 19.99 }, store: 'Microsoft 365 Premium Monthly', models: 'Copilot features; Microsoft names no model' })
  ] }
];

/** Free apps with no paid plan on the App Store: said, not left blank. */
export const FREE_APPS = [
  { name: 'Meta AI', note: 'Free; the App Store lists no paid plan', src: 'appstore' },
  { name: 'DeepSeek', note: 'Free; the App Store lists no paid plan', src: 'appstore' }
];

/** A storefront price string to a number, only to tell monthly from annual. */
export function parsePrice(s) {
  const t = String(s).replace(/[^\d.,]/g, '');
  const m = t.match(/[.,](\d{1,2})$/);
  const whole = (m ? t.slice(0, -m[0].length) : t).replace(/[.,]/g, '');
  return Number(whole + (m ? '.' + m[1] : ''));
}

/** The App Store price for one plan in one country, or null if Apple does not list it there. */
export function storePrice(app, cc, item) {
  const rows = (STORE.apps[app]?.countries[cc] || []).filter(r => r.name.trim() === item);
  if (!rows.length) return null;
  return rows.sort((a, b) => parsePrice(a.price) - parsePrice(b.price))[0].price;
}

export const STORE_APPS = Object.fromEntries(Object.entries(STORE.apps).map(([k, v]) => [k, v.id]));
