# Baked Design reconstruction

Faithful reconstruction of the public homepage at https://baked.design/, with its original scroll-controlled immersive gallery, pointer perspective, pause control, and responsive selected-work section.

## Preview

Run `python3 -m http.server 4173 --directory dist` and open http://localhost:4173.

## Structure

- `dist/index.html`: homepage, inline styles, gallery configuration and content.
- `dist/_astro/World.astro_astro_type_script_index_0_lang.C46ZrB17.js`: scroll progress, pointer movement, gallery transitions and pause behavior.
- `dist/_astro/wall-model.WRL-ahOX.js`: gallery rendering.

Original public assets and animation modules are retained to reproduce the requested effect precisely. Images, videos and fonts load from baked.design. Other pages and booking links lead to their original destinations. Analytics entrypoints have been removed. This is a private reconstruction, not an official Baked Design website.

Verified in browser: initial gallery rendering, scroll-driven opening, revealed introduction, and pause/play state.
