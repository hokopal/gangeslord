# Pipemouse — the GTM OS

**Pipemouse** is the go-to-market operating system: CRM, AI agents, workflows,
and buyer rooms in one self-hostable product. It ships from open source and is
white-labeled for Pipemouse.

- Website: https://www.pipemouse.com
- Pipemouse OS: https://space.pipemouse.com
- Rooms: https://rooms.pipemouse.com

## What's in the box

- **CRM core** — deals, companies, contacts, pipelines, custom objects and
  views defined as code
- **Workflows & AI agents** — automate follow-ups, enrichment and handoffs
- **Rooms** — open the buyer-facing Rooms app inside the OS workspace for
  mutual action plans, decks and engagement analytics. Set
  `REACT_APP_ROOMS_BASE_URL` when Rooms runs on a different origin.
- **GraphQL / REST APIs, webhooks, SDK, CLI** — build on the platform,
  Pipemouse-style

## Quick start

Prerequisites: Node.js (see `engines` in `package.json`), Yarn 4 (via corepack),
Docker (for Postgres/Redis).

```bash
corepack enable
yarn install
cp packages/pipemouse-server/.env.example .env   # fill in secrets
docker compose -f packages/pipemouse-docker/docker-compose.dev.yml up -d
yarn start
```

Then open http://localhost:3000.

Build your own app on top of the platform:

```bash
npx create-pipemouse-app my-app
cd my-app && yarn install
pipemouse auth login --url https://your-workspace.example.com
pipemouse app publish --private
```

## License

Pipemouse GTM OS is distributed under the **GNU AGPL-3.0** (see `LICENSE`).
The corresponding source for hosted instances is kept available in this
repository. Attribution for upstream open source is in `NOTICE`; trademark
policy is in `TRADEMARK.md`.

Parts of the upstream codebase are marked `@license Enterprise` and are NOT
open source; they are excluded from Pipemouse builds.

## Attribution

Pipemouse GTM OS is based on an open-source CRM project originally released by
its authors under AGPL-3.0. All copyright headers in source files are retained.
"Twenty" and its logo are trademarks of their respective owner and are not used
here.
