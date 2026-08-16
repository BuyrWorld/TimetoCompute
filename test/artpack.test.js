/**
 * Art-pack foundation tests.
 *
 * The pack's image rules are easy to agree with and easy to break silently: a
 * stylesheet edit stretches a cutout, a new card ships without dimensions and
 * the layout jumps, or somebody points an <img> at a reference screenshot
 * because it looks like the finished page. None of those fail a build on their
 * own. These tests make each one loud.
 *
 * Optical centring is NOT checked here — it needs a real browser and lives in
 * scripts/centring.js. This file covers the rules that are visible in the
 * markup and the manifest.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ART, ART_BY_ID, STAGE_ART, PHOTONICS_ART, EDITORIAL_ART } from '../data/artpack.js';
import { cutout, opticsStyle } from '../src/chain-ui.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = rel => fs.readFileSync(path.join(ROOT, 'dist', rel), 'utf8');
const onDisk = rel => fs.existsSync(path.join(ROOT, rel.replace(/^\//, '')));

/* ---- the manifest matches the disk ---- */

test('every declared derivative exists on disk', () => {
  for (const a of ART) {
    for (const w of a.widths) {
      assert.ok(onDisk(`${a.base}-${w}.webp`), `${a.id}: missing ${a.base}-${w}.webp`);
    }
    if (a.fallbackWidth) {
      assert.ok(onDisk(`${a.base}-${a.fallbackWidth}.png`), `${a.id}: missing PNG fallback`);
    }
  }
});

test('the pack is fully declared: 7 stages, 6 photonics parts, 1 editorial image', () => {
  assert.equal(STAGE_ART.length, 7);
  assert.equal(PHOTONICS_ART.length, 6);
  assert.equal(EDITORIAL_ART.length, 1);
  assert.equal(ART.length, 14);
});

/* ---- reference mockups may never ship ---- */

test('no declared asset points at a reference mockup', () => {
  for (const a of ART) {
    assert.ok(!/reference-mockup/i.test(a.base), `${a.id} points at a mockup`);
  }
});

test('no built page references a mockup, a pack folder or a Sprites path', () => {
  const pages = fs.readdirSync(path.join(ROOT, 'dist'), { recursive: true })
    .filter(f => typeof f === 'string' && (f.endsWith('.html') || f.endsWith('.css') || f.endsWith('.js')));
  for (const f of pages) {
    const html = read(f);
    for (const bad of ['reference-mockup', 'asset-pack', 'Sprites/', 'earlier-concepts', 'current-site/']) {
      assert.ok(!html.includes(bad), `${f} references ${bad}, which must never ship`);
    }
  }
});

test('nothing from reference-mockups was copied into the shipped asset tree', () => {
  const walk = d => fs.readdirSync(d, { recursive: true }).map(String);
  for (const f of walk(path.join(ROOT, 'dist', 'assets'))) {
    assert.ok(!/mockup|concept|current-site/i.test(f), `dist/assets contains ${f}`);
  }
});

/* ---- the image rules ---- */

test('every cutout ships explicit intrinsic dimensions, so the layout cannot shift', () => {
  for (const a of ART) {
    const html = cutout(a.id);
    assert.match(html, new RegExp(`width="${a.intrinsic[0]}"`), `${a.id} omits width`);
    assert.match(html, new RegExp(`height="${a.intrinsic[1]}"`), `${a.id} omits height`);
  }
});

test('every cutout offers WebP derivatives and a real srcset', () => {
  for (const a of ART) {
    const html = cutout(a.id);
    for (const w of a.widths) {
      assert.ok(html.includes(`${a.base}-${w}.webp ${w}w`), `${a.id} omits the ${w}w derivative`);
    }
  }
});

test('a cutout is lazy unless it is explicitly the LCP image', () => {
  assert.match(cutout('materials'), /loading="lazy"/);
  assert.ok(!/loading="lazy"/.test(cutout('materials', { eager: true })));
  assert.match(cutout('materials', { eager: true }), /fetchpriority="high"/);
});

test('an unknown asset id throws rather than emitting a broken image', () => {
  assert.throws(() => cutout('not-a-real-asset'), /Unknown art asset/);
});

test('alt text is real, and only an explicitly decorative use may be empty', () => {
  for (const a of ART) {
    assert.ok(a.alt.length > 8, `${a.id} has thin alt text`);
    // A decorative duplicate passes alt: '' deliberately; nothing else may.
    assert.match(cutout(a.id), new RegExp(`alt="${a.alt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(cutout(a.id, { alt: '' }), /alt=""/);
  }
});

/* ---- optics are data, not scattered CSS ---- */

test('every stage emits its optical correction as custom properties', () => {
  for (const a of STAGE_ART) {
    const s = opticsStyle(a.id);
    assert.match(s, /--asset-scale:/, `${a.id} emits no scale`);
    assert.match(s, /--asset-x:/, `${a.id} emits no x offset`);
    assert.match(s, /--asset-y:/, `${a.id} emits no y offset`);
  }
});

test('an unmanifested asset falls back to neutral optics rather than shifting', () => {
  assert.equal(opticsStyle('not-a-real-asset'), '--asset-scale:1;--asset-x:0%;--asset-y:0%');
});

test('the built chain carries per-node optics, not one blanket nudge', () => {
  const html = read('index.html');
  const styles = [...html.matchAll(/<li class="cn-node[\s\S]{0,120}?style="([^"]+)"/g)].map(m => m[1]);
  assert.equal(styles.length, 7, `expected 7 nodes with optics, found ${styles.length}`);
  // If every node carried the same correction it would be a global fudge again.
  assert.ok(new Set(styles).size > 1, 'all seven nodes share one correction');
});

test('no stylesheet reintroduces a per-stage margin hack', () => {
  const css = read('styles.css');
  assert.ok(!/object-fit:\s*fill/.test(css), 'object-fit: fill is forbidden by the pack');
  assert.ok(!/\.cn-node\[data-stage=/.test(css),
    'a stage is being corrected in CSS; corrections belong in data/artpack.js');
});

/* ---- ceilings ---- */

test('no asset can be displayed above its manifest ceiling without upscaling', () => {
  for (const a of ART) {
    const largest = Math.max(...a.widths);
    const reach = a.fallbackWidth ? Math.max(largest, a.fallbackWidth) : largest;
    assert.ok(reach >= a.maxCssWidth,
      `${a.id}: ceiling ${a.maxCssWidth}px exceeds the largest file ${reach}px`);
  }
});

/* ---- motion tokens exist ---- */

test('the pack\'s motion durations are defined, not just referenced as fallbacks', () => {
  const css = read('styles.css');
  for (const t of ['--t2c-press', '--t2c-fast', '--t2c-med', '--t2c-reveal', '--t2c-ease']) {
    assert.match(css, new RegExp(`${t}\\s*:`), `${t} is used but never defined`);
  }
});

test('reduced motion collapses the duration tokens rather than each transition', () => {
  const css = read('styles.css');
  const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*:root \{([^}]+)\}/);
  assert.ok(block, 'no reduced-motion override for the duration tokens');
  assert.match(block[1], /--t2c-fast:\s*1ms/);
});
