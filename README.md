# APPICS — Landing Page & Journal

The APPICS marketing website and Journal live in this repository together with a small, password-protected browser CMS. The interface and editorial copy are in English. The visual language uses a dark purple background, mint accents, Inter typography, rounded controls, and soft scroll animations.

## Live links

| Area | URL |
| --- | --- |
| Website | https://appics-landingpage.vercel.app/ |
| Journal | https://appics-landingpage.vercel.app/journal/ |
| CMS / editor | https://appics-landingpage.vercel.app/journal/editor/ |
| Source | https://github.com/SandroIeva/appics-landingpage |

The repository is public. The editor password, environment variables, article drafts, and newsletter addresses are **not** stored in GitHub. Ask the project owner for editor access and, if needed, Vercel project access through a private channel.

## Start here

- **Publishing articles:** [CMS guide](docs/CMS.md)
- **Developing or deploying the site:** [Development and operations](docs/DEVELOPMENT.md)
- **Working with a coding agent:** [Agent handover](AGENTS.md)

## Run locally

Use a current Node.js LTS release with `process.loadEnvFile` support (Node 22+ recommended).

```sh
git clone https://github.com/SandroIeva/appics-landingpage.git
cd appics-landingpage
npm ci
npm run build
npm run dev
```

Open http://127.0.0.1:4180/ or http://127.0.0.1:4180/journal/. To use port 4173 instead:

```sh
PORT=4173 npm run dev
```

Without environment variables, the public pages render the starter articles; CMS login, saving, uploads, and newsletter registration need the configuration described in [Development and operations](docs/DEVELOPMENT.md). A plain static file server cannot run the CMS API.

## What is implemented?

| Area | Included |
| --- | --- |
| Landing page | Spatial hero image wall, soft scrolling, liquid effects, creator cards, AI sphere, Creation Lab sections, categories, product teasers, latest Journal entries |
| Journal | Editorial overview, category filters, search, sticky sidebars, interview carousel, article pages, viewport reveals |
| CMS | Shared password login, article drafts, image upload, preview, publication/unpublication, featured stories, order, revision conflict checks |
| Newsletter | Signup form and private storage of registrations; **no email delivery, double opt-in, unsubscribe workflow, or subscriber management screen yet** |
| AI prompt | Front-end creative-brief preview; **no AI generation API is connected** |

The CMS edits **Journal articles**, not the landing-page layout or all website copy. Those are maintained in source files.

## Source of truth

- **GitHub:** application code, styles, bundled images, starter articles, documentation.
- **Private Vercel Blob storage:** CMS article overrides/new articles, uploaded covers, saved article versions, newsletter registrations.
- **Vercel environment settings:** storage token, password hash, session signing secret.

Saving a published article in the CMS updates the live Journal without a code push or redeployment. Pushing this repository does not back up the live CMS database. Keep code and storage backups separately.

## Main files

| Path | Purpose |
| --- | --- |
| `dist/index.html` | Landing-page markup, text, hero configuration |
| `dist/typography.css`, `dist/appics.css`, other section CSS | Landing-page styling; later overrides matter |
| `dist/appics.js`, `dist/hero-*.js`, `dist/categories.js` | Landing interactions and effects |
| `dist/ai-sphere.html` | Embedded WebGPU sphere |
| `lib/journal-views.js` | Shared Journal shell, overview, articles, newsletter markup |
| `lib/journal.js` | Article validation, starter content, session helpers |
| `api/journal.js` | CMS, article rendering, media and newsletter API |
| `dist/journal/` | Journal styles, interactions, reveal animation and editor UI |
| `content/journal-seed.json` | Starter content used when no stored override exists |
| `scripts/build-journal.js` | Generated Journal fallbacks and landing-page latest-story section |
| `scripts/dev-server.js` | Local full-stack server |
| `vercel.json` | Build, function and Journal routing configuration |

`dist/` is intentionally tracked: it contains editable application files as well as generated fallbacks. This is not a conventional framework source/build split. Read the development guide before editing generated pages.

## Checks and deployment

```sh
npm test
npm run build
```

Deploy to the existing Vercel project with `vercel deploy --prod` after linking your checkout and obtaining project access. GitHub pushes alone should not be assumed to deploy the site: verify whether Git integration has been configured. See the [deployment checklist](docs/DEVELOPMENT.md#deployment).

## Assets and origins

Runtime assets are bundled under `dist/assets/`; additional supplied image sources are in `images/`. The large local originals folder `APPICS/` is excluded. The design evolved from references including Baked, DFM, Cosmos, Preymaker, and i-D. Existing reference-derived code/assets are not a blanket license grant; review their provenance and usage rights before reuse in another project. Lenis is vendored with its MIT license under `dist/vendor/lenis/`.
