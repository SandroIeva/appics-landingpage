# Appics LandingPage

Landingpage concept combining the Baked Design spatial scroll gallery with APPICS imagery, turquoise brand colors, and German social/creator copy.

## Open locally

Run `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist` and open http://127.0.0.1:4173. No login is required.

## Edit

- `dist/index.html`: complete page markup, text, gallery image configuration (`worldData`).
- `dist/appics.css`: custom styles, colors, responsive layouts.
- `dist/assets/appics/`: locally stored APPICS images and logo.
- `dist/_astro/World.astro_astro_type_script_index_0_lang.C46ZrB17.js`: retained Baked header animation, scroll progress and perspective.
- `content.html`: editorial markup snapshot; edit `dist/index.html` for the running page.

## Sources and scope

Public visuals and app information: https://appics.app/ . Original spatial header code: https://baked.design/ . This is a design concept; Creation Lab is proposed positioning, not an implemented content editor. App download links lead to the official app stores. Community, APX, and legal links lead to APPICS. No analytics or credential flows are integrated.

The original Baked reconstruction remains recoverable in Git commit 79326eadd86d34b1e808bf124e3502abb8fc29d5.

## DFM mix (local preview)

The opening APPICS spatial gallery is retained. A new centre navigation moves to a fixed bottom dock with scrolling. The lower page follows the black, oversized editorial direction of https://www.dfm.mt/ with a pointer-following feathered image mask, staggered movement gallery and local video.

- `dist/dfm.css`: DFM-inspired layout and navigation styling.
- `dist/appics.js`: menu docking, soft spotlight tracking, video controls and gallery pause visibility.
- `dist/assets/dfm/`: public DFM reference visuals and motion film, attributed in the page.
- `before-dfm.html`: snapshot of the previous APPICS layout.

This revision is local-only, as requested after the hosted preview login issue. Browser-verified: centred menu at scroll zero; menu fixed 18px from the bottom after scrolling; section navigation; pointer mask coordinates change; local video plays/pauses; no image errors or horizontal overflow in the mobile view.

## Softer motion + Lenis

Lenis 1.3.27 is pinned and vendored in `dist/vendor/lenis/`, with its MIT license. `dist/smooth-scroll.js` initializes a single page scroll interpolator (lerp 0.065, wheel multiplier 0.9), uses native touch inertia, handles anchors, and respects reduced-motion preferences.

Header adjustments retain the original Baked geometry: 1.22 viewport heights for the opening instead of 0.9, 150ms global follow instead of 100ms, 65–120ms staggered per-card easing, 220ms pointer follow, 200ms hover settling, and a slightly calmer ambient drift. The sticky hero now spans 260svh. The original module is backed up in `backups/world-before-smoothing.js`.

## Cosmos-inspired category section

`#categories` is directly after the spatial hero. Layout inspired by the “Build your world, your way” section at https://www.cosmos.so/ with original local CSS category illustrations, a horizontal card carousel, working Creative/Lifestyle filters and color swatches. Files: `dist/categories.css`, `dist/categories.js`; live markup is in `dist/index.html`, with an editorial snapshot in `categories.html`.

Verified locally: next arrow advances the carousel, Lifestyle shows three matching cards, All restores all six, swatches update the art color and code, no horizontal page overflow.

## Configured AI Sphere and prompt preview

Below “Discover the Power of Creation”, the centre sphere embeds `dist/ai-sphere.html`, copied unchanged from the user's supplied Liquid Orb HTML export. Shader source, uniforms, palettes and initial `thinking` configuration are retained exactly. The export requires WebGPU, as in the source snippet.

`dist/creation-lab.css` controls the surrounding layout. `dist/creation-lab.js` handles suggested prompts and a local creative-brief preview. No AI service is called or credentials used. Browser verified: sphere renders without logged errors, suggestions populate the field, submit previews the entered prompt, and the mobile page has no horizontal overflow.

## APPICS Journal

- Public journal: https://appics-landingpage.vercel.app/journal/
- Protected editor: https://appics-landingpage.vercel.app/journal/editor/
- Local full-stack preview: `npm run dev` (port 4180).
- Existing static preview on port 4173 also serves the generated starter article pages.
- `content/journal-seed.json`: six editable starter stories, written for this concept using the supplied imagery.
- `lib/journal-views.js`: server-rendered magazine and article layouts.
- `api/journal.js`: protected editor sessions, private drafts, image uploads, publication, and revision checks.
- `dist/journal/`: journal styles, search/filter controls, and editor interface.
- `npm test`: validation, escaping, and session tests.
- `node tests/journal.integration.js`: creates a disposable draft, tests upload/privacy/publication, and removes its data.
- `npm run build`: generates static fallbacks and updates the homepage journal links.

Articles and uploaded images live in the private Vercel Blob store `appics-journal`. Public readers receive only published articles. Moving an article back to drafts removes it from public listings and article URLs. Existing article versions are retained privately on every save. Edits use revision checks to prevent overwriting another session's changes.

The editor supports title, introduction, category, author, cover image, image description, article text, feature placement, ordering, preview, save, publish, and unpublish. Uploads are resized to at most 1600 px and converted to WebP in the browser. Article text uses paragraphs, `##` headings, and `>` quotes; raw HTML is escaped.

Editor access details are in `.editor-access.txt` (local only). `.env.local` contains local server secrets. Both are excluded from Git and Vercel uploads. Production stores a salted password hash and a separate session signing secret. Sessions use an eight-hour HttpOnly, SameSite cookie (Secure in production). Mutation requests require the editor's same origin.

Deploy updates with `vercel deploy --prod`. No article republish or site redeploy is needed when saving through the browser editor.

The journal uses bounded sticky sidebars alongside full-width article cards, subtle image parallax on desktop, and a near-black In Conversation carousel between article groups. Articles in the Interviews category populate this series; until interview articles are published, it shows existing creative-perspective stories. Mobile uses native page scrolling and a three-item AI / logo / Mobile App dock. The mobile landing-page gallery uses 198px cards, 20px vertical gaps, and a narrower front-facing arc.

Journal entry and viewport reveals are in `dist/journal/reveal.js`: cover-first entry, staggered typography and sidebar, then one-time reveals for article cards, conversations, and reading content. IntersectionObserver triggers Web Animations with a slow ease-out; completed animations release their inline effects, and reduced-motion preferences bypass the reveals.

## GitHub source

Website and Journal are maintained together in the public `SandroIeva/appics-landingpage` repository. Commit and push completed changes to keep GitHub current. Runtime-ready images are included in `dist/`; original image sources in `APPICS/` and local access credentials are excluded. Articles edited in the browser and newsletter signups remain in private Vercel Blob storage, outside Git.
