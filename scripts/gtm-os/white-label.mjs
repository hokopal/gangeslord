#!/usr/bin/env node
/**
 * white-label.mjs — build the Pipemouse GTM OS source tree from the pinned
 * open-source upstream snapshot.
 *
 * What it does, in order:
 *   1. Download the pinned upstream tarball from codeload.github.com
 *   2. Extract it into --out
 *   3. Delete upstream-only packages (marketing website, docs site,
 *      desktop companion app) and upstream crowd-translation configs
 *   4. Rename directories & files containing the upstream brand
 *   5. Rewrite text files (`twenty` -> `pipemouse`, case-aware), preserving
 *      LICENSE files, the repo's attribution files and every line that
 *      carries a copyright / Enterprise-license notice
 *   6. Post-process the root package.json (drop scripts/workspaces that
 *      referenced the deleted packages)
 *   7. Overwrite upstream brand assets (logos/marks/icons) with Pipemouse
 *      artwork from ./assets
 *   8. Write NOTICE.md, TRADEMARK.md, README.md, PIPEMPOUSE_ABSORB_NOTES.md
 *   9. Audit: JSON-parse every package.json, list files still containing
 *      the upstream brand (allowlisted: license & attribution files)
 *
 * Usage:
 *   node scripts/gtm-os/white-label.mjs --out /path/to/pipemouse [options]
 *
 * Options:
 *   --out <dir>        Output directory (required; must be empty or --force)
 *   --repo-slug <o/n>  GitHub slug used in manifests/URLs (default hokopal/pipemouse)
 *   --ref <sha|tag>    Upstream ref to fetch (default: pinned commit)
 *   --force            Allow writing into a non-empty --out dir
 *   --git              git init + single commit in the output dir
 *   --keep-tarball     Keep the downloaded tarball next to the output
 */

import { execFileSync, execSync } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const PINNED_REF = '403bbfc1873288a985bc5ee9b443d1716fc3e2dd';
const UPSTREAM = 'twentyhq/twenty';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(SCRIPT_DIR, 'assets');

// ---------------------------------------------------------------- args ----
const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}
const outDir = argValue('--out');
const repoSlug = argValue('--repo-slug') ?? 'hokopal/pipemouse';
const owner = repoSlug.split('/')[0];
const ref = argValue('--ref') ?? PINNED_REF;
const force = args.includes('--force');
const withGit = args.includes('--git');
const keepTarball = args.includes('--keep-tarball');

if (!outDir) {
  console.error('error: --out <dir> is required');
  process.exit(1);
}
if (!/^[a-z0-9-]+\/[a-z0-9._-]+$/i.test(repoSlug)) {
  console.error(`error: --repo-slug must look like "owner/name", got "${repoSlug}"`);
  process.exit(1);
}

const log = (msg) => console.log(`  ✓ ${msg}`);
const step = (msg) => console.log(`\n==> ${msg}`);
const deletionNotes = [];
const reviewNotes = [];
const overwritten = [];

// ---------------------------------------------------------- helpers ----
async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

async function isBinary(file) {
  const handle = await fs.open(file, 'r');
  try {
    const buf = Buffer.alloc(8192);
    const { bytesRead } = await handle.read(buf, 0, 8192, 0);
    for (let i = 0; i < bytesRead; i++) if (buf[i] === 0) return true;
    return false;
  } finally {
    await handle.close();
  }
}

/** Case-aware upstream-brand -> Pipemouse rewrite for one string. */
function rebrand(input) {
  return input
    .replace(/twentyhq\/twenty/g, repoSlug)
    .replace(/github\.com\/twentyhq/g, `github.com/${owner}`)
    .replace(/codeload\.github\.com\/twentyhq/g, `codeload.github.com/${owner}`)
    .replace(/twentyhq/g, owner)
    .replace(/twentycrm/g, 'pipemouse')
    .replace(/twenty\.com/g, 'pipemouse.com')
    .replace(/\bTWENTY\b/g, 'PIPEMPOUSE')
    .replace(/\bTwenty\b/g, 'Pipemouse')
    .replace(/\btwenty\b/g, 'pipemouse')
    // compound identifiers: TWENTY_FOO, twenty_foo, twentyConfigService, this.twentyormexception …
    // (safe: English prose uses of the word only existed in the deleted docs/website)
    .replace(/TWENTY/g, 'PIPEMPOUSE')
    .replace(/Twenty/g, 'Pipemouse')
    .replace(/twenty/g, 'pipemouse');
}

const isAttributionFile = (rel) =>
  /(^|\/)((LICENSE|NOTICE|COPYRIGHT|AUTHORS|CODEOWNERS)(\..*)?|README\.md)$/i.test(rel) ||
  rel === 'PIPEMPOUSE_ABSORB_NOTES.md';

/** Lines that carry legal attribution must survive byte-identical. */
const isProtectedLine = (line) =>
  /copyright|@license\s+enterprise|all rights reserved|warranty of any kind/i.test(line);

function rebrandPreservingAttribution(contents) {
  return contents
    .split('\n')
    .map((line) => (isProtectedLine(line) ? line : rebrand(line)))
    .join('\n');
}

const rel = (base, full) => path.relative(base, full).split(path.sep).join('/');

// -------------------------------------------------------- main flow ----
console.log(`Pipemouse white-label build`);
console.log(`  upstream : github.com/${UPSTREAM} @ ${ref}`);
console.log(`  output   : ${outDir}`);
console.log(`  repo slug: ${repoSlug}`);

// 0. output dir -------------------------------------------------------
if (existsSync(outDir)) {
  const entries = await fs.readdir(outDir);
  if (entries.length > 0 && !force) {
    console.error(`error: --out ${outDir} is not empty (use --force to overwrite)`);
    process.exit(1);
  }
} else {
  await fs.mkdir(outDir, { recursive: true });
}

// 1. download -----------------------------------------------------------
step('Download upstream snapshot');
let tarball;
const localTarball = process.env.PIPEMPOUSE_TARBALL;
if (localTarball && existsSync(localTarball)) {
  tarball = path.join(path.dirname(outDir), `pipemouse-upstream-${ref.slice(0, 12)}.tar.gz`);
  execFileSync('cp', [localTarball, tarball]);
  console.log(`  using local tarball ${localTarball}`);
} else {
  tarball = path.join(path.dirname(outDir), `pipemouse-upstream-${ref.slice(0, 12)}.tar.gz`);
}
const url = `https://codeload.github.com/${UPSTREAM}/tar.gz/${ref}`;
console.log(`  GET ${url}`);
let downloaded = false;
if (localTarball && existsSync(localTarball)) {
  downloaded = true;
} else {
  try {
    execFileSync('curl', ['-fsSL', '--retry', '3', '-o', tarball, url], { stdio: 'inherit' });
    downloaded = true;
  } catch {
    console.log('  curl failed, falling back to fetch');
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      console.error(`error: download failed (${res.status} ${res.statusText})`);
      process.exit(1);
    }
    await pipeline(res.body, createWriteStream(tarball));
    downloaded = true;
  }
}
if (!downloaded) {
  console.error('error: could not download upstream snapshot');
  process.exit(1);
}
log(`downloaded ${(await fs.stat(tarball)).size} bytes`);

// 2. extract ------------------------------------------------------------
step('Extract');
execFileSync('tar', ['-xzf', tarball, '-C', outDir, '--strip-components=1'], { stdio: 'inherit' });
log('extracted');

// 3. delete upstream-only packages --------------------------------------
step('Remove upstream-only packages');
const deletions = [
  'packages/twenty-website',
  'packages/twenty-docs',
  'packages/twenty-companion',
  '.github/workflows', // upstream CI/CD — references upstream infra, secrets and deploy targets
  '.github/actions',   // only used by the deleted workflows
  '.github/CLA.md',    // legal grant to Twenty.com PBC — meaningless for Pipemouse
  '.github/TRADEMARK.md', // upstream trademark policy, not ours
  '.github/oss-scanner',
  '.github/crowdin-app.yml',
  '.github/crowdin-docs.yml',
  '.github/crowdin-website.yml',
];
for (const d of deletions) {
  const target = path.join(outDir, d);
  if (existsSync(target)) {
    await fs.rm(target, { recursive: true, force: true });
    log(`removed ${d}`);
    deletionNotes.push(`Deleted \`${d}\` (upstream-only).`);
  }
}

// 4. rename paths containing the brand -----------------------------------
step('Rename branded directories & files');
async function collectPaths(root) {
  const all = [];
  async function rec(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await rec(full);
        all.push(full);
      } else {
        all.push(full);
      }
    }
  }
  await rec(root);
  // deepest first so children are renamed before their parents
  return all.sort((a, b) => b.length - a.length);
}
let renamedCount = 0;
for (const full of await collectPaths(outDir)) {
  const base = path.basename(full);
  if (!/twenty/i.test(base)) continue;
  const newBase = rebrand(base);
  if (newBase === base) continue;
  const target = path.join(path.dirname(full), newBase);
  await fs.rename(full, target);
  renamedCount++;
}
log(`renamed ${renamedCount} paths`);

// 5. text rewrite --------------------------------------------------------
step('Rewrite text files');
let filesRewritten = 0;
let linesKept = 0;
for await (const file of walk(outDir)) {
  const r = rel(outDir, file);
  if (isAttributionFile(r)) continue;
  if (/^LICENSE/i.test(path.basename(file))) continue;
  if (await isBinary(file)) continue;
  const original = await fs.readFile(file, 'utf8');
  const next = rebrandPreservingAttribution(original);
  if (next !== original) {
    for (const [i, line] of original.split('\n').entries()) {
      if (isProtectedLine(line) && rebrand(line) !== line) linesKept++;
    }
    await fs.writeFile(file, next);
    filesRewritten++;
  }
}
log(`rewrote ${filesRewritten} files (${linesKept} attribution lines preserved)`);

// 6. root package.json post-processing -----------------------------------
step('Clean root package.json');
const rootPkgPath = path.join(outDir, 'package.json');
const rootPkg = JSON.parse(await fs.readFile(rootPkgPath, 'utf8'));
const removedRefs = [];
if (rootPkg.scripts) {
  for (const key of Object.keys(rootPkg.scripts)) {
    if (key.startsWith('docs:') || /pipemouse-(website|docs|companion)/.test(rootPkg.scripts[key])) {
      removedRefs.push(`script "${key}"`);
      delete rootPkg.scripts[key];
    }
  }
}
if (rootPkg.workspaces?.packages) {
  const before = rootPkg.workspaces.packages.length;
  rootPkg.workspaces.packages = rootPkg.workspaces.packages.filter(
    (p) => !/pipemouse-(website|docs|companion)/.test(p),
  );
  removedRefs.push(`${before - rootPkg.workspaces.packages.length} workspace entries`);
}
await fs.writeFile(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
log(`removed ${removedRefs.join(', ') || 'nothing'}`);

// 7. overwrite brand assets ----------------------------------------------
step('Overwrite brand assets');
const BRAND_ROOTS = ['packages/pipemouse-front', 'packages/pipemouse-emails', 'packages/pipemouse-agent-skills', 'packages/pipemouse-cli', 'packages/pipemouse-docker', 'packages/pipemouse-ui'];
const markSvg = await fs.readFile(path.join(ASSETS, 'pipemouse-mark.svg'));
const logoSvg = await fs.readFile(path.join(ASSETS, 'pipemouse-logo.svg'));
const markPng = await fs.readFile(path.join(ASSETS, 'pipemouse-mark.png'));
const assetPattern = /(logo|logomark|favicon|og-image|apple-touch-icon)[^/]*\.(svg|png|ico|jpg)$/i;
for (const root of BRAND_ROOTS) {
  const abs = path.join(outDir, root);
  if (!existsSync(abs)) {
    console.log(`  ! brand root missing, skipped: ${root}`);
    continue;
  }
  let before = overwritten.length;
  for await (const file of walk(abs)) {
    const r = rel(outDir, file);
    if (!assetPattern.test(path.basename(file))) continue;
    const ext = path.extname(file).toLowerCase().slice(1); // strip leading dot
    if (ext === 'svg') {
      const isWordmark = /logo/i.test(path.basename(file));
      await fs.writeFile(file, isWordmark ? logoSvg : markSvg);
      overwritten.push(r);
    } else if (ext === 'png' || ext === 'jpg') {
      await fs.writeFile(file, markPng);
      overwritten.push(r);
    } else if (ext === 'ico') {
      reviewNotes.push(`Needs a designer \`.ico\`: \`${r}\` (left as upstream artwork — script cannot author .ico).`);
    }
  }
  console.log(`  ${root}: ${overwritten.length - before} assets`);
}
log(`overwrote ${overwritten.length} brand assets`);

// 8. write meta files -----------------------------------------------------
step('Write NOTICE / TRADEMARK / README / notes');
await fs.copyFile(path.join(ASSETS, 'NOTICE.md'), path.join(outDir, 'NOTICE.md'));
await fs.copyFile(path.join(ASSETS, 'README.pipemouse.md'), path.join(outDir, 'README.md'));
await fs.writeFile(
  path.join(outDir, 'TRADEMARK.md'),
  `Pipemouse Trademark Policy\n========================\n\n"Pipemouse" and the Pipemouse logo are trademarks of Pipemouse. You may use\nthem to refer to this project (e.g. "Pipemouse GTM OS"), not to imply\nendorsement.\n\nUpstream attribution\n--------------------\n\nThis product is a white-labeled distribution of an open-source project\noriginally released by its authors under the GNU AGPL-3.0. The upstream\nproject's name and logos (referenced in LICENSE, NOTICE and per-file\ncopyright headers as required) are trademarks of their respective owner and\nare NOT used as Pipemouse branding. Do not reintroduce them into the user\ninterface, marketing, or package names.\n`,
);
deletionNotes.push('Upstream CI/CD (.github/workflows, .github/actions), CLA and upstream TRADEMARK policy removed — create your own CI; nothing in the product depends on them.');
reviewNotes.push('Files marked `@license Enterprise` remain in the tree but are commercial material; do not use them in hosted offerings without a commercial license.');
reviewNotes.push('Call-recorder example frames under `packages/pipemouse-apps/public/call-recorder/` may depict the upstream UI — review before featuring that example.');
const notesFile = [
  '# Pipemouse absorb — generated notes',
  '',
  `Generated from github.com/${UPSTREAM} @ \`${ref}\` on ${new Date().toISOString().slice(0, 10)}.`,
  '',
  '## What was removed',
  ...deletionNotes.map((n) => `- ${n}`),
  '',
  '## Brand assets overwritten',
  ...overwritten.map((o) => `- ${o}`),
  '',
  '## Manual review checklist',
  ...reviewNotes.map((n) => `- [ ] ${n}`),
  '- [ ] Root `engines`: upstream pins Node per package.json — verify your toolchain matches or relax the pin.',
  '- [ ] Point CI at \`hokopal/pipemouse\` (or your fork) and replace upstream badge URLs in README.',
  '- [ ] Replace generated PNG mark with final artwork.',
  '',
].join('\n');
await fs.writeFile(path.join(outDir, 'PIPEMPOUSE_ABSORB_NOTES.md'), notesFile);
log('wrote NOTICE.md, TRADEMARK.md, README.md, PIPEMPOUSE_ABSORB_NOTES.md');

// 9. audit -----------------------------------------------------------------
step('Audit');
const pkgJsons = [];
for await (const file of walk(outDir)) {
  if (path.basename(file) === 'package.json') pkgJsons.push(file);
}
let badJson = 0;
for (const f of pkgJsons) {
  try {
    JSON.parse(await fs.readFile(f, 'utf8'));
  } catch {
    console.error(`  ✗ invalid JSON: ${rel(outDir, f)}`);
    badJson++;
  }
}
log(`${pkgJsons.length - badJson}/${pkgJsons.length} package.json files parse`);

const leftoversReal = [];
const leftoversAttribution = [];
for await (const file of walk(outDir)) {
  const r = rel(outDir, file);
  if (isAttributionFile(r)) continue;
  if (/^LICENSE/i.test(path.basename(file))) continue;
  if (await isBinary(file)) continue;
  const text = await fs.readFile(file, 'utf8');
  const brandLines = text.split('\n').filter((l) => /twenty/i.test(l));
  if (brandLines.length === 0) continue;
  // files whose only remaining hits are protected attribution lines are fine
  (brandLines.some((l) => !isProtectedLine(l)) ? leftoversReal : leftoversAttribution).push(r);
}
const auditFile = [
  '',
  '## Audit',
  `- Files with upstream-brand tokens introduced by non-attribution text (must be 0): ${leftoversReal.length}`,
  ...leftoversReal.map((l) => `  - ${l}`),
  `- Attribution-only leftovers (copyright / Enterprise license lines, preserved verbatim): ${leftoversAttribution.length}`,
  ...leftoversAttribution.map((l) => `  - ${l}`),
  '',
].join('\n');
await fs.appendFile(path.join(outDir, 'PIPEMPOUSE_ABSORB_NOTES.md'), auditFile);
if (leftoversReal.length) {
  console.log(`  ! ${leftoversReal.length} files still contain non-attribution upstream brand tokens — see PIPEMPOUSE_ABSORB_NOTES.md`);
} else {
  log(`no upstream brand tokens outside attribution (${leftoversAttribution.length} files keep attribution lines)`);
}

// 10. optional git ---------------------------------------------------------
if (withGit) {
  step('git init');
  execSync('git init -b main', { cwd: outDir, stdio: 'inherit' });
  execSync('git config user.name "Pipemouse"', { cwd: outDir });
  execSync('git config user.email "noreply@pipemouse.com"', { cwd: outDir });
  execSync('git add -A', { cwd: outDir, stdio: 'inherit' });
  execSync('git commit -m "Import Pipemouse GTM OS (white-labeled, pinned upstream)"', { cwd: outDir, stdio: 'inherit', maxBuffer: 64 * 1024 * 1024 });
  log('committed');
}

if (!keepTarball) await fs.rm(tarball, { force: true });

console.log('\nDone. Next steps:');
console.log('  1. cd ' + outDir);
console.log('  2. corepack enable && yarn install');
console.log('  3. docker compose -f packages/pipemouse-docker/docker-compose.dev.yml up -d');
console.log('  4. cp packages/pipemouse-server/.env.example .env  # fill secrets');
console.log('  5. yarn start');
console.log('Keep the source repository public (AGPL-3.0 source offer) and link it from your app footer.');
process.exit(badJson > 0 || leftoversReal.length > 0 ? 2 : 0);
