Pipemouse GTM OS
================

This project is a white-labeled distribution of an open-source CRM, modified
and rebranded for the Pipemouse GTM OS (go-to-market operating system).

- Upstream project: https://github.com/twentyhq/twenty
- Pinned upstream commit: 403bbfc1873288a985bc5ee9b443d1716fc3e2dd
- Upstream license: GNU Affero General Public License v3.0 — see LICENSE
- Upstream copyright: Copyright (c) 2023-present Twenty Inc. and contributors

Modifications made by Pipemouse:

- Product, packages, workspace layout and all user-facing branding renamed to
  Pipemouse ("twenty*" -> "pipemouse*").
- Upstream marketing website and docs site removed (packages/website,
  packages/docs equivalents).
- Upstream desktop companion app removed.
- Upstream translation/crowd-sourcing configs removed.
- Brand assets (logos, marks, icons) replaced with Pipemouse artwork.
- Root manifests cleaned of references to the removed packages.

See PIPEMPOUSE_ABSORB_NOTES.md for the generated inventory of every deletion,
asset overwrite and automated rewrite applied, plus the manual review checklist.

Licensing notes
---------------

- The AGPL v3.0 applies to the covered portions. Pipemouse offers the
  corresponding source code of modified versions of the AGPL-covered parts to
  users of its hosted service (this repository / a public mirror). Do not
  remove LICENSE, NOTICE or the copyright headers inside source files.
- Files marked `/* @license Enterprise */` are commercial material, not open
  source. They are excluded from Pipemouse builds and from any hosted offering.
- Upstream trademarks (including the "Twenty" name and logos) are NOT licensed
  under AGPL-3.0 and are not used. See TRADEMARK.md.
- Third-party packages under licenses listed in their package manifests remain
  under their own licenses.
