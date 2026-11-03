# Development and operations

## Architecture

The landing page is editable HTML/CSS/JavaScript under `dist/`. It retains existing bundled Astro/Three.js modules for the spatial hero, but this repository does not include an Astro source project or an Astro rebuild pipeline. Avoid replacing the bundle with a framework scaffold just to change content.

The Journal is server-rendered by `api/journal.js` using `lib/journal-views.js`. Vercel rewrites `/journal/` and `/journal/story/:slug/` to this Node function. The editor itself is static UI under `dist/journal/editor/`, calling the same API.

`npm run build` creates starter-only static Journal fallbacks and updates the landing page's Latest Updates markup. `dist/journal/home-journal.js` loads published posts from the API for the landing-page teaser area. CMS content is read at runtime, not baked into a code deployment.

## Local setup

Requirements: Node.js 22+ recommended, npm, and Vercel CLI for production operations. Run commands from the repository root.

```sh
npm ci
npm run build
npm run dev
```

The default address is http://127.0.0.1:4180/. To match the owner's preview port, use `PORT=4173 npm run dev`. Open `/journal/` or `/journal/editor/` on the same origin.

The dev server loads `.env.local` if available. Restart it after changing server modules (`api/` or `lib/`) or environment variables. Static CSS/JS changes only need a browser reload; update asset query versions in the template if a deployed browser keeps cached files.

Do not use `python -m http.server` to test CMS behavior. Static hosting cannot execute the API, sessions, uploads or publication routes.

## Environment and access

For the existing production site, ask the owner to grant access to the Vercel project **appics-landingpage** and its private Blob store **appics-journal**. GitHub access does not grant either of these permissions.

After obtaining access, link the checkout to the existing project and pull the development environment:

```sh
vercel login
vercel link
vercel env pull .env.local
```

Select the existing project rather than creating a replacement. Do not commit `.vercel/`, `.env.local`, or the editor password. Share the editor password separately through a private channel.

| Variable | Purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Read/write token for the private Vercel Blob store |
| `JOURNAL_PASSWORD_HASH` | Shared password encoded as `salt:scryptHex`; scrypt derives 32 bytes from the password and salt |
| `JOURNAL_SESSION_SECRET` | Independent random secret used to sign editor sessions |
| `PORT` | Optional local server port; defaults to 4180 |
| `JOURNAL_TEST_URL` | Optional integration-test target; defaults to http://127.0.0.1:4180 |

Set the first three in the Vercel environments used by the deployment. A new independent installation needs its own private Blob store and independently generated credentials. The password hash is not the password; do not put the raw password into `JOURNAL_PASSWORD_HASH`.

`scripts/configure-editor.js` is a one-off owner-machine setup helper with an absolute local Vercel CLI path. It is **not a portable onboarding command** and should not be run against an existing installation to reset credentials. For credential rotation, the owner should generate a fresh salted hash/session secret, update the intended environments, redeploy, and communicate the new password privately. Rotating the session secret invalidates current sessions.

A development token pointed at the production Blob store writes production data. Use a separate store/environment for development and automated mutation tests whenever possible. Preview deployments should not be assumed isolated unless their storage token is different.

## Editing map

| Change | Edit |
| --- | --- |
| Landing text or section markup | `dist/index.html` |
| Landing typography | `dist/typography.css`, plus section-specific styles loaded by the page |
| Navigation docking | `dist/appics.js` and navigation styles |
| Hero image wall | `worldData` in `dist/index.html`, `dist/_astro/World.creators.js`, `creator-image-map.json` |
| Hero tint/mask/edge effects | `dist/hero-image-reveal.js`, `dist/hero-edge-shade.js`, related styles |
| Liquid backgrounds | `dist/hero-liquid.js` |
| AI sphere / reveal | `dist/ai-sphere.html`, `dist/sphere-reveal.js`, `dist/creation-lab.css` |
| Prompt preview | `dist/creation-lab.js` (front-end only) |
| Category card carousel | `dist/categories.js`, `dist/categories.css` |
| Creative Space / collective | `dist/studio-scenes.js`, `dist/collective*.js`, section CSS |
| Journal markup, navigation, newsletter | `lib/journal-views.js` |
| Journal styles and search | `dist/journal/journal.css`, `dist/journal/journal.js` |
| Journal motion | `dist/journal/reveal.js` |
| CMS interface | `dist/journal/editor/index.html`, `editor.js`, `editor.css` |
| Article categories/validation/session logic | `lib/journal.js`; keep editor options and Journal filters in sync |
| Backend/storage logic | `api/journal.js` |
| Starter articles | `content/journal-seed.json` |

Do not hand-edit generated `dist/journal/index.html` or `dist/journal/story/*/index.html`; the next build replaces them. The build also regenerates the `#workshops` Latest Updates section in `dist/index.html`: change that section through `scripts/build-journal.js` if the change must survive builds.

CSS contains accumulated overrides. Inspect the winning declaration and all loaded styles before appending another rule. Preserve the final intended behavior when consolidating.

## API overview

All actions use `/api/journal?action=<action>`. POST requests require a matching Origin header. JSON request bodies are used by the editor. See the implementation for exact field validation and responses.

| Action | Method | Access / role |
| --- | --- | --- |
| `session` | GET | Session/configuration status |
| `login`, `logout` | POST | Start/end shared-password editor session |
| `list` | GET | Published posts; `admin=1` requires editor authentication |
| `save` | POST | Authenticated article write; include current revision when updating |
| `upload` | POST | Authenticated base64 image upload |
| `media&id=…` | GET | Authenticated editor, or image referenced by a published post |
| `index`, `article&slug=…` | GET | Public server-rendered Journal pages |
| `preview&slug=…` | GET | Authenticated draft/article preview |
| `subscribe` | POST | Public same-origin newsletter registration |

Sessions use an HMAC-signed eight-hour cookie, HttpOnly, SameSite=Strict, and Secure in production. Password validation uses salted scrypt and constant-time comparison. Article text is escaped. Save conflicts return 409. Login and signup rate limits are in-memory per function instance, not a durable/global abuse-prevention service.

## Content and storage backups

Seed content and stored CMS articles merge by ID. The private storage paths are documented in the [CMS guide](CMS.md#where-content-is-saved). Publishing/unpublishing is a data operation; a Git rollback or Vercel code rollback does not revert CMS records.

Before migrations or bulk content changes, take a private backup of article JSON, version history and media through authorized Vercel Blob tooling. Preserve media references and IDs. Store backups outside this public repository. There is no scheduled backup/export job or one-click history restore in the current application.

Newsletter registrations include email, signup time, source and signup evidence. They are private runtime data, not Git assets. No newsletter provider is connected and no emails are sent.

## Checks

```sh
npm test
npm run build
```

Unit tests cover sessions, password checks, article validation/escaping, publication filtering and the interview carousel template. For UI changes, also inspect desktop and mobile layouts and reduced-motion behavior.

The optional integration test performs real storage mutations: it creates an article, uploads a cover, publishes/unpublishes it, checks conflicts/privacy, then cleans up its own test records. It expects a running server, `.env.local`, and a local `.editor-access.txt` containing a `Password: …` line. These files are not in Git.

```sh
# Use a dedicated development store and a matching local editor password.
JOURNAL_TEST_URL=http://127.0.0.1:4180 node tests/journal.integration.js
```

Inspect this test before using it against a custom environment; it assumes the first available article has a bundled local WebP cover. It is not a read-only production smoke test.

## Deployment

The existing production site uses Vercel project `appics-landingpage`.

1. Pull current Git changes and install matching dependencies with `npm ci`.
2. Make the source change and review the diff, including generated files.
3. Run appropriate tests and `npm run build`.
4. Check desktop/mobile behavior and CMS publication if backend code changed.
5. Commit and push to GitHub. Never include local secrets or private storage exports.
6. From a checkout linked to the existing Vercel project, run:

```sh
vercel deploy --prod
```

7. Wait for Ready, then check the main site, Journal, an article and editor login page on the production domain.

Vercel installs with `npm ci --ignore-scripts`, runs `node scripts/build-journal.js`, serves `dist/`, and deploys `api/journal.js` as a Node function. Keep the routing in `vercel.json`; replacing it with a static-only deployment breaks CMS-backed article pages.

GitHub and Vercel are separate: automatic deploy-on-push has not been established by this handover. If you configure Git integration, document the production branch and preview environment behavior. Normal CMS edits require neither a Git push nor deployment.

## Motion and performance constraints

- Keep liquid render loops paused outside the viewport and when the tab is hidden.
- Keep reduced-motion support and avoid scroll trapping.
- Preserve native vertical scrolling through horizontal carousels.
- Hero images use optimized WebP assets at approximately 900 px; do not replace them with oversized originals without recompressing.
- Sphere rendering requires browser WebGPU support; the prompt UI does not provide AI inference.
- Keep Journal navigation distinct from the landing-page navigation. The Journal dock is Journal / APPICS logo / Website.
