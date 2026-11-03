# APPICS project handover for coding agents

Read `README.md`, `docs/DEVELOPMENT.md`, and `docs/CMS.md` before changing this project.

## Structure and source of truth

- This repository contains the landing page, Journal, and custom browser CMS together.
- `dist/` is tracked and contains editable site code. There is no full Astro source rebuild pipeline here.
- Edit Journal templates in `lib/journal-views.js`, not generated Journal HTML.
- `npm run build` regenerates starter Journal pages and the landing-page `#workshops` section. Preserve intentional changes by editing the generator when appropriate.
- Live CMS content, uploaded images and newsletter addresses live in private Vercel Blob storage, not Git. Do not treat starter JSON as a production database backup.

## Preserve the product

- English UI/copy, APPICS branding, dark purple `#0d061c`, mint `#88e0e1`, Inter typography and soft motion.
- Keep Journal dock links Journal / logo / Website. Keep the logo.
- Respect reduced-motion preferences and pause expensive effects offscreen.
- Keep horizontal carousels usable without trapping vertical scrolling.
- AI prompt functionality is currently a front-end preview, not a connected generator.
- Newsletter registration currently stores addresses only; do not claim email delivery is implemented.
- The CMS controls Journal articles, not all landing-page content.

## Work and verification

1. Inspect the working tree and applicable source before editing; preserve unrelated changes.
2. Run `npm test` for relevant logic changes and `npm run build` after changing Journal templates or starter content.
3. Use `npm run dev` for a full-stack preview (default 4180; `PORT=4173` optional). Restart after changing server modules.
4. Verify affected desktop/mobile layouts. For small style-only changes, do not add tests that merely repeat CSS values.
5. Commit and push completed work to the existing GitHub repository so collaborators have the latest code. Do not force-push shared history.
6. Deployment is separate from Git push. Use the existing Vercel project when deployment is authorized; do not create a replacement project or assume deploy-on-push is configured.

## Access and data

- This repository is public. Never commit `.env*`, `.editor-access.txt`, tokens, raw passwords, subscriber data or private storage backups.
- Ask the owner for project access or credentials through a private channel when needed; never copy them into documentation or tool output.
- Do not run `scripts/configure-editor.js` as a routine setup command: it is an owner-machine-specific one-off helper.
- Avoid live mutation tests with production storage. The optional integration test publishes temporary test data before cleanup; use a dedicated development store.
- A saved preview of an already published article also saves its changes publicly. Explain this when supporting editors.
