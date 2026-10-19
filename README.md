# RADS — A life in movement

Static, responsive homepage inspired by Obsidian Assembly's editorial composition and motion, adapted to RADS by Nrityaritika.

## Preview

Run `python -m http.server 8770 --bind 127.0.0.1 --directory dist` from this directory, then open http://127.0.0.1:8770/.

## Files

- `dist/index.html`: homepage copy, media slots, menus and native dialogs.
- `dist/styles.css`: base styles, hero and intro.
- `dist/sections.css`: galleries, editorial sections, dialogs and responsive layouts.
- `dist/app.js`: scroll motion, discipline selection, menu, class finder and media dialogs.

- `dist/motion.css` / `dist/motion.js`: motion layer modelled on Obsidian Assembly. Per-character heading reveals, line-by-line paragraph reveals, lerped scroll progress (`--progress`, `--enter`) driving hero parallax, rotating ornaments and rounded dark-section entrances, a mosaic-to-fullscreen "Find your rhythm" scroll scene (centre tile expands, then each discipline wipes in; stacked fallback on phones), scroll-speed marquee, magnetic buttons, hero spotlight, letter-roll hovers and a staggered menu. Scoped to `html.js-split`, which is only set when reduced motion is off, so removing that class restores the static page.

No build step or JavaScript dependencies. Display fonts load from Google Fonts with local serif/sans-serif fallbacks.

## Media placeholders

All image and video areas are intentional placeholders, labelled visibly and identified by a `data-media` attribute:

| Slot | Suggested asset |
| --- | --- |
| hero-video | Muted opening film, desktop and mobile crops |
| classical-image / expression-image | Portrait-oriented dance photographs |
| discipline-classical / discipline-fusion / discipline-contemporary | 4:5 images or short clips |
| learn-image / perform-image / move-image | Class, performance, and movement photos |
| ritika-portrait | Founder portrait, 3:4 |
| community-class / community-performance / community-story | Class, performance, student-story media |

Insert `<img>` or `<video>` within the corresponding slot, keep its reserved dimensions, use `object-fit: cover`, add accurate alternative text, and remove the visible placeholder labels once media is provided. Media previews currently open a labelled placeholder dialog, not a simulated player.

## Booking

The class finder is a Netlify form (`class-enquiry`): it collects name, email, optional phone and message plus the chosen goal and style, and posts to Netlify Forms. Enquiries appear in the Netlify dashboard under Forms.

## Accessibility and motion

Native dialogs support Escape, focus containment and focus restoration. Galleries support named buttons and left/right keyboard selection. Motion is bounded and scroll-driven, with static reduced-motion alternatives. Media is not autoplayed. The layout reflows for mobile.
