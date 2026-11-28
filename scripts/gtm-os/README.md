# Pipemouse GTM OS — white-label absorb

This folder generates **Pipemouse GTM OS**: a complete, rebranded copy of the
open-source CRM that Pipemouse forks as its go-to-market operating system
(CRM + AI agents + workflows + APIs), pinned to a known-good upstream commit.

It exists because this Arena sandbox's GitHub token can **read** public repos
but cannot **create or fork** repos, and the rebranded tree is ~370 MB — too
big to live in this product repo. The script performs the absorb on any
machine with network access to GitHub: you get a ready-to-push source tree,
Pipemouse-branded, with attribution handled correctly.

## One command

```bash
node scripts/gtm-os/white-label.mjs --out ../pipemouse
```

Then:

```bash
cd ../pipemouse
corepack enable && yarn install
docker compose -f packages/pipemouse-docker/docker-compose.dev.yml up -d
cp packages/pipemouse-server/.env.example .env   # fill in secrets
yarn start
```

To publish it as the repo:

```bash
gh repo create hokopal/pipemouse --public --source . --push   # run on your machine
# or push to an existing empty repo:
git remote add origin git@github.com:hokopal/pipemouse.git && git push -u origin main
```

## What the script does

1. Downloads the **pinned upstream snapshot** (`403bbfc…`, `main` @ 2026-11-27)
   from `codeload.github.com` — no git history needed, deterministic.
2. Deletes upstream-only packages: marketing website, docs site, desktop
   companion app, crowd-translation configs (~170 MB, none of it product).
3. Renames every file/dir containing the upstream brand (`twenty*` →
   `pipemouse*`), deepest-first.
4. Rewrites text files with case-aware rules (`Twenty`→`Pipemouse`,
   `TWENTY`→`PIPEMPOUSE`, `twenty`→`pipemouse`, `twentyhq/twenty`→
   `--repo-slug`, `twenty.com`→`pipemouse.com`, `twentycrm`→`pipemouse`).
5. **Preserves attribution**: `LICENSE`, `NOTICE`-class files and every line
   mentioning copyright / `@license Enterprise` are left byte-identical.
6. Cleans the root `package.json` (drops `docs:*` scripts and the workspaces
   of the deleted packages; `license: AGPL-3.0` is kept — do not change it).
7. Overwrites brand assets (logos, marks, favicons, og-images under app
   `public/` dirs) with `assets/` artwork; third-party assets (e.g. example
   app icons) are not touched.
8. Writes `NOTICE.md`, `TRADEMARK.md`, `README.md` and
   `PIPEMPOUSE_ABSORB_NOTES.md` (deletions, every overwritten asset, audit of
   any surviving upstream-brand tokens, manual review checklist), plus a
   minimal `.github/workflows/ci.yml` (install + typecheck + lint + build) so
   the absorb proves itself on first push there.
9. Audits: JSON-parses every `package.json`; fails loudly (exit 2) if any
   are invalid.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--out <dir>` | required | Output directory; must be empty (or `--force`) |
| `--repo-slug <o/n>` | `hokopal/pipemouse` | Slug written into manifests/URLs |
| `--ref <sha\|tag>` | pinned commit | Pin a different upstream ref deliberately |
| `--git` | off | `git init -b main` + initial commit |
| `--force` | off | Allow non-empty `--out` |

Environment: `PIPEMPOUSE_TARBALL=/path/to/snapshot.tar.gz` skips the network
download and absorbs from a local tarball (signed offline box, slow network,
reproducible air-gapped builds).

## The legal floor (even with "ignore licensing")

"Ignore licensing" is workable here because the upstream license already
permits commercial redistribution with obligations — not because obligations
vanish. The obligations, kept simple:

1. **Keep `LICENSE` and `NOTICE.md`**, and never strip per-file copyright or
   `@license Enterprise` headers — the script never does.
2. **Offer the source of your modified version to your hosted users**
   (AGPL-3.0 §13). Keeping the GitHub repo public + a "Source code" link in
   the app footer satisfies this.
3. **Trademarks are not licensed.** The upstream name/logo may not be used and
   aren't — the output is Pipemouse-branded throughout. Attribution in
   `NOTICE.md` is required; it is not product branding.
4. **`@license Enterprise` files are commercial material** (~921 files at pin
   time). They remain in the tree but must not power your hosted offering
   without a commercial license — exclude them from builds/deploys.
5. `CAL`-style note for the ecosystem: bringing in additional GPL/AGPL
   components keeps their obligations too. MIT/Apache deps are unaffected.

If any of that is unacceptable for your distribution model, the fallback is to
run upstream **unmodified** behind SSO alongside Pipemouse rooms (Path C from
the strategy discussion) — no source offer triggered, but also not rebranded.

## Known manual follow-ups (all listed in PIPEMPOUSE_ABSORB_NOTES.md)

- Replace generated PNG mark with final artwork; author a real `.ico`
  (script can't).
- Example apps under `pipemouse-apps/` (e.g. call-recorder) may depict the
  upstream UI in preview frames — review before featuring them.
- Verify `engines.node` against your toolchain (upstream pins a very new Node).
- Root `LICENSE` must stay AGPL-3.0; relicensing it would be
  misrepresentation, not compliance.

## Why a script and not a vendored tree

The white-labeled tree is ~41k files / ~360 MB. It does not belong in this
product repository — not through the session snapshot (which would not persist
it), not as a committed artifact, and not as ~200 MB of someone else's source
in your room/MAP product's PR. This branch therefore carries the **recipe**,
not the **cake**: the absorb pipeline, the pinned ref, the brand assets and
the attribution files. The product itself lands in its own repository:

```bash
node scripts/gtm-os/white-label.mjs --out ../pipemouse --git
cd ../pipemouse && gh repo create hokopal/pipemouse --public --source . --push
```

(The Arena GitHub integration cannot create repos — `403 Resource not
accessible by integration` — so the first repo-create is yours, one command.
After it exists, this token can generate and push the tree into it.)
